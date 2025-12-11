import { chatCompletion } from "../openaiClient.js";

export async function handleSalesTurn(session, userMessage) {
  const system = {
    role: "system",
    content: `You are Chatly assistant, a sales assistant.
Goal: qualify the lead and collect:
- Name
- Email
- Company
- Budget
- Timeline
Ask one question at a time.`
  };

  const messages = [system, ...session.history, { role: "user", content: userMessage }];
  return await chatCompletion(messages);
}
