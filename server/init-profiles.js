import fs from 'fs';
import path from 'path';

// Default business profile template
const defaultProfile = {
  "businessName": "Demo Business",
  "primaryColor": "#2563eb",
  "secondaryColor": "#0f172a",
  "textColor": "#111827",
  "launcherColor": "#2563eb",
  "headerColor": "#2563eb",
  "userBubbleColor": "#2563eb",
  "userTextColor": "#ffffff",
  "botBubbleColor": "#e5e7eb",
  "botTextColor": "#1f2937",
  "widgetBgColor": "#f9fafb",
  "borderColor": "#e5e7eb",
  "sendButtonColor": "#2563eb",
  "sendButtonTextColor": "#ffffff",
  "logoUrl": "",
  "phone": "",
  "email": "",
  "phoneHours": "",
  "websiteUrl": "",
  "bookingUrl": "",
  "currency": "USD",
  "description": "",
  "launcherStyle": "message",
  "launcherShape": "pill",
  "launcherText": "Talk to us",
  "sendButtonText": "Send",
  "sendButtonIcon": "arrow",
  "primaryLanguage": "en",
  "secondaryLanguage": "da",
  "voiceEnabled": false,
  "elevenLabsVoiceId": "",
  "voiceMinutesLimit": 0,
  "subscriptionTier": "free",
  "isDemoMode": true,
  "demoMessageLimit": 40,
  "openaiConfig": {
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "instructions": "You are a helpful assistant."
  },
  "stripePaymentLink": {
    "basic": "",
    "pro": "",
    "enterprise": ""
  },
  "subscriptionPrices": {
    "basic": { "monthly": 0, "yearly": 0 },
    "pro": { "monthly": 0, "yearly": 0 },
    "enterprise": { "monthly": 0, "yearly": 0 }
  }
};

// Initialize directories and files
const profilesDir = path.resolve('server/businessProfiles');
const dataDir = path.resolve('server/data');
const logsDir = path.resolve('server/logs');

// Create directories if they don't exist
[profilesDir, dataDir, logsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Created directory: ${dir}`);
  }
});

// Initialize default data files if they don't exist
const setupFeesPath = path.join(dataDir, 'setupFees.json');
if (!fs.existsSync(setupFeesPath)) {
  fs.writeFileSync(setupFeesPath, JSON.stringify({}, null, 2));
  console.log('✓ Created setupFees.json');
}

const voiceUsagePath = path.join(dataDir, 'voiceUsage.json');
if (!fs.existsSync(voiceUsagePath)) {
  fs.writeFileSync(voiceUsagePath, JSON.stringify({}, null, 2));
  console.log('✓ Created voiceUsage.json');
}

const accessLogPath = path.join(logsDir, 'access.log');
if (!fs.existsSync(accessLogPath)) {
  fs.writeFileSync(accessLogPath, '');
  console.log('✓ Created access.log');
}

console.log('✓ Initialization complete');
