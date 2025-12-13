import { classifyIntent } from "./intent.js";
import { getSession, updateSession } from "./state.js";
import { handleSalesTurn } from "./salesFlow.js";
import { handleSupportTurn } from "./supportFlow.js";
import { chatCompletion } from "../openaiClient.js";
import fs from "fs";
import path from "path";
import { BUSINESS_PROFILE } from "../config.js";

function loadBusinessProfile() {
  const filePath = path.resolve(`server/businessProfiles/${BUSINESS_PROFILE}.json`);
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

const business = loadBusinessProfile();

const systemPrompt = `
You are Chatly, the AI assistant for ${business.businessName}.

Business description:
${business.description}

Locations:
${business.locations.map(loc => `- ${loc.name} (${loc.address}) - Map: ${loc.mapUrl}`).join("\n")}

Services:
${business.services.map(s => `- ${s.name} (${s.price} ${business.currency || 'kr'})`).join("\n")}

Hours:
${Object.entries(business.hours).map(([day, hours]) => `${day}: ${hours}`).join("\n")}

FAQs:
${business.faq.map(f => `Q: ${f.question} | A: ${f.answer}`).join("\n")}

Always answer using ONLY this business's information.

IMPORTANT: When listing services, always format them as bullet points, one per line:
- Service Name (price kr)

BOOKING: When a customer wants to book an appointment, provide this booking link: https://henri.planway.com/?new_design=1
Tell them they can select their preferred location, service, and time directly on the booking page.

LANGUAGE: Respond in {{LANGUAGE}}. If {{LANGUAGE}} is 'da', respond in Danish. If {{LANGUAGE}} is 'en', respond in English.
`;

export async function handleChat({ sessionId, message, language = 'en' }) {
  const session = getSession(sessionId);

  const intent = await classifyIntent(message);

  let reply;
  if (intent === "SALES") {
    reply = await handleSalesTurn(session, message, language);
  } else if (intent === "SUPPORT") {
    reply = await handleSupportTurn(session, message, language);
  } else {
    const languageName = language === 'da' ? 'Danish' : 'English';
    const promptWithLanguage = systemPrompt.replace(/{{LANGUAGE}}/g, languageName);
    
    const system = {
      role: "system",
      content: promptWithLanguage
    };
    const messages = [system, ...session.history, { role: "user", content: message }];
    reply = await chatCompletion(messages);
  }

  const newHistory = [
    ...session.history,
    { role: "user", content: message },
    { role: "assistant", content: reply.content }
  ];

  updateSession(sessionId, { history: newHistory, lastIntent: intent });

  return {
    intent,
    reply: reply.content
  };
}
