import express from "express";
import crypto from "crypto";

const router = express.Router();

// Admin password from environment variable
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// Simple token storage (in production, use Redis or database)
const validTokens = new Set();

// Generate a random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Login endpoint
router.post("/login", (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  if (password === ADMIN_PASSWORD) {
    const token = generateToken();
    validTokens.add(token);
    
    // Token expires in 24 hours
    setTimeout(() => {
      validTokens.delete(token);
    }, 24 * 60 * 60 * 1000);

    return res.json({ 
      success: true, 
      token,
      message: "Login successful" 
    });
  }

  return res.status(401).json({ error: "Invalid password" });
});

// Verify token endpoint
router.post("/verify", (req, res) => {
  const { token } = req.body;

  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ valid: false });
  }

  return res.json({ valid: true });
});

// Logout endpoint
router.post("/logout", (req, res) => {
  const { token } = req.body;
  
  if (token) {
    validTokens.delete(token);
  }

  return res.json({ success: true, message: "Logged out successfully" });
});

export default router;
