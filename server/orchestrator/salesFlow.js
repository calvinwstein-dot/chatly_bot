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
${business.locations.map(loc => `- ${loc}`).join("\n")}

Services:
${business.services.map(s => `- ${s.name} (${s.price} ${business.currency || 'kr'})`).join("\n")}

Hours:
${Object.entries(business.hours).map(([day, hours]) => `${day}: ${hours}`).join("\n")}

FAQs:
${business.faq.map(f => `Q: ${f.question} | A: ${f.answer}`).join("\n")}

Always answer using ONLY this business's information.

IMPORTANT: When listing services, always format them as bullet points, one per line:
- Service Name (price kr)

BOOKING: When a customer wants to book an appointment:
1. First collect: First Name, Last Name, Email, Phone Number
2. Ask one question at a time and wait for each answer
3. Once you have all 4 details, provide this personalized booking link:
https://henri.planway.com/?new_design=1&name=[FirstName]&lastname=[LastName]&email=[Email]&phone=[Phone]
4. Replace the bracketed values with their actual information
5. Tell them their details will be pre-filled and they just need to select their location, service, and time.
`;

export async function handleSalesTurn(session, userMessage) {
  const system = {
    role: "system",
    content: systemPrompt + "\n\nYou are helping with sales inquiries. Answer questions about services, pricing, and help book appointments."
  };

  const messages = [system, ...session.history, { role: "user", content: userMessage }];
  return await chatCompletion(messages);
}
