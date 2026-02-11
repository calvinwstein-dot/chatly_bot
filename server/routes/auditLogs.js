import express from "express";
import { getAuditLogs } from "../auditLogger.js";
import { requireHRAdmin } from "../middleware/roleAuth.js";

const router = express.Router();

// Get audit logs with optional filters - Require HR Admin access
router.get("/", requireHRAdmin, (req, res) => {
  try {
    const { userEmail, action, startDate, endDate, limit } = req.query;
    
    const filters = {};
    if (userEmail) filters.userEmail = userEmail;
    if (action) filters.action = action;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    let logs = getAuditLogs(filters);
    
    // Apply limit if specified
    if (limit) {
      const limitNum = parseInt(limit);
      logs = logs.slice(0, limitNum);
    }
    
    res.json({ 
      success: true, 
      count: logs.length,
      logs 
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// Get summary of audit activity - Require HR Admin access
router.get("/summary", requireHRAdmin, (req, res) => {
  try {
    const logs = getAuditLogs();
    
    // Count actions by type
    const actionCounts = {};
    const userActivity = {};
    
    logs.forEach(log => {
      // Count by action type
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      
      // Count by user
      if (!userActivity[log.userEmail]) {
        userActivity[log.userEmail] = { total: 0, actions: {} };
      }
      userActivity[log.userEmail].total += 1;
      userActivity[log.userEmail].actions[log.action] = 
        (userActivity[log.userEmail].actions[log.action] || 0) + 1;
    });
    
    res.json({
      success: true,
      totalEvents: logs.length,
      actionCounts,
      userActivity,
      mostRecentEvent: logs[0] || null
    });
  } catch (error) {
    console.error("Error generating audit summary:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

export default router;
