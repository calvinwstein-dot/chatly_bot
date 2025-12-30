import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

// Get business profile
router.get("/:businessName", (req, res) => {
  try {
    const { businessName } = req.params;
    const filePath = path.resolve(`server/businessProfiles/${businessName}.json`);
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
      phoneHours,
      websiteUrl,
      bookingUrl,
      currency,
      description,
      openaiConfig,
      isDemoMode,
      demoMessageLimit,
      stripePaymentLink,
      subscriptionPrices
    } = req.body;
    
    // Basic fields
    if (primaryColor !== undefined) profile.primaryColor = primaryColor;
    if (secondaryColor !== undefined) profile.secondaryColor = secondaryColor;
    if (textColor !== undefined) profile.textColor = textColor;
    if (logoUrl !== undefined) profile.logoUrl = logoUrl;
    if (newBusinessName !== undefined) profile.businessName = newBusinessName;
    
    // Contact fields
    if (phone !== undefined) profile.phone = phone;
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
    
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ error: "Failed to update business profile", details: error.message });
  }
});

// List all business profiles
router.get("/", (req, res) => {
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

export default router;
