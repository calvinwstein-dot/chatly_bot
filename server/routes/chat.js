import express from "express";
import { body, validationResult } from 'express-validator';
import { handleChat } from "../orchestrator/index.js";
import { loadProfile } from "../profileLoader.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// Track demo message counts per session
const demoMessageCounts = new Map();

const SUBSCRIPTIONS_FILE = path.resolve("server/subscriptions.json");
const SESSIONS_FILE = path.resolve("server/data/hrSessions.json");

// HR Session validation helper
function validateHRSession(businessName, sessionToken) {
  if (!businessName || !sessionToken) return null;
  
  try {
    const profile = loadProfile(businessName);
    
    // Skip validation for non-internal profiles
    if (!profile.internal || !profile.requiresAuth) {
      return { valid: true };
    }
    
    // Internal profile - validate session
    if (!fs.existsSync(SESSIONS_FILE)) {
      return { valid: false, error: "No sessions found" };
    }
    
    const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
    const session = data.sessions[sessionToken];
    
    if (!session) {
      return { valid: false, error: "Invalid session" };
    }
    
    if (Date.now() > session.expiresAt) {
      return { valid: false, error: "Session expired" };
    }
    
    return { valid: true, email: session.email };
  } catch (error) {
    console.error("Session validation error:", error);
    return { valid: false, error: "Validation error" };
  }
}

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
  
  // Handle both object and array formats
  if (Array.isArray(data.subscriptions)) {
    // Old format: array
    const subscription = data.subscriptions.find(
      sub => sub.businessName === businessName && sub.status === 'active'
    );
    return !!subscription;
  } else {
    // New format: object keyed by business name
    const subscription = data.subscriptions[businessName];
    return subscription && subscription.status === 'active';
  }
}

function loadBusinessProfile(businessName) {
  return loadProfile(businessName);
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

router.post("/",
  // Input validation middleware
  [
    body('sessionId').trim().isLength({ min: 1, max: 100 }).escape(),
    body('message').trim().isLength({ min: 1, max: 5000 }).escape(),
    body('language').optional().isIn(['en', 'da', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'sv']),
    body('business').optional().trim().isLength({ max: 50 }).matches(/^[a-zA-Z0-9_-]+$/),
    body('demoMessageCount').optional().isInt({ min: 0, max: 1000 })
  ],
  async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn('⚠️  Invalid input:', errors.array());
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { sessionId, message, language, business, demoMessageCount } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId and message required" });
    }

    // Check HR session for internal profiles
    const sessionToken = req.headers['x-hr-session'];
    const sessionValidation = validateHRSession(business, sessionToken);
    
    if (sessionValidation && !sessionValidation.valid) {
      return res.status(401).json({ 
        error: "HR portal login required",
        requiresAuth: true 
      });
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
