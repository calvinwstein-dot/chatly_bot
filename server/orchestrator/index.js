import { classifyIntent } from "./intent.js";
import { getSession, updateSession } from "./state.js";
import { handleSalesTurn } from "./salesFlow.js";
import { handleSupportTurn } from "./supportFlow.js";
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
You are ${business.businessName}'s AI assistant.

Business description:
${business.description}

${business.importantPolicies ? 'IMPORTANT POLICIES:\n' + business.importantPolicies.map(p => '- ' + p).join('\n') + '\n' : ''}
Contact:
Phone: ${business.phone || 'Available in store'}
Phone Hours: ${business.phoneHours || 'See hours below'}
${business.email ? 'Email: ' + business.email : ''}

Locations:
${business.locations.map(loc => `- ${loc.name} (${loc.address}) - Map: ${loc.mapUrl}`).join("\n")}

Services:
${business.services.map(s => `- ${s.name} (${s.price} ${business.currency || 'kr'})`).join("\n")}

Products:
${business.products ? business.products.map(p => {
  const imageInfo = p.imageUrl ? ` IMAGE:${p.imageUrl}` : '';
  return `- ${p.name} (${p.price} ${business.currency} - ${p.size}) - ${p.category}${imageInfo}`;
}).join("\n") : 'No products available'}

Gift Cards:
${business.giftCards ? business.giftCards.map(g => `- ${g.name} (${g.price} ${business.currency})`).join("\n") : 'Gift cards available in-store'}

Loyalty Cards (5x Klippekort - Save with prepaid packages):
${business.loyaltyCards ? business.loyaltyCards.map(l => `- ${l.name} (${l.price} ${business.currency})`).join("\n") : 'Loyalty cards available'}

${business.giftBoxes ? `Gift Boxes (Curated product sets):
${business.giftBoxes.map(gb => {
  const imageInfo = gb.imageUrl ? ` IMAGE:${gb.imageUrl}` : '';
  return `- ${gb.name} (${gb.price} ${business.currency}) - ${gb.description}. Includes: ${gb.includes.join(', ')}${imageInfo}`;
}).join("\n")}

` : ''}Hours:
${Object.entries(business.hours).map(([day, hours]) => `${day}: ${hours}`).join("\n")}

FAQs:
${business.faq.map(f => `Q: ${f.question} | A: ${f.answer}`).join("\n")}

Always answer using ONLY this business's information.

CRITICAL: PRODUCT IMAGES - YOU MUST ALWAYS SHOW IMAGES
Whenever you mention a product or gift box that has "IMAGE:" in the data above, you MUST include the image.
Use this exact markdown format: ![Product Name](imageUrl)

Place the image on a new line after mentioning the product.

FORMATTING RULES - MANDATORY:
When listing services, products, locations, gift cards, or loyalty cards, you MUST format like this:

User: "What loyalty cards do you have?"
Assistant: "Here are our loyalty cards:

- [5x Klippekort - Classic Haircut](#): 1950 DKK
- [5x Klippekort - Classic Beard Trim](#): 1750 DKK
- [5x Klippekort - Long Haircut](#): 3500 DKK

These save you money when booking multiple sessions."

PRODUCT IMAGES:
When mentioning a product or gift box that has an IMAGE: tag in the data, you MUST include the image using markdown format: ![Product Name](imageUrl)
Place the image on a new line after mentioning the product.

Example:
User: "Show me Texture Clay Pomade"
Assistant: "Here's the [Texture Clay Pomade](#):
![Texture Clay Pomade](/public/products/henri/texture-clay-pomade.webp)

This pomade costs 199 DKK (60 ml) and provides strong hold with a matte finish."

RULES:
- Each item MUST be on a NEW LINE starting with "- "
- Wrap item names in [Name](#)
- NEVER write items in a sentence or paragraph
- ALWAYS add blank line before list
- Include product images when available
- WRONG: "We have [Item A](#): 100 DKK - [Item B](#): 200 DKK"
- RIGHT: Put each on separate line with dash

BOOKING: When a customer wants to book an appointment, provide this booking link: ${business.bookingUrl}
Tell them they can select their preferred location, service, and time directly on the booking page.
${business.websiteUrl ? '\n\nSHOPPING: All products, gift cards, gift boxes, and loyalty cards can be purchased online:\n- Shop all products: ' + business.websiteUrl + '/collections/all\n- Gift cards: ' + business.websiteUrl + '/collections/gavekort\n- Gift boxes: ' + business.websiteUrl + '/collections/gaveaesker\n- Loyalty cards: ' + business.websiteUrl + '/collections/loyalty-vouchers-1\nWhen customers ask about buying products or gift items, guide them to the online shop.' : ''}

${business.openaiConfig?.instructions ? 'BEHAVIOR & TONE INSTRUCTIONS:\n' + business.openaiConfig.instructions + '\n\n' : ''}LANGUAGE: Respond in {{LANGUAGE}}. If {{LANGUAGE}} is 'da', respond in Danish. If {{LANGUAGE}} is 'en', respond in English.
`;
}

function formatListItems(text) {
  // Fix incorrectly formatted lists: "- [Item A](#): price - [Item B](#): price"
  // Convert to proper multi-line format
  const listPattern = /(-\s*\[.+?\]\(#\)[^-]+)(?=\s*-\s*\[)/g;
  return text.replace(listPattern, '$1\n');
}

export async function handleChat({ sessionId, message, language = 'en', business = 'Henri' }) {
  const session = getSession(sessionId);
  const businessProfile = loadBusinessProfile(business);
  const systemPrompt = buildSystemPrompt(businessProfile);

  const intent = await classifyIntent(message);

  let reply;
  if (intent === "SALES") {
    reply = await handleSalesTurn(session, message, language, business);
  } else if (intent === "SUPPORT") {
    reply = await handleSupportTurn(session, message, language, business);
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

  // Post-process to ensure proper formatting
  if (reply && reply.content) {
    reply.content = formatListItems(reply.content);
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
