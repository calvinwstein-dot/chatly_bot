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

Services:
${business.services.map(s => `- ${s.name} ($${s.price})`).join("\n")}

Hours:
${Object.entries(business.hours).map(([day, hours]) => `${day}: ${hours}`).join("\n")}

FAQs:
${business.faq.map(f => `Q: ${f.question} | A: ${f.answer}`).join("\n")}

Always answer using ONLY this business's information.
`;

export async function handleSupportTurn(session, userMessage) {
  const system = {
    role: "system",
    content: systemPrompt + "\n\nYou are helping with customer support. Answer questions and provide helpful assistance."
  };

  const messages = [system, ...session.history, { role: "user", content: userMessage }];
  return await chatCompletion(messages);
}
