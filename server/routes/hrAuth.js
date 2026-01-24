import express from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

const router = express.Router();
const SESSIONS_FILE = path.resolve("server/data/hrSessions.json");
const EMPLOYEES_FILE = path.resolve("server/data/employees.json");

// Validate HR portal login and create session
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(401).json({ error: "Username and password required" });
  }
  
  try {
    // Load employee data
    const employeesData = JSON.parse(fs.readFileSync(EMPLOYEES_FILE, 'utf8'));
    
    // Find employee by username
    let employee = null;
    let employeeEmail = null;
    
    for (const [email, emp] of Object.entries(employeesData.employees)) {
      if (emp.username && emp.username.toLowerCase() === username.toLowerCase()) {
        employee = emp;
        employeeEmail = email;
        break;
      }
    }
    
    if (!employee) {
      console.log(`❌ Login failed: Username "${username}" not found`);
      return res.status(401).json({ error: "Invalid username or password" });
    }
    
    console.log(`👤 Login attempt for username: ${username} (email: ${employeeEmail})`);
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, employee.password);
    if (!passwordMatch) {
      console.log(`❌ Login failed: Incorrect password for ${username}`);
      console.log(`   Attempted: ${password}`);
      console.log(`   Expected plain: ${employee.plainPassword}`);
      return res.status(401).json({ error: "Invalid username or password" });
    }
    
    console.log(`✅ Login successful for ${username}`);
    
    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Load sessions
    const sessions = loadSessions();
    
    // Store session (expires in 8 hours)
    sessions[sessionToken] = {
      email: employeeEmail,
      createdAt: Date.now(),
      expiresAt: Date.now() + (8 * 60 * 60 * 1000)
    };
    
    saveSessions(sessions);
    
    res.json({ 
      success: true, 
      sessionToken,
      email: employeeEmail
    });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// Validate session token
router.post("/validate", (req, res) => {
  const { sessionToken } = req.body;
  
  if (!sessionToken) {
    return res.status(401).json({ valid: false });
  }
  
  try {
    const sessions = loadSessions();
    const session = sessions[sessionToken];
    
    if (!session) {
      return res.status(401).json({ valid: false });
    }
    
    // Check expiration
    if (Date.now() > session.expiresAt) {
      delete sessions[sessionToken];
      saveSessions(sessions);
      return res.status(401).json({ valid: false, error: "Session expired" });
    }
    
    res.json({ 
      valid: true, 
      email: session.email 
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
