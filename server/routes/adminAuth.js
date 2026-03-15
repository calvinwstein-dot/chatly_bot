import express from "express";
import { createClient } from '@supabase/supabase-js';
import { verifyToken, hasRole } from '../supabaseClient.js';

const router = express.Router();

// Client-side Supabase client (uses anon key, suitable for auth operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Login endpoint - proxies Supabase signInWithPassword
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.log(`❌ Admin login failed for ${email}: ${error.message}`);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check that user has admin role
    if (!hasRole(data.user, 'admin')) {
      console.log(`⛔ Non-admin user ${email} attempted admin login`);
      return res.status(403).json({ error: "Admin access required" });
    }

    console.log(`✅ Admin login successful for ${email}`);

    return res.json({
      success: true,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: {
        email: data.user.email,
        role: data.user.app_metadata?.role
      }
    });
  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

// Verify token endpoint
router.post("/verify", async (req, res) => {
  const { token } = req.body;

  const { user, error } = await verifyToken(token);
  
  if (error || !user || !hasRole(user, 'admin')) {
    return res.status(401).json({ valid: false });
  }

  return res.json({ 
    valid: true,
    user: {
      email: user.email,
      role: user.app_metadata?.role
    }
  });
});

// Refresh token endpoint
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token required" });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error) {
      return res.status(401).json({ error: "Session expired. Please login again." });
    }

    return res.json({
      success: true,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at
    });
  } catch (err) {
    console.error("Token refresh error:", err);
    return res.status(500).json({ error: "Refresh failed" });
  }
});

// Logout endpoint
router.post("/logout", async (req, res) => {
  // Client-side handles Supabase signOut; server just acknowledges
  return res.json({ success: true, message: "Logged out successfully" });
});

export default router;
