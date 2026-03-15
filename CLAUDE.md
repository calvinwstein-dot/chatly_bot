# CLAUDE.md — Project Intelligence

## Project Overview
Multi-tenant SaaS chatbot platform ("Chappy") that provides embeddable AI chat widgets for small businesses. Currently targeting barbershops/salons (primary client: HENRI barbershop in Copenhagen). Each client gets a customizable widget with AI chat, optional voice responses, and a subscription billing flow via Stripe.

## Tech Stack
- **Runtime:** Node.js with Express, ES modules (`"type": "module"`)
- **AI:** OpenAI GPT-4o-mini for chat, ElevenLabs for voice synthesis
- **Payments:** Stripe (webhooks, payment links, customer portal)
- **Auth:** Supabase (JWT auth, role-based access via `app_metadata.role`)
- **Deployment:** Render at `https://chatly-bot-1.onrender.com`
- **Dev:** nodemon, port 3001

## Key Commands
```bash
npm run start:dev     # Local dev with nodemon
npm run start         # Production start
git push origin main  # Auto-deploys to Render
```

## Architecture

### Server (`server/app.js`)
Single Express server serving all routes, static files, admin UI, and widget assets. Entry point validates env vars then mounts routes.

### Routes (`server/routes/`)
| Route | Purpose |
|-------|---------|
| `chat.js` | Main AI chat endpoint, handles conversations per session |
| `widgetConfig.js` | Serves widget configuration (colors, voice, domains) |
| `businessConfig.js` | CRUD for business profiles from admin |
| `subscriptions.js` | Stripe subscription status |
| `stripeWebhook.js` | Stripe webhook handler (checkout, subscription events) |
| `setupFees.js` | One-time setup fee tracking |
| `metrics.js` | Click/message analytics per business |
| `voice.js` | ElevenLabs text-to-speech endpoint |
| `voiceUsage.js` | Voice minutes tracking |
| `employees.js` | HR employee CRUD |
| `hrAuth.js` | HR portal authentication |
| `ptoRequests.js` | PTO request management |
| `adminAuth.js` | Admin authentication |
| `debug.js` | Debug endpoints |

### Orchestrator (`server/orchestrator/`)
Intent classification and conversation flow management:
- `intent.js` — Classifies user messages into intents
- `salesFlow.js` — Handles sales/pricing conversations (has null safety guards)
- `supportFlow.js` — Handles support conversations (has null safety guards)
- `state.js` — Session state management
- `index.js` — Orchestrator entry point

### Profiles
- **External** (`server/businessProfiles/`): HenriDemo, ChappyBot, BlondeSpecialistCPHDemo
- **Internal** (`server/internalProfiles/`): Henri, HenriHR, TestWidget
- Each profile is a JSON file with: business info, colors, launcher style, voice config, Stripe links, AI instructions, allowed domains

### Widget (`widget/`)
- `widget.js` — Embeddable chat widget (client-side JS), auto-detects domain
- `index.html` — Widget test page
- `styles.css` — Widget styles
- `hr-portal.html` / `hr-test.html` — HR portal interfaces
- Domain whitelisting: blocks unauthorized domains, skips check for localhost, test tokens, and `chatly-bot-1.onrender.com`

### Admin (`admin/`)
- `index.html` — Main admin dashboard (Midnight dark theme, ~990 lines)
  - Dark zinc backgrounds (#09090b), electric blue glow on cards/panels
  - Clean SVG icons in sidebar (no emojis), nav items scale on hover
  - Sections: Combined Status, Business Config (with live widget preview), Metrics, Setup Fees, Subscriptions, Setup Guide, Testing Links, Embed Code
  - Internal widget management with separate dropdown
  - All JS handles API calls, color pickers, launcher preview, embed code generation
- `index-old-backup.html` — Previous peach-themed design (backup)
- `option-a.html` — Copy of current Midnight design (reference)
- `login.html` — Admin login page

### Middleware (`server/middleware/`)
- `auth.js` — Admin authentication middleware
- `apiKeyAuth.js` — API key authentication
- `logging.js` — Request logging and suspicious activity detection

### Data (`server/data/`)
- `employees.json` — Employee records
- `hrSessions.json` — HR portal sessions
- `ptoRequests.json` — PTO requests
- `setupFees.json` — Setup fee payment records
- `voiceUsage.json` — Voice minutes usage
- Template files (`*.template.json`) for first-deploy initialization

## Critical Patterns

### Color Handling
Colors stored with `ff` alpha suffix (e.g. `#2e7584ff`). When loading into color pickers, strip with `.replace(/ff$/, '').substring(0, 7)`. When saving, append `ff` back.

### API Base Detection
Admin and widget JS auto-detect environment:
```js
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : 'https://chatly-bot-1.onrender.com';
```

### Domain Whitelisting
`widget.js` checks `config.allowedDomains` array. Skips check for: localhost, 127.0.0.1, 192.168.*, test tokens (`testMode` param), and `chatly-bot-1.onrender.com` (own hosting domain).

### Profile Loading
`profileLoader.js` loads from both `businessProfiles/` and `internalProfiles/` directories. Internal profiles have `"internal": true` flag.

### Subscription Flow
1. Client gets demo widget (limited messages via `demoMessageLimit`)
2. Setup fee paid via Stripe payment link
3. Monthly/yearly subscription activated
4. Webhook updates `subscriptions.json`
5. Widget checks subscription status — shows inactive overlay if expired

## Environment Variables
```
OPENAI_API_KEY=         # Required
ELEVENLABS_API_KEY=     # Optional, for voice
STRIPE_SECRET_KEY=      # Stripe API key
STRIPE_WEBHOOK_SECRET=  # Stripe webhook signing secret
NODE_ENV=               # production or development
PORT=                   # Default 3001
ADMIN_PASSWORD_HASH=    # bcrypt hash for admin login
HR_PASSWORD_HASH=       # bcrypt hash for HR portal
```

## Common Gotchas
- Server uses ES modules — all imports use `import`, not `require`
- CORS allows PATCH method and X-HR-Session header (recently fixed)
- `req.socket` not `req.connection` (deprecated API fixed)
- Admin page is a single HTML file with inline CSS + JS — no build step
- Render auto-deploys on `git push origin main`
- `.env` file is NOT committed — Render has its own env vars
- `initializeData.js` creates data files from templates on first deploy
- HR sessions expire after 8 hours
- The admin page at `/admin` serves `admin/index.html` via Express static
