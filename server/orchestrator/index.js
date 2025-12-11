import { classifyIntent } from "./intent.js";
import { getSession, updateSession } from "./state.js";
import { handleSalesTurn } from "./salesFlow.js";
import { handleSupportTurn } from "./supportFlow.js";
import { chatCompletion } from "../openaiClient.js";

export async function handleChat({ sessionId, message }) {
  const session = getSession(sessionId);

  const intent = await classifyIntent(message);

  let reply;
  if (intent === "SALES") {
    reply = await handleSalesTurn(session, message);
  } else if (intent === "SUPPORT") {
    reply = await handleSupportTurn(session, message);
  } else {
    const system = {
      role: "system",
      content: "You are Chatly assistant, a helpful assistant for this website. Be brief and polite."
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
