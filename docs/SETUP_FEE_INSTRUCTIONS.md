# Setup Fee Implementation - Instructions

## **Overview**
Clients pay a **$169 one-time setup fee** before receiving their demo chatbot. Payment is tracked automatically via webhook, and you manually create their profile after payment.

---

## **Stripe Payment Link Setup**

### **Step 1: Create Setup Fee Product**
1. Go to Stripe Dashboard → Products → Create Product
2. Product Name: "Chatbot Setup & Build"
3. Description: "One-time setup fee for custom chatbot configuration"
4. Price: **$169.00** (one-time payment)
5. Save product

### **Step 2: Create Payment Link**
1. Go to Payment Links → Create Payment Link
2. Select "Chatbot Setup & Build" product
3. **CRITICAL: Add Metadata Field**
   - Click "Add metadata"
   - Key: `businessName`
   - Value: (Leave empty - client fills this)
   - Make it **customer-editable**
4. **Collect Additional Information:**
   - Email address: ✅ Required
   - Phone number: Optional
5. Success Message: "Setup fee paid! We'll contact you within 24 hours with your demo chatbot."
6. Save payment link

### **Step 3: Copy Payment Link URL**
Example: `https://buy.stripe.com/test_xxxxxxxxxxxxx`

---

## **Client Workflow**

### **What Client Does:**
1. Receives payment link from you
2. Fills in:
   - Business Name (in metadata field)
   - Email address
   - Payment details
3. Pays $169 setup fee
4. Receives confirmation

### **What You Do:**
1. Get notification in Admin Panel → Setup Fees tab
2. See client's:
   - Business Name
   - Email
   - Payment date
   - Status: "⚠ Pending"
3. Create business profile manually in VS Code:
   - `server/businessProfiles/[BusinessName]Demo.json`
4. Generate embed code in admin panel
5. Email embed code to client
6. (Optional) Mark as "Profile Created" in admin

---

## **Admin Panel - Setup Fees Tab**

**Location:** Admin Panel → Setup Fees Tab

**Shows:**
- Business Name
- Email
- Amount ($169)
- Date paid
- Status: Pending or Profile Created

**Table View:**
```
Business Name    | Email               | Amount  | Date           | Status
----------------|---------------------|---------|----------------|------------------
Hair Salon XYZ  | owner@salon.com     | $169    | Dec 30, 2:15pm | ⚠ Pending
Cafe Coffee     | info@cafe.com       | $169    | Dec 29, 4:30pm | ✓ Profile Created
```

---

## **Technical Details**

### **Webhook Events Handled:**
- `checkout.session.completed` (mode: 'payment')
  - Saves to `server/data/setupFees.json`
  - Records: businessName, email, customerId, amount, date

### **Files Created:**
- `server/routes/setupFees.js` - API endpoint
- `server/data/setupFees.json` - Payment records
- Updated `server/routes/stripeWebhook.js` - Webhook handler
- Updated `admin/index.html` - Setup Fees tab

### **API Endpoints:**
- `GET /api/setup-fees` - List all payments
- `POST /api/setup-fees/mark-created` - Mark profile created (optional)

---

## **Next Steps After Payment**

### **1. Verify Payment**
- Check Admin Panel → Setup Fees tab
- Confirm businessName and email received

### **2. Create Business Profile**
```bash
# In VS Code terminal:
cd server/businessProfiles
# Copy from existing Demo profile
cp HenriDemo.json [ClientName]Demo.json
```

### **3. Edit Profile**
Update in `[ClientName]Demo.json`:
- `businessName`
- `logoUrl`
- `primaryColor`, `secondaryColor`, `textColor`
- `phone`, `bookingUrl`, `websiteUrl`
- `openaiConfig.instructions`
- `stripePaymentLink` (add monthly/yearly subscription links)

### **4. Commit and Push**
```bash
git add server/businessProfiles/[ClientName]Demo.json
git commit -m "Add [ClientName] business profile"
git push origin main
```

Wait 2-3 minutes for Render deployment.

### **5. Generate Embed Code**
- Go to Admin Panel
- Click new business button
- Copy embed code (includes test token)

### **6. Email Client**
```
Subject: Your Chatbot Demo is Ready!

Hi [Client],

Your chatbot demo is ready! Here's your embed code:

[PASTE EMBED CODE]

Instructions:
1. Add this code to your website
2. Test it (40 free messages included)
3. When ready, subscribe:
   - Monthly: $199/month
   - Yearly: $1,990/year (save $390)

After subscribing, the chatbot activates for all visitors.

Questions? Reply to this email.

Best,
[Your Name]
```

---

## **Troubleshooting**

**Payment not showing in admin:**
- Check Stripe Dashboard → Webhooks → Event logs
- Verify webhook is active: `https://chatly-bot-1.onrender.com/api/stripe-webhook`
- Check metadata was filled: `businessName` field

**Wrong business name:**
- Client can't edit after payment
- You'll need to manually note the correct name
- Create profile with correct name

**Payment refund:**
- Issue refund in Stripe Dashboard
- Payment stays in setupFees.json (for records)
- Don't create profile

---

## **Payment Link Template for Clients**

```
Hi [Client Name],

To get started with your custom AI chatbot, there's a one-time setup fee of $169.

This includes:
✓ Custom branding (logo, colors)
✓ Pre-configured with your services and prices
✓ 40 free demo messages to test
✓ Full setup and configuration
✓ Embed code ready to use

Pay here: [STRIPE PAYMENT LINK]

When paying, please enter your exact business name in the form.

After payment, I'll have your demo chatbot ready within 24 hours!

Best,
[Your Name]
```

---

## **Quick Reference**

**Setup Fee:** $169 (one-time)
**Subscription:** $199/month or $1,990/year
**Delivery Time:** Within 24 hours of payment
**Admin Panel:** `/admin/index.html` → Setup Fees tab
**Webhook:** `/api/stripe-webhook`
**Records:** `server/data/setupFees.json`
