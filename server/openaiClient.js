import OpenAI from "openai";
import { config, BUSINESS_PROFILE } from "./config.js";
import fs from "fs";
import path from "path";

function loadBusinessProfile() {
  const filePath = path.resolve(`server/businessProfiles/${BUSINESS_PROFILE}.json`);
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

const businessData = loadBusinessProfile();

const systemPrompt = `
You are Chappy, an AI assistant representing the business: ${businessData.businessName}.
Here is the business information you must use to answer questions:

Description: ${businessData.description}

Services:
${businessData.services.map(s => `- ${s.name}: $${s.price}`).join("\n")}

Hours:
${Object.entries(businessData.hours).map(([day, hrs]) => `${day}: ${hrs}`).join("\n")}

FAQ:
${businessData.faq.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n")}
`;

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
