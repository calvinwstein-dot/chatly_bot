import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve('server/logs');
const SECURITY_LOG = path.join(LOG_DIR, 'security.log');
const ACCESS_LOG = path.join(LOG_DIR, 'access.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function formatLogEntry(type, data) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    type,
    ...data
  }) + '\n';
}

export function logSecurityEvent(event, details) {
  const entry = formatLogEntry('SECURITY', { event, ...details });
  console.warn(`🔒 SECURITY: ${event}`, details);
  
  fs.appendFile(SECURITY_LOG, entry, (err) => {
    if (err) console.error('Failed to write security log:', err);
  });
}

export function logAccess(req, details = {}) {
  const entry = formatLogEntry('ACCESS', {
    ip: req.ip,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    ...details
  });
  
  fs.appendFile(ACCESS_LOG, entry, (err) => {
    if (err) console.error('Failed to write access log:', err);
  });
}

// Middleware to log all API requests
export function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logAccess(req, {
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  
  next();
}

// Monitor suspicious activity
export function detectSuspiciousActivity(req, res, next) {
  const suspiciousPatterns = [
    /(\.\.|\/etc\/|\/proc\/|\/sys\/)/i, // Path traversal
    /<script|javascript:|onerror=/i,     // XSS attempts
    /union.*select|drop.*table/i,        // SQL injection
  ];
  
  const checkString = JSON.stringify(req.body) + req.path + req.query;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      logSecurityEvent('SUSPICIOUS_REQUEST', {
        ip: req.ip,
        path: req.path,
        pattern: pattern.toString(),
        body: req.body
      });
      return res.status(400).json({ error: 'Invalid request' });
    }
  }
  
  next();
}
