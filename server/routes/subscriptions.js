import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

const SUBSCRIPTIONS_FILE = path.resolve("server/subscriptions.json");

function loadSubscriptions() {
  try {
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
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

function hasActiveSubscription(businessName) {
  try {
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
      return false;
    }
    const data = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8'));
    const subscription = data.subscriptions?.find(
      sub => sub.businessName === businessName && sub.status === 'active'
    );
    return !!subscription;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

// Check subscription status endpoint
router.get("/check", (req, res) => {
  const { business } = req.query;
  if (!business) {
    return res.status(400).json({ error: "business parameter required" });
  }
  
  const hasSubscription = hasActiveSubscription(business);
  res.json({ 
    hasActiveSubscription: hasSubscription,
    businessName: business
  });
});

// Activate a subscription manually
router.post("/activate", (req, res) => {
  const { businessName, plan, customerId } = req.body;
  
  if (!businessName) {
    return res.status(400).json({ error: "businessName required" });
  }

  const data = loadSubscriptions();
  
  // Remove existing subscription for this business
  data.subscriptions = data.subscriptions.filter(sub => sub.businessName !== businessName);
  
  // Add new active subscription
  data.subscriptions.push({
    businessName,
    customerId: customerId || 'manual',
    subscriptionId: `manual-${Date.now()}`,
    plan: plan || 'monthly',
    status: 'active',
    activatedAt: new Date().toISOString()
  });
  
  saveSubscriptions(data);
  
  res.json({ 
    success: true, 
    message: `Subscription activated for ${businessName}`,
    subscription: data.subscriptions[data.subscriptions.length - 1]
  });
});

// Deactivate a subscription
router.post("/deactivate", (req, res) => {
  const { businessName } = req.body;
  
  if (!businessName) {
    return res.status(400).json({ error: "businessName required" });
  }

  const data = loadSubscriptions();
  const subscription = data.subscriptions.find(sub => sub.businessName === businessName);
  
  if (!subscription) {
    return res.status(404).json({ error: "No subscription found for this business" });
  }
  
  subscription.status = 'canceled';
  subscription.canceledAt = new Date().toISOString();
  
  saveSubscriptions(data);
  
  res.json({ 
    success: true, 
    message: `Subscription canceled for ${businessName}` 
  });
});

// List all subscriptions
router.get("/list", (req, res) => {
  const data = loadSubscriptions();
  res.json(data);
});

export default router;
