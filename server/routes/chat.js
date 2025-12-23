import express from "express";
import { handleChat } from "../orchestrator/index.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// Track demo message counts per session
const demoMessageCounts = new Map();

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

function hasActiveSubscription(businessName) {
  const data = loadSubscriptions();
  const subscription = data.subscriptions.find(
    sub => sub.businessName === businessName && sub.status === 'active'
  );
  return !!subscription;
}

function loadBusinessProfile(businessName) {
  const filePath = path.resolve(`server/businessProfiles/${businessName}.json`);
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

function checkDemoStatus(businessProfile) {
  if (!businessProfile.isDemoMode) {
    return { isDemo: false };
  }

  // Check if demo expired
  if (businessProfile.demoExpiryDate) {
    const expiryDate = new Date(businessProfile.demoExpiryDate);
    const now = new Date();
    if (now > expiryDate) {
      return {
        isDemo: true,
        expired: true,
        message: "This demo has expired. Please subscribe to continue using Chappy."
      };
    }
  }

  return {
    isDemo: true,
    expired: false,
    messageLimit: businessProfile.demoMessageLimit || 10,
    expiryDate: businessProfile.demoExpiryDate,
    stripePaymentLink: businessProfile.stripePaymentLink,
    subscriptionPrices: businessProfile.subscriptionPrices
  };
}

router.post("/", async (req, res) => {
  try {
    const { sessionId, message, language, business, demoMessageCount } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId and message required" });
    }

    const businessProfile = loadBusinessProfile(business || 'Henri');
    const businessNameForCheck = business || 'Henri';
    
    // Check if business has active subscription FIRST - bypass all demo restrictions
    const hasSubscription = hasActiveSubscription(businessNameForCheck);
    
    if (hasSubscription) {
      // Subscription active - NO demo restrictions, process normally
      const result = await handleChat({ sessionId, message, language: language || 'en', business: businessNameForCheck });
      return res.json(result);
    }
    
    // No subscription - check demo status
    const demoStatus = checkDemoStatus(businessProfile);

    // If demo expired, return error
    if (demoStatus.expired) {
      return res.json({
        reply: demoStatus.message,
        demoStatus: demoStatus
      });
    }

    // If demo mode, track message count (use client count if provided)
    if (demoStatus.isDemo) {
      // Use the count from client (localStorage) if provided, otherwise use server count
      const currentCount = typeof demoMessageCount === 'number' ? demoMessageCount : (demoMessageCounts.get(sessionId) || 0);
      
      // Check if limit reached
      if (currentCount >= demoStatus.messageLimit) {
        return res.json({
          reply: `You've reached the ${demoStatus.messageLimit} message limit for this demo. Subscribe to Chappy to continue chatting with unlimited messages!`,
          demoStatus: {
            ...demoStatus,
            limitReached: true,
            messagesUsed: currentCount,
            messagesRemaining: 0
          }
        });
      }

      // Increment counter
      const newCount = currentCount + 1;
      demoMessageCounts.set(sessionId, newCount);
      
      const result = await handleChat({ sessionId, message, language: language || 'en', business: business || 'Henri' });
      
      // Add demo status to response
      result.demoStatus = {
        ...demoStatus,
        messagesUsed: newCount,
        messagesRemaining: demoStatus.messageLimit - newCount,
        limitReached: newCount >= demoStatus.messageLimit
      };
      
      return res.json(result);
    }

    const result = await handleChat({ sessionId, message, language: language || 'en', business: business || 'Henri' });
    res.json(result);
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
