# Hybrid Sales + Support Chatbot

## Setup

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
