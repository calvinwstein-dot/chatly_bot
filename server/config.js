import dotenv from "dotenv";
dotenv.config();

export const BUSINESS_PROFILE = "Henri"; // change per client

export const config = {
  port: process.env.PORT || 3001,
  openaiApiKey: process.env.OPENAI_API_KEY,
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || null,
  defaultModel: process.env.OPENAI_MODEL || "gpt-4o-mini",

  widget: {
    brandName: "Chappy",
    primaryColor: "#2e7584ff",
    secondaryColor: "#0f4476ff",
    textColor: "#050604ff",
    bubbleShape: "rounded-xl",
    logoUrl: "/public/logos/chappy-logo.png"
  }
};
