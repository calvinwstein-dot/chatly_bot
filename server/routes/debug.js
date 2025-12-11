import express from "express";
import { config } from "../config.js";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

router.get("/", (req, res) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  res.json({
    message: "Debug Info",
    serverRunningFrom: __dirname,
    currentConfig: config,
    env: {
      PORT: process.env.PORT,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
      OPENAI_API_KEY_LOADED: !!process.env.OPENAI_API_KEY
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
