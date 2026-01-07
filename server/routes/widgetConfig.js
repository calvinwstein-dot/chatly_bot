import express from "express";
import { config } from "../config.js";
import fs from "fs";
import path from "path";
import { loadBusinessProfile } from "../utils/businessProfile.js";

const router = express.Router();

router.get("/", (req, res) => {
  try {
    const businessName = req.query.business || 'Henri';
    const business = loadBusinessProfile(businessName);
    
    res.json({
      ...config.widget,
      brandName: business.businessName,
      logoUrl: business.logoUrl || config.widget.logoUrl,
      // Legacy colors for backwards compatibility
      primaryColor: business.primaryColor || config.widget.primaryColor,
      secondaryColor: business.secondaryColor || config.widget.secondaryColor,
      textColor: business.textColor || config.widget.textColor,
      // New granular color system
      launcherColor: business.launcherColor || business.primaryColor || config.widget.primaryColor,
      headerColor: business.headerColor || business.primaryColor || config.widget.primaryColor,
      userBubbleColor: business.userBubbleColor || business.primaryColor || config.widget.primaryColor,
      userTextColor: business.userTextColor || '#ffffffff',
      botBubbleColor: business.botBubbleColor || '#e5e7ebff',
      botTextColor: business.botTextColor || business.textColor || config.widget.textColor,
      widgetBgColor: business.widgetBgColor || '#f9fafbff',
      borderColor: business.borderColor || '#e5e7ebff',
      launcherStyle: business.launcherStyle || 'message',
      launcherText: business.launcherText || 'Talk to us',
      primaryLanguage: business.primaryLanguage || 'en',
      secondaryLanguage: business.secondaryLanguage || 'da',
      isDemoMode: business.isDemoMode || false,
      demoMessageLimit: business.demoMessageLimit,
      demoExpiryDate: business.demoExpiryDate,
      stripePaymentLink: business.stripePaymentLink,
      subscriptionPrices: business.subscriptionPrices
    });
  } catch (error) {
    console.error("Widget config error:", error);
    res.status(500).json({ error: "Failed to load widget config", message: error.message });
  }
});

export default router;
