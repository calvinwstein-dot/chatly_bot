import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Log but don't exit for promise rejections
});

const GRACEFUL_SHUTDOWN_DELAY = 1000; // 1 second to allow logs to flush

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  console.error("Server will exit due to uncaught exception");
  // Exit after a brief delay to allow logs to flush
  setTimeout(() => {
    process.exit(1);
  }, GRACEFUL_SHUTDOWN_DELAY);
});

import { config } from "./config.js";
import { adminAuth } from "./middleware/auth.js";
import chatRoute from "./routes/chat.js";
import widgetConfigRoute from "./routes/widgetConfig.js";
import debugRoute from "./routes/debug.js";
import businessConfigRoute from "./routes/businessConfig.js";
import subscriptionsRoute from "./routes/subscriptions.js";
import metricsRoute from "./routes/metrics.js";
import setupFeesRoute from "./routes/setupFees.js";

const app = express();

app.use(cors());

// Load Stripe webhook BEFORE express.json() - needs raw body for signature verification
try {
  const { default: stripeWebhookRoute } = await import("./routes/stripeWebhook.js");
  app.use("/api/stripe-webhook", express.raw({ type: 'application/json' }), stripeWebhookRoute);
  console.log("✓ Stripe webhook loaded successfully");
} catch (error) {
  console.warn("⚠ Stripe webhook disabled:", error.message);
}

// Now apply JSON parser for all other routes
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static widget
app.use("/widget", express.static(path.join(__dirname, "../widget")));
app.use("/admin", adminAuth, express.static(path.join(__dirname, "../admin")));
app.use("/public", express.static(path.join(__dirname, "../public")));

// API routes
app.use("/api/chat", chatRoute);
app.use("/api/widget-config", widgetConfigRoute);
app.use("/api/debug", debugRoute);
app.use("/api/business-config", businessConfigRoute);
app.use("/api/subscriptions", subscriptionsRoute);
app.use("/api/metrics", metricsRoute);
app.use("/api/setup-fees", setupFeesRoute);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const server = app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});
