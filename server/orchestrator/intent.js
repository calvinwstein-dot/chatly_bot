import { chatCompletion } from "../openaiClient.js";

export async function classifyIntent(userMessage) {
  const system = {
    role: "system",
    content: `You are an intent classifier for a website chatbot.
Decide if the user wants SALES, SUPPORT, or OTHER.
Return only one word: "SALES", "SUPPORT", or "OTHER".`
  };

  const user = {
    role: "user",
    content: userMessage
  };

  const result = await chatCompletion([system, user], { temperature: 0 });
  const label = (result.content || "").toUpperCase();

  if (label.includes("SALES")) return "SALES";
  if (label.includes("SUPPORT")) return "SUPPORT";
  return "OTHER";
}
