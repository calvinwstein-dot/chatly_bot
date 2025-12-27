import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const METRICS_FILE = path.join(__dirname, "../metrics.json");

// Initialize metrics file if it doesn't exist
function initMetricsFile() {
  if (!fs.existsSync(METRICS_FILE)) {
    fs.writeFileSync(
      METRICS_FILE,
      JSON.stringify({ businesses: {} }, null, 2)
    );
  }
}

// Read metrics
function readMetrics() {
  initMetricsFile();
  const data = fs.readFileSync(METRICS_FILE, "utf8");
  return JSON.parse(data);
}

// Write metrics
function writeMetrics(data) {
  fs.writeFileSync(METRICS_FILE, JSON.stringify(data, null, 2));
}

// Log event (click or message)
router.post("/log", (req, res) => {
  try {
    const { business, eventType } = req.body; // eventType: 'click' or 'message'

    if (!business || !eventType) {
      return res.status(400).json({ error: "Missing business or eventType" });
    }

    const metrics = readMetrics();

    // Initialize business if doesn't exist
    if (!metrics.businesses[business]) {
      metrics.businesses[business] = {
        clicks: 0,
        messages: 0,
        dailyStats: {},
      };
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Initialize daily stats
    if (!metrics.businesses[business].dailyStats[today]) {
      metrics.businesses[business].dailyStats[today] = {
        clicks: 0,
        messages: 0,
      };
    }

    // Increment counters
    if (eventType === "click") {
      metrics.businesses[business].clicks++;
      metrics.businesses[business].dailyStats[today].clicks++;
    } else if (eventType === "message") {
      metrics.businesses[business].messages++;
      metrics.businesses[business].dailyStats[today].messages++;
    }

    writeMetrics(metrics);

    res.json({ success: true });
  } catch (error) {
    console.error("Error logging metrics:", error);
    res.status(500).json({ error: "Failed to log metrics" });
  }
});

// Get metrics for a business
router.get("/", (req, res) => {
  try {
    const { business } = req.query;
    const metrics = readMetrics();

    if (business) {
      // Return specific business metrics
      const businessMetrics = metrics.businesses[business] || {
        clicks: 0,
        messages: 0,
        dailyStats: {},
      };
      res.json({ business, ...businessMetrics });
    } else {
      // Return all businesses
      res.json(metrics);
    }
  } catch (error) {
    console.error("Error reading metrics:", error);
    res.status(500).json({ error: "Failed to read metrics" });
  }
});

// Get metrics summary for all businesses
router.get("/summary", (req, res) => {
  try {
    const metrics = readMetrics();
    const summary = {};

    for (const [business, data] of Object.entries(metrics.businesses)) {
      summary[business] = {
        totalClicks: data.clicks,
        totalMessages: data.messages,
        last7Days: getLast7Days(data.dailyStats),
        last30Days: getLast30Days(data.dailyStats),
      };
    }

    res.json(summary);
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

// Helper: Get last 7 days stats
function getLast7Days(dailyStats) {
  const result = { clicks: 0, messages: 0 };
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    if (dailyStats[dateStr]) {
      result.clicks += dailyStats[dateStr].clicks;
      result.messages += dailyStats[dateStr].messages;
    }
  }

  return result;
}

// Helper: Get last 30 days stats
function getLast30Days(dailyStats) {
  const result = { clicks: 0, messages: 0 };
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    if (dailyStats[dateStr]) {
      result.clicks += dailyStats[dateStr].clicks;
      result.messages += dailyStats[dateStr].messages;
    }
  }

  return result;
}

export default router;
