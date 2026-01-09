import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();
const SETUP_FEES_FILE = path.resolve("server/data/setupFees.json");

function loadSetupFees() {
  try {
    if (!fs.existsSync(SETUP_FEES_FILE)) {
      return { payments: [] };
    }
    const data = fs.readFileSync(SETUP_FEES_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading setup fees:", error);
    return { payments: [] };
  }
}

function saveSetupFees(data) {
  fs.writeFileSync(SETUP_FEES_FILE, JSON.stringify(data, null, 2));
}

// Get all setup fee payments
router.get("/", (req, res) => {
  const data = loadSetupFees();
  // Return in format expected by admin: { setupFees: [...] }
  res.json({ setupFees: data.payments || [] });
});

// Mark a setup fee payment as "profile created"
router.post("/mark-created", express.json(), (req, res) => {
  const { paymentIntentId } = req.body;
  
  const data = loadSetupFees();
  const payment = data.payments.find(p => p.paymentIntentId === paymentIntentId);
  
  if (payment) {
    payment.profileCreated = true;
    payment.profileCreatedAt = new Date().toISOString();
    saveSetupFees(data);
    res.json({ success: true, payment });
  } else {
    res.status(404).json({ error: "Payment not found" });
  }
});

export default router;
