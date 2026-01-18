# Security Implementation - Quick Start Guide

## ✅ All Security Features Implemented

Your chatbot now has enterprise-level security! Here's what was added:

### 1. CORS Protection
- Only whitelisted domains can access your API
- Prevents unauthorized websites from using your chatbot

### 2. Rate Limiting
- 100 requests per 15 minutes per IP
- 20 chat messages per minute per IP
- Prevents spam and abuse

### 3. Helmet Security Headers
- Protects against XSS, clickjacking, and other attacks

### 4. Bcrypt Password Hashing
- Admin passwords now securely hashed
- No more plaintext passwords

### 5. Input Validation & Sanitization
- All user inputs validated and sanitized
- Prevents injection attacks

### 6. API Key Authentication
- Widget access requires valid API key
- Track and control who uses your chatbot

### 7. Request Logging & Monitoring
- All requests logged to `server/logs/`
- Suspicious activity automatically detected and blocked

## 🚀 Setup Steps (Required)

### Step 1: Generate Admin Password Hash

```bash
node generate-password-hash.js YourSecurePassword123
```

Copy the hash and add to `.env`:
```bash
ADMIN_PASSWORD_HASH=your-bcrypt-hash-here
```

### Step 2: Generate API Key

```bash
node generate-token.js
```

Add to `.env`:
```bash
API_KEYS=your-api-key-here
```

### Step 3: Configure CORS

Add allowed domains to `.env`:
```bash
# For production (specific domains only)
ALLOWED_ORIGINS=https://clientwebsite.com,https://www.clientwebsite.com

# For development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5500

# Allow all (NOT recommended for production)
ALLOWED_ORIGINS=*
```

### Step 4: Update Client Widget Code

Clients need to add API key to their widget:

```html
<!-- Before the widget script -->
<script>
  window.chatbotConfig = {
    apiKey: 'client-api-key-here',
    business: 'ClientBusinessName'
  };
</script>
<script src="https://your-server.com/widget/widget.js"></script>
```

### Step 5: Test Everything

```bash
npm run start:dev
```

Test that:
- [ ] Admin panel still works with new password
- [ ] Widget works with API key
- [ ] CORS blocks unauthorized domains
- [ ] Rate limiting works (try spamming requests)

## 📋 Example .env File

```bash
# Security
ALLOWED_ORIGINS=http://localhost:3001,https://your-domain.com
API_KEYS=abc123def456,xyz789ghi012
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$abcdefghijklmnopqrstuvwxyz1234567890

# Services
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
PORT=3001
NODE_ENV=production
```

## 🔍 Monitoring Security

### Check Logs

View security events:
```bash
# Security events (blocked requests, suspicious activity)
cat server/logs/security.log

# Access logs (all API requests)
cat server/logs/access.log
```

### Common Issues

**CORS Error**: Add client domain to `ALLOWED_ORIGINS`
**401 Unauthorized**: Check API key is correct
**429 Too Many Requests**: Rate limit hit, wait or adjust limits

## 🎯 Security Score

**Before**: MEDIUM risk (basic protection only)  
**After**: HIGH security (enterprise-level protection)

### What's Protected Now:
✅ API access controlled by keys  
✅ Admin passwords encrypted  
✅ Cross-site attacks prevented  
✅ Rate limiting active  
✅ Input sanitized  
✅ Requests logged  
✅ Suspicious activity blocked  

### Still Recommend:
- Deploy with HTTPS (Render/Vercel handles this automatically)
- Rotate API keys periodically
- Monitor logs weekly
- Keep dependencies updated

## 📚 Full Documentation

See [SECURITY.md](SECURITY.md) for complete details.

## ⚡ Next Steps

1. Run password hash generator
2. Run API key generator  
3. Update .env file
4. Update client widget code
5. Test in development
6. Deploy to production

Your chatbot is now production-ready and secure! 🎉
