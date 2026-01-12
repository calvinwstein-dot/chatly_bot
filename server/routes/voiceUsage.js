import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();
const VOICE_USAGE_FILE = path.resolve("server/data/voiceUsage.json");

// Load voice usage data
function loadVoiceUsage() {
  try {
    if (!fs.existsSync(VOICE_USAGE_FILE)) {
      const initialData = { usage: {} };
      fs.writeFileSync(VOICE_USAGE_FILE, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const data = fs.readFileSync(VOICE_USAGE_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading voice usage:", error);
    return { usage: {} };
  }
}

// Save voice usage data
function saveVoiceUsage(data) {
  fs.writeFileSync(VOICE_USAGE_FILE, JSON.stringify(data, null, 2));
}

// Load business profile to get voice settings
function loadBusinessProfile(businessName) {
  try {
    const filePath = path.resolve(`server/businessProfiles/${businessName}.json`);
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading business profile for ${businessName}:`, error);
    return null;
  }
}

// Check if business has voice enabled and within limits
function checkVoiceAccess(businessName) {
  const profile = loadBusinessProfile(businessName);
  
  if (!profile) {
    return {
      allowed: false,
      reason: "Business profile not found"
    };
  }

  // Check if voice is enabled for this business
  if (!profile.voiceEnabled) {
    return {
      allowed: false,
      reason: "Voice feature not enabled for this subscription tier"
    };
  }

  // Get current usage
  const data = loadVoiceUsage();
  const businessUsage = data.usage[businessName] || {
    minutesUsed: 0,
    lastReset: new Date().toISOString()
  };

  const minutesLimit = profile.voiceMinutesLimit || 500;
  const minutesUsed = businessUsage.minutesUsed || 0;
  const minutesRemaining = minutesLimit - minutesUsed;

  // Check if limit exceeded
  if (minutesUsed >= minutesLimit) {
    return {
      allowed: false,
      reason: "Voice usage limit exceeded",
      minutesUsed,
      minutesLimit,
      minutesRemaining: 0
    };
  }

  return {
    allowed: true,
    minutesUsed,
    minutesLimit,
    minutesRemaining
  };
}

// Track voice usage (add seconds/minutes)
function trackVoiceUsage(businessName, seconds) {
  const data = loadVoiceUsage();
  
  if (!data.usage[businessName]) {
    data.usage[businessName] = {
      minutesUsed: 0,
      lastReset: new Date().toISOString(),
      requests: []
    };
  }

  const minutes = seconds / 60;
  data.usage[businessName].minutesUsed += minutes;
  
  // Log the request for audit trail
  data.usage[businessName].requests.push({
    timestamp: new Date().toISOString(),
    seconds: seconds,
    minutes: minutes
  });

  saveVoiceUsage(data);

  return {
    success: true,
    totalMinutesUsed: data.usage[businessName].minutesUsed
  };
}

// Reset usage for a business (for annual reset or manual override)
function resetVoiceUsage(businessName) {
  const data = loadVoiceUsage();
  
  if (data.usage[businessName]) {
    data.usage[businessName] = {
      minutesUsed: 0,
      lastReset: new Date().toISOString(),
      requests: []
    };
    saveVoiceUsage(data);
  }

  return { success: true };
}

// API Routes

// GET /api/voice-usage/:businessName - Check access and get usage stats
router.get("/:businessName", (req, res) => {
  const { businessName } = req.params;
  const access = checkVoiceAccess(businessName);
  res.json(access);
});

// POST /api/voice-usage/track - Track voice usage after generating speech
router.post("/track", express.json(), (req, res) => {
  const { businessName, seconds } = req.body;

  if (!businessName || !seconds) {
    return res.status(400).json({ error: "businessName and seconds required" });
  }

  const result = trackVoiceUsage(businessName, seconds);
  res.json(result);
});

// POST /api/voice-usage/reset - Reset usage for a business (admin only)
router.post("/reset", express.json(), (req, res) => {
  const { businessName } = req.body;

  if (!businessName) {
    return res.status(400).json({ error: "businessName required" });
  }

  const result = resetVoiceUsage(businessName);
  res.json(result);
});

// GET /api/voice-usage - Get all voice usage (admin dashboard)
router.get("/", (req, res) => {
  const data = loadVoiceUsage();
  res.json(data);
});

export default router;
export { checkVoiceAccess, trackVoiceUsage, resetVoiceUsage };
