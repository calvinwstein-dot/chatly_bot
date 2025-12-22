import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "./config.js";
import chatRoute from "./routes/chat.js";
import widgetConfigRoute from "./routes/widgetConfig.js";
import debugRoute from "./routes/debug.js";
import businessConfigRoute from "./routes/businessConfig.js";

const app = express();

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static widget
app.use("/widget", express.static(path.join(__dirname, "../widget")));
app.use("/admin", express.static(path.join(__dirname, "../admin")));
app.use("/public", express.static(path.join(__dirname, "../public")));

// API routes
app.use("/api/chat", chatRoute);
app.use("/api/widget-config", widgetConfigRoute);
app.use("/api/debug", debugRoute);
app.use("/api/business-config", businessConfigRoute);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(config.port, () => {
// Stripe webhook route (load dynamically to avoid startup crash)
try {
  const { default: stripeWebhookRoute } = await import("./routes/stripeWebhook.js");
  app.use("/api/stripe-webhook", express.raw({ type: 'application/json' }), stripeWebhookRoute);
  console.log("Stripe webhook loaded successfully");
} catch (error) {
  console.error("Failed to load Stripe webhook (disabled):", error.message);
}

  console.log(`Server listening on port ${config.port}`);
});
