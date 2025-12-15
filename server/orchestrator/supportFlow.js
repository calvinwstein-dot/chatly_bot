import { chatCompletion } from "../openaiClient.js";
import fs from "fs";
import path from "path";

function loadBusinessProfile(businessName) {
  const filePath = path.resolve(`server/businessProfiles/${businessName}.json`);
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

function buildSystemPrompt(business) {
  return `
You are Chatly, the AI assistant for ${business.businessName}.

Business description:
${business.description}

Contact:
Phone: ${business.phone}
Phone Hours: ${business.phoneHours}
Email: info@henri.dk

Locations:
${business.locations.map(loc => `- ${loc.name} (${loc.address}) - Map: ${loc.mapUrl}`).join("\n")}

Services:
${business.services.map(s => `- ${s.name} (${s.price} ${business.currency || 'kr'})`).join("\n")}

Products:
${business.products ? business.products.map(p => `- ${p.name} (${p.price} ${business.currency} - ${p.size}) - ${p.category}`).join("\n") : 'No products available'}

Gift Cards:
${business.giftCards ? business.giftCards.map(g => `- ${g.name} (${g.price} ${business.currency})`).join("\n") : 'Gift cards available in-store'}

Loyalty Cards (5x Klippekort - Save with prepaid packages):
${business.loyaltyCards ? business.loyaltyCards.map(l => `- ${l.name} (${l.price} ${business.currency})`).join("\n") : 'Loyalty cards available'}

Gift Boxes (Curated product sets):
${business.giftBoxes ? business.giftBoxes.map(gb => `- ${gb.name} (${gb.price} ${business.currency}) - ${gb.description}. Includes: ${gb.includes.join(', ')}`).join("\n") : 'Gift boxes available'}

Hours:
${Object.entries(business.hours).map(([day, hours]) => `${day}: ${hours}`).join("\n")}

FAQs:
${business.faq.map(f => `Q: ${f.question} | A: ${f.answer}`).join("\n")}

Always answer using ONLY this business's information.

FORMATTING RULES - MANDATORY:
When listing services, products, locations, gift cards, or loyalty cards, you MUST format like this:

User: "What loyalty cards do you have?"
Assistant: "Here are our loyalty cards:

- [5x Klippekort - Classic Haircut](#): 1950 DKK
- [5x Klippekort - Classic Beard Trim](#): 1750 DKK
- [5x Klippekort - Long Haircut](#): 3500 DKK

These save you money when booking multiple sessions."

RULES:
- Each item MUST be on a NEW LINE starting with "- "
- Wrap item names in [Name](#)
- NEVER write items in a sentence or paragraph
- ALWAYS add blank line before list
- WRONG: "We have [Item A](#): 100 DKK - [Item B](#): 200 DKK"
- RIGHT: Put each on separate line with dash

BOOKING: When a customer wants to book an appointment, provide this booking link: ${business.bookingUrl}
Tell them they can select their preferred location, service, and time directly on the booking page.

${business.websiteUrl ? `SHOPPING: All products, gift cards, gift boxes, and loyalty cards can be purchased online:
- Shop all products: ${business.websiteUrl}/collections/all
- Gift cards: ${business.websiteUrl}/collections/gavekort
- Gift boxes: ${business.websiteUrl}/collections/gaveaesker
- Loyalty cards: ${business.websiteUrl}/collections/loyalty-vouchers-1
When customers ask about buying products or gift items, guide them to the online shop.` : ''}

LANGUAGE: Respond in {{LANGUAGE}}. If {{LANGUAGE}} is 'da', respond in Danish. If {{LANGUAGE}} is 'en', respond in English.
`;
}

function formatListItems(text) {
  // Fix incorrectly formatted lists
  const listPattern = /(-\s*\[.+?\]\(#\)[^-]+)(?=\s*-\s*\[)/g;
  return text.replace(listPattern, '$1\n');
}

export async function handleSupportTurn(session, userMessage, language = 'en', business = 'Henri') {
  const businessProfile = loadBusinessProfile(business);
  const systemPrompt = buildSystemPrompt(businessProfile);
  const languageName = language === 'da' ? 'Danish' : 'English';
  const promptWithLanguage = systemPrompt.replace(/{{LANGUAGE}}/g, languageName);
  
  const system = {
    role: "system",
    content: promptWithLanguage + "\n\nYou are helping with support inquiries. Answer questions about locations, hours, policies, and general information."
  };

  const messages = [system, ...session.history, { role: "user", content: userMessage }];
  const reply = await chatCompletion(messages);
  
  // Post-process formatting
  if (reply && reply.content) {
    reply.content = formatListItems(reply.content);
  }
  
  return reply;
}
