import dotenv from "dotenv";
dotenv.config();

// Validate environment variables before proceeding
const requiredEnvVars = ['OPENAI_API_KEY'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.error('Please check your .env file');
  process.exit(1);
}

console.log('✅ Environment loaded:', {
  port: process.env.PORT || 3001,
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  hasOpenAIKey: !!process.env.OPENAI_API_KEY,
  hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY
});

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Error handlers MUST be first - before any imports that might throw
process.on("unhandledRejection", (err) => {
  console.error("🔴 UNHANDLED REJECTION:", err);
  // Don't exit - log and continue
});

process.on("uncaughtException", (err) => {
  console.error("🔴 UNCAUGHT EXCEPTION:", err);
  // Don't exit - log and continue
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
