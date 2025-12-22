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
ro// Check if Stripe is configured
  if (!stripe || !webhookSecret) {
    console.error('Stripe not configured - webhook disabled');
    return res.status(503).json({ error: 'Stripe webhook not configured' });
  }

  uter.post("/", express.raw({ type: 'application/json' }), async (req, res) => {
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
      
      // Get metadata from the payment link (you'll need to set this in Stripe)
      const businessName = session.metadata?.businessName || 'Unknown';
      const plan = session.metadata?.plan || 'monthly';
      
      console.log(`Payment successful for ${businessName} - ${plan} plan`);
      
      // Get subscription ID if it's a subscription
      if (session.subscription) {
        addSubscription(businessName, session.customer, session.subscription, plan);
        console.log(`Activated subscription for ${businessName}`);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      updateSubscriptionStatus(subscription.id, subscription.status);
      console.log(`Subscription ${subscription.id} updated to ${subscription.status}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      updateSubscriptionStatus(subscription.id, 'canceled');
      console.log(`Subscription ${subscription.id} canceled`);
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

export default router;
