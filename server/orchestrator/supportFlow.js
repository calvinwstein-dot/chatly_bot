import { chatCompletion } from "../openaiClient.js";

export async function handleSupportTurn(session, userMessage) {
  const system = {
    role: "system",
    content: `You are Chatly assistant, a customer support assistant.
Ask clarifying questions, give steps, or escalate politely.`
  };

  const messages = [system, ...session.history, { role: "user", content: userMessage }];
  return await chatCompletion(messages);
}
