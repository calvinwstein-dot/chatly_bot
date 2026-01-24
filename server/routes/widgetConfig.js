import express from "express";
import { config } from "../config.js";
import { loadProfile } from "../profileLoader.js";
import fs from "fs";
import path from "path";

const router = express.Router();

function loadBusinessProfile(businessName) {
  try {
    return loadProfile(businessName);
  } catch (error) {
    console.error(`Error loading profile ${businessName}:`, error);
    throw error;
  }
}

router.get("/", (req, res) => {
  try {
    const businessName = req.query.business || 'Henri';
    const business = loadBusinessProfile(businessName);
    
    // Automatically select test or live payment links based on NODE_ENV
    const isProduction = process.env.NODE_ENV === 'production';
    let stripePaymentLink = business.stripePaymentLink;
    
    // If payment links have test/live structure, select the appropriate one
    if (stripePaymentLink && stripePaymentLink.test && stripePaymentLink.live) {
      stripePaymentLink = isProduction ? stripePaymentLink.live : stripePaymentLink.test;
    }
    
    res.json({
      ...config.widget,
      brandName: business.businessName,
      logoUrl: business.logoUrl || config.widget.logoUrl,
      internal: business.internal || false,
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
      launcherShape: business.launcherShape || 'pill',
      launcherText: business.launcherText || 'Talk to us',
      sendButtonColor: business.sendButtonColor || business.userBubbleColor || business.primaryColor || config.widget.primaryColor,
      sendButtonText: business.sendButtonText || 'Send',
      sendButtonTextColor: business.sendButtonTextColor || '#ffffffff',
      sendButtonIcon: business.sendButtonIcon || 'none',
      primaryLanguage: business.primaryLanguage || 'en',
      secondaryLanguage: business.secondaryLanguage || 'da',
      isDemoMode: business.isDemoMode || false,
      demoMessageLimit: business.demoMessageLimit,
      demoExpiryDate: business.demoExpiryDate,
      stripePaymentLink: stripePaymentLink,
      subscriptionPrices: business.subscriptionPrices,
      voiceEnabled: business.voiceEnabled || false
    });
  } catch (error) {
    console.error("Widget config error:", error);
    res.status(500).json({ error: "Failed to load widget config", message: error.message });
  }
});

export default router;
