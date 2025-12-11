import OpenAI from "openai";
import { config } from "./config.js";

if (!config.openaiApiKey) {
  throw new Error("Missing OPENAI_API_KEY in environment");
}

export const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

export async function chatCompletion(messages, options = {}) {
  const response = await openai.chat.completions.create({
    model: config.defaultModel,
    messages,
    temperature: options.temperature ?? 0.4
  });

  return response.choices[0].message;
}
