import express from "express";
import { config, BUSINESS_PROFILE } from "../config.js";
import fs from "fs";
import path from "path";

const router = express.Router();

function loadBusinessProfile() {
  const filePath = path.resolve(`server/businessProfiles/${BUSINESS_PROFILE}.json`);
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

router.get("/", (req, res) => {
  const business = loadBusinessProfile();
  
  res.json({
    ...config.widget,
    brandName: business.businessName,
    logoUrl: business.logoUrl || config.widget.logoUrl
  });
});

export default router;
