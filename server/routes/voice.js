import express from "express";
import { textToSpeech } from "../elevenLabsClient.js";
import { checkVoiceAccess, trackVoiceUsage } from "./voiceUsage.js";
import fs from "fs";
import path from "path";

const router = express.Router();

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

// Estimate audio duration from text length
// Rough estimate: ~150 words per minute average speaking rate
// Average 5 characters per word
function estimateAudioDuration(text) {
  const characters = text.length;
  const words = characters / 5;
  const minutes = words / 150;
  const seconds = minutes * 60;
  return Math.max(1, Math.ceil(seconds)); // Minimum 1 second
}

// POST /api/voice/speak - Generate speech from text
router.post("/speak", express.json(), async (req, res) => {
  try {
    const { text, businessName } = req.body;

    if (!text || !businessName) {
      return res.status(400).json({ 
        error: "text and businessName are required" 
      });
    }

    // Check if voice is allowed and within limits
    const access = checkVoiceAccess(businessName);
    
    if (!access.allowed) {
      return res.status(403).json({
        error: access.reason,
        minutesUsed: access.minutesUsed,
        minutesLimit: access.minutesLimit
      });
    }

    // Load business profile to get voice ID
    const profile = loadBusinessProfile(businessName);
    if (!profile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    // Get voice ID from profile or use default
    const voiceId = profile.elevenLabsVoiceId || "21m00Tcm4TlvDq8ikWAM"; // Rachel voice

    // Clean text for voice - remove image descriptions, markdown, and formatting
    let cleanText = text
      // Remove markdown image syntax: ![alt text](url)
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
      // Remove HTML image tags: <img src="..." alt="..." />
      .replace(/<img[^>]*>/gi, '')
      // Remove [image], (image), etc.
      .replace(/\[image[^\]]*\]/gi, '')
      .replace(/\(image[^)]*\)/gi, '')
      // Remove markdown bold/italic: **text** or *text*
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove markdown links but keep text: [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`🎤 Generating voice for ${businessName}: "${cleanText.substring(0, 50)}..." using voice: ${voiceId}`);
    // Generate speech
    const audioBuffer = await textToSpeech(cleanText, voiceId);

    // Estimate duration for usage tracking
    const estimatedSeconds = estimateAudioDuration(cleanText);

    // Track usage
    trackVoiceUsage(businessName, estimatedSeconds);

    console.log(`✓ Voice generated: ~${estimatedSeconds}s, Total: ${access.minutesUsed.toFixed(2)}min / ${access.minutesLimit}min`);

    // Return audio as MP3
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'no-cache'
    });

    res.send(audioBuffer);

  } catch (error) {
    console.error("Voice generation error:", error);
    
    if (error.message.includes("ELEVENLABS_API_KEY")) {
      return res.status(503).json({ 
        error: "Voice service not configured",
        details: "ElevenLabs API key is missing"
      });
    }

    res.status(500).json({ 
      error: "Failed to generate voice",
      details: error.message 
    });
  }
});

// GET /api/voice/check/:businessName - Check if voice is available
router.get("/check/:businessName", (req, res) => {
  const { businessName } = req.params;
  const access = checkVoiceAccess(businessName);
  res.json(access);
});

export default router;
