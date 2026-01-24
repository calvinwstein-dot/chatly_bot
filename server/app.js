import dotenv from "dotenv";
dotenv.config();

// Initialize data files from templates (for first deploy)
import './initializeData.js';

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
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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
import { optionalApiKeyAuth } from "./middleware/apiKeyAuth.js";
import { requestLogger, detectSuspiciousActivity } from "./middleware/logging.js";
import chatRoute from "./routes/chat.js";
import widgetConfigRoute from "./routes/widgetConfig.js";
import debugRoute from "./routes/debug.js";
import businessConfigRoute from "./routes/businessConfig.js";
import subscriptionsRoute from "./routes/subscriptions.js";
import metricsRoute from "./routes/metrics.js";
import setupFeesRoute from "./routes/setupFees.js";
import voiceUsageRoute from "./routes/voiceUsage.js";
import voiceRoute from "./routes/voice.js";
import employeesRoute from "./routes/employees.js";
import hrAuthRoute from "./routes/hrAuth.js";
import ptoRequestsRoute from "./routes/ptoRequests.js";

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for widget
  crossOriginEmbedderPolicy: false, // Allow embedding in iframes
  crossOriginResourcePolicy: false // Allow cross-origin script loading
}));

// Add headers to allow widget script to load on any domain
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// CORS configuration - allow all origins for embeddable widget
// This is standard for widget platforms (Intercom, Drift, etc.)
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// Stricter rate limiting for chat endpoint
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: 'Too many messages, please slow down.'
});

app.use('/api/chat', chatLimiter);

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

// Request logging and security monitoring
app.use(requestLogger);
app.use(detectSuspiciousActivity);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set UTF-8 charset for HTML files
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
  }
  next();
});

// Static widget
app.use("/widget", express.static(path.join(__dirname, "../widget")));
app.use("/admin", adminAuth, express.static(path.join(__dirname, "../admin")));
app.use("/public", express.static(path.join(__dirname, "../public")));

// API routes
app.use("/api/chat", optionalApiKeyAuth, chatRoute);
app.use("/api/widget-config", optionalApiKeyAuth, widgetConfigRoute);
app.use("/api/debug", debugRoute);
app.use("/api/business-config", businessConfigRoute);
app.use("/api/subscriptions", subscriptionsRoute);
app.use("/api/metrics", metricsRoute);
app.use("/api/setup-fees", setupFeesRoute);
app.use("/api/voice-usage", voiceUsageRoute);
app.use("/api/voice", voiceRoute);
app.use("/api/employees", employeesRoute);
app.use("/api/hr-auth", hrAuthRoute);
app.use("/api/pto-request", ptoRequestsRoute);

// Log iframe embedding attempts
app.post("/api/log-iframe-attempt", (req, res) => {
  const { business, domain } = req.body;
  console.log(`⚠️  IFRAME ATTEMPT: Business "${business}" testing URL embedded on: ${domain}`);
  res.json({ logged: true });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const server = app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  // Don't exit - log and continue
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Please free the port or change PORT in .env`);
  }
});
