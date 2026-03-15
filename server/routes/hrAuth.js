import express from "express";
import { createClient } from '@supabase/supabase-js';
import { verifyToken, hasRole } from '../supabaseClient.js';
import fs from "fs";
import path from "path";
import { logAuditEvent, getClientIP } from "../auditLogger.js";

const router = express.Router();
const SESSIONS_FILE = path.resolve("server/data/hrSessions.json");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Validate HR portal login via Supabase
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(401).json({ error: "Email and password required" });
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.log(`❌ HR login failed for ${email}: ${error.message}`);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check that user has hr role
    if (!hasRole(data.user, 'hr') && !hasRole(data.user, 'admin')) {
      console.log(`⛔ User ${email} without HR role attempted HR login`);
      return res.status(403).json({ error: "HR portal access required" });
    }

    console.log(`✅ HR login successful for ${email}`);

    // Store session in hrSessions.json for backward compatibility with chat.js validation
    const sessionToken = data.session.access_token;
    const sessions = loadSessions();
    sessions[sessionToken] = {
      email: data.user.email,
      role: data.user.app_metadata?.role || 'hr',
      createdAt: Date.now(),
      expiresAt: data.session.expires_at * 1000 // Supabase returns seconds
    };
    saveSessions(sessions);

    // Audit log
    logAuditEvent('HR_LOGIN', email, { method: 'supabase' }, getClientIP(req));
    
    res.json({ 
      success: true, 
      sessionToken,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      email: data.user.email,
      name: data.user.email.split('@')[0],
      role: data.user.app_metadata?.role || 'hr'
    });
  } catch (error) {
    console.error("Error during HR login:", error);
    res.status(500).json({ error: "Failed to authenticate" });
  }
});

// Validate session token
router.post("/validate", async (req, res) => {
  const { sessionToken } = req.body;
  
  if (!sessionToken) {
    return res.status(401).json({ valid: false });
  }
  
  try {
    // Verify with Supabase
    const { user, error } = await verifyToken(sessionToken);
    
    if (error || !user) {
      // Also check local sessions as fallback
      const sessions = loadSessions();
      const session = sessions[sessionToken];
      
      if (!session || Date.now() > session.expiresAt) {
        return res.status(401).json({ valid: false, error: "Session expired" });
      }
      
      return res.json({ 
        valid: true, 
        email: session.email,
        role: session.role || 'hr'
      });
    }

    if (!hasRole(user, 'hr') && !hasRole(user, 'admin')) {
      return res.status(403).json({ valid: false, error: "HR access required" });
    }

    logAuditEvent('HR_SESSION_VALIDATED', user.email, { sessionToken: sessionToken.substring(0, 10) + '...' }, getClientIP(req));

    res.json({ 
      valid: true, 
      email: user.email,
      role: user.app_metadata?.role || 'hr'
    });
  } catch (error) {
    console.error("Error validating session:", error);
    res.status(500).json({ valid: false, error: "Validation error" });
  }
});

// Helper functions
function loadSessions() {
  if (!fs.existsSync(SESSIONS_FILE)) {
    return {};
  }
  const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
  return data.sessions || {};
}

function saveSessions(sessions) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions }, null, 2));
}

// Middleware to check HR session for internal profiles
export async function validateHRSession(req, res, next) {
  const businessName = req.body.businessName || req.query.business;
  
  // Skip validation for non-internal profiles
  if (!businessName) {
    return next();
  }
  
  // Check if this is an internal profile
  try {
    const { loadProfile } = await import("../profileLoader.js");
    const profile = loadProfile(businessName);
    
    if (!profile.internal || !profile.requiresAuth) {
      return next();
    }
    
    // Internal profile - require session token
    const sessionToken = req.headers['x-hr-session'];
    
    if (!sessionToken) {
      return res.status(401).json({ error: "HR session required" });
    }
    
    // Try Supabase verification first
    const { user, error } = await verifyToken(sessionToken);
    
    if (user && (hasRole(user, 'hr') || hasRole(user, 'admin'))) {
      req.hrUser = { email: user.email };
      return next();
    }
    
    // Fallback to local session check
    const sessions = loadSessions();
    const session = sessions[sessionToken];
    
    if (!session || Date.now() > session.expiresAt) {
      return res.status(401).json({ error: "Invalid or expired HR session" });
    }
    
    // Valid session - attach user info to request
    req.hrUser = { email: session.email };
    next();
  } catch (error) {
    // Profile not found or error - allow to continue (will fail at profile load)
    next();
  }
}

export default router;
