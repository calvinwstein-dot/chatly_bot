import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

// List all business profiles - MUST be before /:businessName route
router.get("/list", (req, res) => {
  try {
    const profilesDir = path.resolve("server/businessProfiles");
    const files = fs.readdirSync(profilesDir);
    const businesses = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
    res.json({ businesses });
  } catch (error) {
    res.status(500).json({ error: "Failed to list business profiles" });
  }
});

// Get business profile
router.get("/:businessName", (req, res) => {
  try {
    const { businessName } = req.params;
    const filePath = path.resolve(`server/businessProfiles/${businessName}.json`);
    
    // If file doesn't exist and it's ChappyBot, create default
    if (!fs.existsSync(filePath) && businessName === 'ChappyBot') {
      const defaultChappyBot = {
        "businessName": "Chappy",
        "logoUrl": "/public/logos/chappy-logo.png",
        "primaryColor": "#3b82f6",
        "secondaryColor": "#1e40af",
        "textColor": "#111827",
        "launcherColor": "#f05a35",
        "headerColor": "#f35b35",
        "userBubbleColor": "#48adc7",
        "userTextColor": "#ffffff",
        "botBubbleColor": "#fd955d",
        "botTextColor": "#000000",
        "widgetBgColor": "#ffffff",
        "borderColor": "#ffffff",
        "launcherStyle": "agent",
        "launcherText": "Lets chat",
        "launcherShape": "pill",
        "sendButtonColor": "#48adc7",
        "sendButtonTextColor": "#ffffff",
        "sendButtonText": "Send",
        "sendButtonIcon": "arrow",
        "primaryLanguage": "en",
        "secondaryLanguage": "da",
        "currency": "USD",
        "phone": "",
        "phoneHours": "24/7",
        "bookingUrl": "https://www.chappybot.com/demo",
        "websiteUrl": "https://www.chappybot.com",
        "email": "support@chappybot.com",
        "description": "Chappy delivers a custom AI chatbot that knows your services, prices, hours and all other relevant information—answering customer questions and handling tasks around the clock even while you sleep.",
        "isDemoMode": false,
        "demoMessageLimit": 999999,
        "voiceEnabled": false,
        "voiceMinutesLimit": 500,
        "subscriptionTier": "premium",
        "elevenLabsVoiceId": "21m00Tcm4TlvDq8ikWAM",
        "openaiConfig": {
          "model": "gpt-4o-mini",
          "temperature": 0.8,
          "instructions": "You are a calm, professional, and emotionally intelligent conversational partner for Chappy, an AI chatbot company. Be informative, personable, and understanding. You help potential customers learn about Chappy's services and can assist them in scheduling demos. When formatting section headings, use **bold** sparingly and naturally. Never use asterisk-based headings like :**Title**: or ** Heading ** or **Heading:**. Only bold key terms or phrases within sentences when emphasis is needed for clarity. Keep your formatting clean and professional."
        }
      };
      fs.writeFileSync(filePath, JSON.stringify(defaultChappyBot, null, 2));
      console.log('✓ Created default ChappyBot.json');
    }
    
    const data = fs.readFileSync(filePath, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(404).json({ error: "Business profile not found" });
  }
});

// Update business profile colors and basic info
router.patch("/:businessName", (req, res) => {
  try {
    const { businessName } = req.params;
    const filePath = path.resolve(`server/businessProfiles/${businessName}.json`);
    
    // Read existing profile
    const data = fs.readFileSync(filePath, "utf-8");
    const profile = JSON.parse(data);
    
    // Update all provided fields
    const { 
      primaryColor, 
      secondaryColor, 
      textColor, 
      logoUrl, 
      businessName: newBusinessName,
      phone,
      email,
      phoneHours,
      websiteUrl,
      bookingUrl,
      currency,
      description,
      openaiConfig,
      isDemoMode,
      demoMessageLimit,
      stripePaymentLink,
      subscriptionPrices,
      launcherColor,
      headerColor,
      userBubbleColor,
      userTextColor,
      botBubbleColor,
      botTextColor,
      widgetBgColor,
      borderColor,
      launcherStyle,
      launcherShape,
      launcherText,
      sendButtonColor,
      sendButtonText,
      sendButtonTextColor,
      sendButtonIcon,
      primaryLanguage,
      secondaryLanguage,
      voiceEnabled,
      elevenLabsVoiceId,
      voiceMinutesLimit,
      subscriptionTier
    } = req.body;
    
    // Basic fields
    if (primaryColor !== undefined) profile.primaryColor = primaryColor;
    if (secondaryColor !== undefined) profile.secondaryColor = secondaryColor;
    if (textColor !== undefined) profile.textColor = textColor;
    if (logoUrl !== undefined) profile.logoUrl = logoUrl;
    if (newBusinessName !== undefined) profile.businessName = newBusinessName;
    
    // Granular color customization
    if (launcherColor !== undefined) profile.launcherColor = launcherColor;
    if (headerColor !== undefined) profile.headerColor = headerColor;
    if (userBubbleColor !== undefined) profile.userBubbleColor = userBubbleColor;
    if (userTextColor !== undefined) profile.userTextColor = userTextColor;
    if (botBubbleColor !== undefined) profile.botBubbleColor = botBubbleColor;
    if (botTextColor !== undefined) profile.botTextColor = botTextColor;
    if (widgetBgColor !== undefined) profile.widgetBgColor = widgetBgColor;
    if (borderColor !== undefined) profile.borderColor = borderColor;
    
    // Launcher customization
    if (launcherStyle !== undefined) profile.launcherStyle = launcherStyle;
    if (launcherShape !== undefined) profile.launcherShape = launcherShape;
    if (launcherText !== undefined) profile.launcherText = launcherText;
    
    // Send button customization
    if (sendButtonColor !== undefined) profile.sendButtonColor = sendButtonColor;
    if (sendButtonText !== undefined) profile.sendButtonText = sendButtonText;
    if (sendButtonTextColor !== undefined) profile.sendButtonTextColor = sendButtonTextColor;
    if (sendButtonIcon !== undefined) profile.sendButtonIcon = sendButtonIcon;
    
    // Language settings
    if (primaryLanguage !== undefined) profile.primaryLanguage = primaryLanguage;
    if (secondaryLanguage !== undefined) profile.secondaryLanguage = secondaryLanguage;
    
    // Contact fields
    if (phone !== undefined) profile.phone = phone;
    if (email !== undefined) profile.email = email;
    if (phoneHours !== undefined) profile.phoneHours = phoneHours;
    if (websiteUrl !== undefined) profile.websiteUrl = websiteUrl;
    if (bookingUrl !== undefined) profile.bookingUrl = bookingUrl;
    if (currency !== undefined) profile.currency = currency;
    if (description !== undefined) profile.description = description;
    
    // AI Configuration
    if (openaiConfig !== undefined) {
      profile.openaiConfig = {
        ...profile.openaiConfig,
        ...openaiConfig
      };
    }
    
    // Demo Settings
    if (isDemoMode !== undefined) profile.isDemoMode = isDemoMode;
    if (demoMessageLimit !== undefined) profile.demoMessageLimit = demoMessageLimit;
    
    // Voice Settings
    if (voiceEnabled !== undefined) profile.voiceEnabled = voiceEnabled;
    if (elevenLabsVoiceId !== undefined) profile.elevenLabsVoiceId = elevenLabsVoiceId;
    if (voiceMinutesLimit !== undefined) profile.voiceMinutesLimit = voiceMinutesLimit;
    if (subscriptionTier !== undefined) profile.subscriptionTier = subscriptionTier;
    
    // Stripe Settings
    if (stripePaymentLink !== undefined) {
      profile.stripePaymentLink = {
        ...profile.stripePaymentLink,
        ...stripePaymentLink
      };
    }
    if (subscriptionPrices !== undefined) {
      profile.subscriptionPrices = {
        ...profile.subscriptionPrices,
        ...subscriptionPrices
      };
    }
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
    
    console.log(`✓ Business config updated: ${businessName}`);
    
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ error: "Failed to update business profile", details: error.message });
  }
});

export default router;
