import express from "express";
import { handleChat } from "../orchestrator/index.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId and message required" });
    }

    const result = await handleChat({ sessionId, message });
    res.json(result);
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
