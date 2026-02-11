import fs from "fs";
import path from "path";

const SESSIONS_FILE = path.resolve("server/data/hrSessions.json");

/**
 * Middleware to check if user has required role
 * @param {string[]} allowedRoles - Array of roles that can access this route
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const sessionToken = req.headers['x-hr-session'];
    
    if (!sessionToken) {
      return res.status(401).json({ 
        error: "Authentication required",
        requiresAuth: true 
      });
    }
    
    try {
      if (!fs.existsSync(SESSIONS_FILE)) {
        return res.status(401).json({ error: "No active sessions" });
      }
      
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
      const session = data.sessions[sessionToken];
      
      if (!session) {
        return res.status(401).json({ error: "Invalid session" });
      }
      
      if (Date.now() > session.expiresAt) {
        return res.status(401).json({ error: "Session expired" });
      }
      
      const userRole = session.role || 'employee';
      
      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: "Access denied",
          message: `This action requires one of these roles: ${allowedRoles.join(', ')}`,
          userRole: userRole
        });
      }
      
      // Attach session info to request for use in route handlers
      req.hrSession = {
        email: session.email,
        role: userRole,
        sessionToken
      };
      
      next();
    } catch (error) {
      console.error("Role check error:", error);
      return res.status(500).json({ error: "Authorization error" });
    }
  };
}

/**
 * Middleware to check if user is shop manager or admin
 */
export const requireHRManager = requireRole('shop_manager', 'hr_admin');

/**
 * Middleware to check if user is HR admin only
 */
export const requireHRAdmin = requireRole('hr_admin');
