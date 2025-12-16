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
    
    // Update only the fields that are provided
    const { 
      primaryColor, 
      secondaryColor, 
      textColor, 
      logoUrl, 
      businessName: newBusinessName,
      phone 
    } = req.body;
    
    if (primaryColor !== undefined) profile.primaryColor = primaryColor;
    if (secondaryColor !== undefined) profile.secondaryColor = secondaryColor;
    if (textColor !== undefined) profile.textColor = textColor;
    if (logoUrl !== undefined) profile.logoUrl = logoUrl;
    if (newBusinessName !== undefined) profile.businessName = newBusinessName;
    if (phone !== undefined) profile.phone = phone;
    
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
