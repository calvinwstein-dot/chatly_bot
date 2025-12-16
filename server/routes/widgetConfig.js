import express from "express";
import { config } from "../config.js";
import fs from "fs";
import path from "path";

const router = express.Router();

function loadBusinessProfile(businessName) {
  const filePath = path.resolve(`server/businessProfiles/${businessName}.json`);
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

router.get("/", (req, res) => {
  const businessName = req.query.business || 'Henri';
  const business = loadBusinessProfile(businessName);
  
  res.json({
    ...config.widget,
    brandName: business.businessName,
    logoUrl: business.logoUrl || config.widget.logoUrl,
    primaryColor: business.primaryColor || config.widget.primaryColor,
    secondaryColor: business.secondaryColor || config.widget.secondaryColor,
    textColor: business.textColor || config.widget.textColor
  });
});

export default router;
