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

export async function handleSalesTurn(session, userMessage, language = 'en') {
  const languageName = language === 'da' ? 'Danish' : 'English';
  const promptWithLanguage = systemPrompt.replace(/{{LANGUAGE}}/g, languageName);
  
  const system = {
    role: "system",
    content: promptWithLanguage + "\n\nYou are helping with sales inquiries. Answer questions about services, pricing, and help book appointments."
  };

  const messages = [system, ...session.history, { role: "user", content: userMessage }];
  return await chatCompletion(messages);
}
