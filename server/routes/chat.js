import express from "express";
import { handleChat } from "../orchestrator/index.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// Track demo message counts per session
const demoMessageCounts = new Map();

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
    const { sessionId, message, language, business } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId and message required" });
    }

    const businessProfile = loadBusinessProfile(business || 'Henri');
    const demoStatus = checkDemoStatus(businessProfile);

    // If demo expired, return error
    if (demoStatus.expired) {
      return res.json({
        reply: demoStatus.message,
        demoStatus: demoStatus
      });
    }

    // If demo mode, track message count
    if (demoStatus.isDemo) {
      const currentCount = demoMessageCounts.get(sessionId) || 0;
      
      // Check if limit reached
      if (currentCount >= demoStatus.messageLimit) {
        return res.json({
          reply: `You've reached the ${demoStatus.messageLimit} message limit for this demo. Subscribe to Chappy to continue chatting with unlimited messages!`,
          demoStatus: {
            ...demoStatus,
            limitReached: true,
            messagesUsed: currentCount
          }
        });
      }

      // Increment counter
      demoMessageCounts.set(sessionId, currentCount + 1);
    }

    const result = await handleChat({ sessionId, message, language: language || 'en', business: business || 'Henri' });
    
    // Add demo status to response
    if (demoStatus.isDemo) {
      const messagesUsed = demoMessageCounts.get(sessionId) || 0;
      result.demoStatus = {
        ...demoStatus,
        messagesUsed,
        messagesRemaining: demoStatus.messageLimit - messagesUsed
      };
    }

    res.json(result);
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
