import fs from "fs";
import path from "path";

const AUDIT_LOG_DIR = path.resolve("server/logs/audit");
const AUDIT_LOG_FILE = path.join(AUDIT_LOG_DIR, "hr-audit.log");

// Ensure log directory exists
if (!fs.existsSync(AUDIT_LOG_DIR)) {
  fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true });
}

/**
 * Log HR portal audit events
 * @param {string} action - Action type (LOGIN, LOGOUT, CHAT_ACCESS, PTO_REQUEST, etc.)
 * @param {string} userEmail - Email of the user performing the action
 * @param {object} details - Additional details about the action
 * @param {string} ipAddress - IP address of the request
 */
export function logAuditEvent(action, userEmail, details = {}, ipAddress = 'unknown') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    userEmail,
    ipAddress,
    details
  };

  const logLine = JSON.stringify(logEntry) + '\n';

  try {
    fs.appendFileSync(AUDIT_LOG_FILE, logLine);
    console.log(`📋 AUDIT: ${action} by ${userEmail} from ${ipAddress}`);
  } catch (error) {
    console.error('❌ Failed to write audit log:', error);
  }
}

/**
 * Get audit logs for a specific user or date range
 * @param {object} filters - Filters for the logs (userEmail, action, startDate, endDate)
 * @returns {array} Array of matching log entries
 */
export function getAuditLogs(filters = {}) {
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
      return [];
    }

    const logContent = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
    const logLines = logContent.trim().split('\n').filter(line => line);
    
    let logs = logLines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(log => log !== null);

    // Apply filters
    if (filters.userEmail) {
      logs = logs.filter(log => log.userEmail === filters.userEmail);
    }
    
    if (filters.action) {
      logs = logs.filter(log => log.action === filters.action);
    }
    
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      logs = logs.filter(log => new Date(log.timestamp) >= start);
    }
    
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      logs = logs.filter(log => new Date(log.timestamp) <= end);
    }

    return logs.reverse(); // Most recent first
  } catch (error) {
    console.error('❌ Failed to read audit logs:', error);
    return [];
  }
}

/**
 * Get IP address from request
 */
export function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.socket.remoteAddress || 
         'unknown';
}
