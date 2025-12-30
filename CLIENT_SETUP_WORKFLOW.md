# Complete Client Setup Workflow

## **STEP 1: Create Business Profile in VS Code**

**Create new profile file:**
- Navigate to `server/businessProfiles/`
- Create file: `ClientNameDemo.json`
- Copy from existing Demo profile (HenriDemo.json)
- Update these fields:
  - `businessName`: Client's business name
  - `logoUrl`: Client's logo URL
  - `primaryColor`: Brand color 1 (8-digit hex with `ff` at end)
  - `secondaryColor`: Brand color 2 (8-digit hex with `ff` at end)
  - `textColor`: Text color (8-digit hex with `ff` at end)
  - `phone`: Client's phone number
  - `openaiConfig.instructions`: Customize bot personality/instructions
  - Leave `stripePaymentLink` empty for now
  - Keep `isDemoMode: true`
  - Keep `demoMessageLimit: 40`

**Commit and push:**
```bash
git add server/businessProfiles/ClientNameDemo.json
git commit -m "Add ClientName business profile"
git push origin main
```
- Wait 2-3 minutes for Render to deploy

---

## **STEP 2: Set Up Stripe Payment Links**

**Create Monthly Payment Link:**
- Go to Stripe Dashboard → Payment Links → Create
- Product: "Chatbot Monthly Subscription"
- Price: $199/month
- **CRITICAL: Add metadata:**
  - Key: `businessName`
  - Value: `ClientName` (WITHOUT "Demo" suffix)
- Save payment link URL

**Create Yearly Payment Link:**
- Go to Stripe Dashboard → Payment Links → Create
- Product: "Chatbot Yearly Subscription"
- Price: $1,990/year
- Description: "Save 2 months - $199/month billed annually"
- **CRITICAL: Add metadata:**
  - Key: `businessName`
  - Value: `ClientName` (WITHOUT "Demo" suffix)
- Save payment link URL

---

## **STEP 3: Add Payment Links to Profile**

**Update profile file:**
- Open `server/businessProfiles/ClientNameDemo.json`
- Find `stripePaymentLink` section
- Add both URLs:
```json
"stripePaymentLink": {
  "monthly": "https://buy.stripe.com/xxxxx",
  "yearly": "https://buy.stripe.com/xxxxx"
}
```

**Commit and push:**
```bash
git add server/businessProfiles/ClientNameDemo.json
git commit -m "Add Stripe payment links for ClientName"
git push origin main
```

---

## **STEP 4: Verify Stripe Webhook (ONE-TIME SETUP)**

**Check webhook exists:**
- Stripe Dashboard → Developers → Webhooks
- Should see: `https://chatly-bot-1.onrender.com/api/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- **If missing:** Create webhook with these events and add `STRIPE_WEBHOOK_SECRET` to Render

---

## **STEP 5: Get Embed Code from Admin**

**Generate code:**
- Go to: `https://chatly-bot-1.onrender.com/admin/index.html`
- Click client's business button
- Copy embed code (includes test token automatically)

---

## **STEP 6: Send to Client**

**Send client this package:**

**Subject: Your Chatbot Setup**

```
Hi [Client],

Here's your chatbot embed code:

[PASTE EMBED CODE FROM ADMIN]

Instructions:
1. Add this code to your website where you want the chatbot
2. Test it - you'll see a demo with 40 free messages
3. Choose subscription:
   - Monthly: $199/month
   - Yearly: $1,990/year (save $390)
4. After payment, chatbot activates for all your website visitors

Payment Links:
- Monthly: [monthly link from Stripe]
- Yearly: [yearly link from Stripe]

Questions? Reply to this email.

Thanks,
[Your Name]
```

---

## **STEP 7: After Client Pays**

**Automatic activation:**
- Stripe webhook fires automatically
- Subscription saved to `server/data/subscriptions.json`
- Chatbot activates immediately for everyone
- **No manual steps required**

**Verify activation (optional):**
- Check Render logs for webhook event
- Open client's website - chatbot should work
- No demo limit, no subscription buttons

---

## **STRIPE METADATA RULES (CRITICAL)**

✅ **Correct:**
- Profile file: `HenriDemo.json`
- Stripe metadata: `businessName: "Henri"` (no "Demo")

❌ **Wrong:**
- Stripe metadata: `businessName: "HenriDemo"` (will fail to match)

---

## **QUICK REFERENCE**

**Admin URL:** `https://chatly-bot-1.onrender.com/admin/index.html`
**Stripe Dashboard:** `https://dashboard.stripe.com`
**Render Logs:** `https://dashboard.render.com`

**File naming:** `ClientNameDemo.json`
**Stripe metadata:** `ClientName` (no Demo)
**Test token:** Auto-generated per business
**Demo limit:** 40 messages
**Prices:** $199/month or $1,990/year

---

## **TROUBLESHOOTING**

**Widget shows "INACTIVE":**
- Check test token is in URL (should be auto-included from admin)
- Verify profile file exists in `server/businessProfiles/`
- Check Render deployed successfully

**Subscription not activating:**
- Verify Stripe metadata matches business name (without "Demo")
- Check webhook is firing (Stripe Dashboard → Developers → Webhooks → View logs)
- Check `server/data/subscriptions.json` for entry

**Demo limit not resetting:**
- Demo uses localStorage per browser
- Test in incognito mode for fresh count
- After subscription, demo limit is removed completely
