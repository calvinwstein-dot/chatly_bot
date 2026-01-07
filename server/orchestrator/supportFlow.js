import { chatCompletion } from "../openaiClient.js";
import { loadBusinessProfile } from "../utils/businessProfile.js";

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

╔══════════════════════════════════════════════════════════════╗
║  🚨 CRITICAL: YOU MUST SHOW PRODUCT IMAGES - NON-NEGOTIABLE ║
╚══════════════════════════════════════════════════════════════╝

WHEN TO SHOW IMAGES (ALWAYS - NO EXCEPTIONS):
1. When user asks "what products do you have?"
2. When user asks about specific products
3. When user asks "show me your products"
4. When recommending products
5. When mentioning ANY product that has "IMAGE:" in the data
6. When discussing gift boxes

HOW TO SHOW IMAGES:
- Extract the imageUrl from the IMAGE: tag
- Use EXACT markdown format: ![Product Name](imageUrl)
- Place image on NEW LINE immediately after mentioning product
- NEVER skip images - they are REQUIRED

EXAMPLE - Showing Products:
User: "What products do you recommend?"
Assistant: "Here are our popular styling products:

- [Texture Clay Pomade](#): 199 DKK (60 ml)
![Texture Clay Pomade](/public/products/henri/texture-clay-pomade.webp)

- [Advanced Forming Cream](#): 199 DKK (60 ml)
![Advanced Forming Cream](/public/products/henri/advanced-forming-cream.webp)

Both are excellent for daily styling!"

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
${business.websiteUrl ? '\n\nSHOPPING: All products, gift cards, gift boxes, and loyalty cards can be purchased online:\n- Shop all products: ' + business.websiteUrl + '/collections/all\n- Gift cards: ' + business.websiteUrl + '/collections/gavekort\n- Gift boxes: ' + business.websiteUrl + '/collections/gaveaesker\n- Loyalty cards: ' + business.websiteUrl + '/collections/loyalty-vouchers-1\nWhen customers ask about buying products or gift items, guide them to the online shop.' : ''}

${business.openaiConfig?.instructions ? 'BEHAVIOR & TONE INSTRUCTIONS:\n' + business.openaiConfig.instructions + '\n\n' : ''}LANGUAGE: Respond in {{LANGUAGE}}. If {{LANGUAGE}} is 'da', respond in Danish. If {{LANGUAGE}} is 'en', respond in English.
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
