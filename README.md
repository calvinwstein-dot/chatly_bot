# Hybrid Sales + Support Chatbot

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/calvinwstein-dot/chatly_bot)

## Setup

### Option 1: Cloud Development with Gitpod (Recommended for Quick Start)

Click the "Open in Gitpod" badge above to start a fully configured cloud development environment with all dependencies pre-installed.

After the workspace opens:
1. Update the `.env` file with your API keys (OPENAI_API_KEY is required)
2. Start the server: `npm run start:dev`
3. Access the widget at the provided Gitpod URL on port 3001

### Option 2: Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your keys.

3. Run in development:
   ```bash
   npm run dev
   ```

4. Open: `http://localhost:3000/widget` in your browser.

## Embed Widget

On any site:

```html
<script>
  window.CHATBOT_API_BASE = "https://your-service-url";
</script>
<iframe src="https://your-service-url/widget" style="border:none;width:0;height:0;"></iframe>
```
