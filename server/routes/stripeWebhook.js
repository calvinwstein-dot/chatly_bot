import express from "express";
import Stripe from "stripe";
import fs from "fs";
import path from "path";

const router = express.Router();

// Initialize Stripe with your secret key (only if key exists)
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const SUBSCRIPTIONS_FILE = path.resolve("server/subscriptions.json");
const SETUP_FEES_FILE = path.resolve("server/data/setupFees.json");

function loadSubscriptions() {
  try {
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
      // Create file if it doesn't exist
      fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify({ subscriptions: [] }, null, 2));
    }
    const data = fs.readFileSync(SUBSCRIPTIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading subscriptions:", error);
    return { subscriptions: [] };
  }
}

function loadSetupFees() {
  try {
    if (!fs.existsSync(SETUP_FEES_FILE)) {
      const dir = path.dirname(SETUP_FEES_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(SETUP_FEES_FILE, JSON.stringify({ payments: [] }, null, 2));
    }
    const data = fs.readFileSync(SETUP_FEES_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading setup fees:", error);
    return { payments: [] };
  }
}

function saveSetupFees(data) {
  fs.writeFileSync(SETUP_FEES_FILE, JSON.stringify(data, null, 2));
}

function addSetupFeePayment(businessName, customerEmail, customerId, amount, paymentIntentId) {
  const data = loadSetupFees();
  
  data.payments.push({
    businessName,
    customerEmail,
    customerId,
    amount,
    paymentIntentId,
    paidAt: new Date().toISOString(),
    profileCreated: false
  });
  
  saveSetupFees(data);
}

function saveSubscriptions(data) {
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2));
}

function addSubscription(businessName, customerId, subscriptionId, plan) {
  const data = loadSubscriptions();
  
  // Remove any existing subscription for this business
  data.subscriptions = data.subscriptions.filter(sub => sub.businessName !== businessName);
  
  // Add new subscription
  data.subscriptions.push({
    businessName,
    customerId,
    subscriptionId,
    plan, // 'monthly' or 'yearly'
    status: 'active',
    activatedAt: new Date().toISOString()
  });
  
  saveSubscriptions(data);
}

function updateSubscriptionStatus(subscriptionId, status) {
  const data = loadSubscriptions();
  const subscription = data.subscriptions.find(sub => sub.subscriptionId === subscriptionId);
  
  if (subscription) {
    subscription.status = status;
    subscription.updatedAt = new Date().toISOString();
    saveSubscriptions(data);
  }
}

// Webhook endpoint - MUST use raw body for signature verification
router.post("/", express.raw({ type: 'application/json' }), async (req, res) => {
  // Check if Stripe is configured
  if (!stripe || !webhookSecret) {
    console.error('Stripe not configured - webhook disabled');
    return res.status(503).json({ error: 'Stripe webhook not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Stripe webhook event:', event.type);

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      
      // Check if this is a one-time payment (setup fee) or subscription
      if (session.mode === 'payment') {
        // This is a one-time setup fee payment
        const businessName = session.metadata?.businessName;
        const customerEmail = session.customer_details?.email || session.customer_email;
        const amount = session.amount_total / 100; // Convert from cents to dollars
        
        if (businessName) {
          addSetupFeePayment(businessName, customerEmail, session.customer, amount, session.payment_intent);
          console.log(`✓ Setup fee paid: $${amount} for ${businessName} (${customerEmail})`);
        } else {
          console.warn('⚠️ No businessName in payment metadata');
        }
      }
      // Get subscription ID if it's a subscription
      else if (session.subscription) {
        try {
          // Retrieve the full subscription object to get metadata from payment link
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          
          // Get businessName from subscription metadata (set on payment link)
          const businessName = subscription.metadata?.businessName;
          const plan = subscription.items.data[0]?.price?.recurring?.interval || 'monthly';
          
          if (businessName) {
            addSubscription(businessName, session.customer, session.subscription, plan);
            console.log(`✓ Activated subscription for ${businessName} (${plan} plan)`);
          } else {
            console.warn('⚠️ No businessName in subscription metadata - check payment link metadata');
          }
        } catch (error) {
          console.error('Error retrieving subscription:', error);
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const businessName = subscription.metadata?.businessName;
      
      updateSubscriptionStatus(subscription.id, subscription.status);
      
      if (businessName) {
        console.log(`✓ Subscription ${subscription.id} for ${businessName} updated to ${subscription.status}`);
      } else {
        console.log(`Subscription ${subscription.id} updated to ${subscription.status}`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const businessName = subscription.metadata?.businessName;
      
      updateSubscriptionStatus(subscription.id, 'canceled');
      
      if (businessName) {
        console.log(`✓ Subscription for ${businessName} canceled`);
      } else {
        console.log(`Subscription ${subscription.id} canceled`);
      }
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

export default router;
