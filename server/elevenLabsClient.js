import axios from "axios";
import { config } from "./config.js";

const ELEVEN_BASE = "https://api.elevenlabs.io/v1";

export async function textToSpeech(text, voiceId) {
  if (!config.elevenLabsApiKey) {
    throw new Error("ELEVENLABS_API_KEY not set");
  }

  const id = voiceId || "your-default-voice-id";

  const res = await axios.post(
    `${ELEVEN_BASE}/text-to-speech/${id}`,
    {
      text,
      model_id: "eleven_turbo_v2"
    },
    {
      headers: {
        "xi-api-key": config.elevenLabsApiKey,
        "Content-Type": "application/json"
      },
      responseType: "arraybuffer"
    }
  );

  return res.data;
}
