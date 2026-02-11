import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logAuditEvent, getClientIP } from "../auditLogger.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PTO_REQUESTS_FILE = path.join(
  __dirname,
  "..",
  "data",
  "ptoRequests.json"
);

// Initialize PTO requests file if it doesn't exist
if (!fs.existsSync(PTO_REQUESTS_FILE)) {
  fs.writeFileSync(
    PTO_REQUESTS_FILE,
    JSON.stringify({ requests: [] }, null, 2)
  );
}

// Submit a new PTO request
router.post("/", async (req, res) => {
  try {
    const { employeeEmail, days, startDate, endDate, reason } = req.body;

    // Validate required fields
    if (!employeeEmail || !days || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Read existing requests
    const data = JSON.parse(fs.readFileSync(PTO_REQUESTS_FILE, "utf8"));

    // Create new request
    const request = {
      id: Date.now().toString(),
      employeeEmail,
      days: parseFloat(days),
      startDate,
      endDate,
      reason: reason || "",
      status: "pending",
      submittedAt: new Date().toISOString(),
    };

    // Add to requests array
    data.requests.push(request);

    // Save to file
    fs.writeFileSync(PTO_REQUESTS_FILE, JSON.stringify(data, null, 2));

    // Audit log
    logAuditEvent('PTO_REQUEST_SUBMITTED', employeeEmail, { 
      days, 
      startDate, 
      endDate, 
      requestId: request.id 
    }, getClientIP(req));

    // TODO: Send email notification to HR
    // This would typically use nodemailer or similar
    console.log(`PTO Request submitted by ${employeeEmail}:`, request);
    console.log(
      `HR Notification: Employee ${employeeEmail} requested ${days} days off from ${startDate} to ${endDate}`
    );

    res.json({
      success: true,
      message: "PTO request submitted successfully",
      requestId: request.id,
    });
  } catch (error) {
    console.error("Error submitting PTO request:", error);
    res.status(500).json({ error: "Failed to submit PTO request" });
  }
});

// Get all PTO requests (for admin/HR)
router.get("/", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(PTO_REQUESTS_FILE, "utf8"));
    res.json(data.requests);
  } catch (error) {
    console.error("Error loading PTO requests:", error);
    res.status(500).json({ error: "Failed to load PTO requests" });
  }
});

// Get PTO requests for a specific employee
router.get("/:email", (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const data = JSON.parse(fs.readFileSync(PTO_REQUESTS_FILE, "utf8"));
    const employeeRequests = data.requests.filter(
      (r) => r.employeeEmail.toLowerCase() === email
    );
    res.json(employeeRequests);
  } catch (error) {
    console.error("Error loading employee PTO requests:", error);
    res.status(500).json({ error: "Failed to load PTO requests" });
  }
});

// Update PTO request status (approve/deny)
router.patch("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewedBy, reviewNotes } = req.body;

    if (!["approved", "denied"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const data = JSON.parse(fs.readFileSync(PTO_REQUESTS_FILE, "utf8"));
    const request = data.requests.find((r) => r.id === id);

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    request.status = status;
    request.reviewedBy = reviewedBy;
    request.reviewedAt = new Date().toISOString();
    request.reviewNotes = reviewNotes || "";

    fs.writeFileSync(PTO_REQUESTS_FILE, JSON.stringify(data, null, 2));

    console.log(`PTO Request ${id} ${status} by ${reviewedBy}`);

    res.json({ success: true, request });
  } catch (error) {
    console.error("Error updating PTO request:", error);
    res.status(500).json({ error: "Failed to update PTO request" });
  }
});

export default router;
