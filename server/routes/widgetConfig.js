import express from "express";
import { config } from "../config.js";
import fs from "fs";
import path from "path";

const router = express.Router();

function loadBusinessProfile(businessName) {
  try {
    let filePath = path.resolve(`server/businessProfiles/${businessName}.json`);
    console.log("Looking for:", filePath);
    
    // If file doesn't exist, try adding "Demo" suffix
    if (!fs.existsSync(filePath)) {
      filePath = path.resolve(`server/businessProfiles/${businessName}Demo.json`);
      console.log("Trying Demo suffix:", filePath);
    }
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Business profile not found: ${businessName}`);
    }
    
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading business profile:", error);
    throw error;
  }
}

router.get("/", (req, res) => {
  try {
    const businessName = req.query.business || 'Henri';
    const business = loadBusinessProfile(businessName);
    
    res.json({
      ...config.widget,
      brandName: business.businessName,
      logoUrl: business.logoUrl || config.widget.logoUrl,
      primaryColor: business.primaryColor || config.widget.primaryColor,
      secondaryColor: business.secondaryColor || config.widget.secondaryColor,
      textColor: business.textColor || config.widget.textColor,
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
