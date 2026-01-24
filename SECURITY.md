# Security Configuration Guide

## Environment Variables Setup

Add these security-related variables to your `.env` file:

### Required Security Variables

```bash
# CORS - Allowed domains (comma-separated)
# Use * to allow all (NOT recommended for production)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# API Keys - For widget authentication (comma-separated)
# Generate secure keys with: node scripts/generate-token.js
API_KEYS=your-secure-api-key-here,another-key-for-client-2

# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=your-bcrypt-hash-here

# Existing Variables
OPENAI_API_KEY=your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key
OPENAI_MODEL=gpt-4o-mini
PORT=3001
```

## Setup Instructions

### 1. Generate Admin Password Hash

Run this command to generate a secure password hash:

```bash
node generate-password-hash.js YourSecurePassword123
```

Copy the hash to your `.env` file as `ADMIN_PASSWORD_HASH`.

### 2. Generate API Keys

Generate secure API keys for widget authentication:

```bash
node scripts/generate-token.js
```

Add the generated key to your `.env` file as `API_KEYS`.

### 3. Configure CORS

Set `ALLOWED_ORIGINS` to the domains where your widget will be embedded:

```bash
# Production example
ALLOWED_ORIGINS=https://clientsite.com,https://www.clientsite.com

# Development example
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Allow all (NOT recommended for production)
ALLOWED_ORIGINS=*
```

### 4. Update Widget Code

Your clients need to include the API key in their widget configuration:

```html
<script>
  window.chatbotConfig = {
    apiKey: 'your-api-key-here',  // <- Add this
    business: 'ClientName'
  };
</script>
<script src="https://your-server.com/widget/widget.js"></script>
```

## Security Features Implemented

✅ **CORS Restrictions** - Only specified domains can access the API  
✅ **Rate Limiting** - Prevents spam and abuse (100 requests/15min, 20 chat messages/min)  
✅ **Helmet Security Headers** - Protects against common web vulnerabilities  
✅ **Bcrypt Password Hashing** - Admin passwords securely hashed  
✅ **Input Validation** - All user inputs sanitized and validated  
✅ **API Key Authentication** - Widget access requires valid API key  
✅ **Request Logging** - All requests logged for monitoring  
✅ **Suspicious Activity Detection** - Blocks common attack patterns  

## Security Logs

Logs are stored in `server/logs/`:
- `access.log` - All API requests
- `security.log` - Security events and blocked requests

## Production Deployment Checklist

- [ ] Set strong `ADMIN_PASSWORD_HASH` (not default)
- [ ] Configure specific `ALLOWED_ORIGINS` (not `*`)
- [ ] Generate unique `API_KEYS` for each client
- [ ] Enable HTTPS on your server (use Render, Vercel, etc.)
- [ ] Review security logs regularly
- [ ] Keep dependencies updated (`npm audit fix`)
- [ ] Set `NODE_ENV=production` in deployment

## Additional Security Recommendations

1. **Use HTTPS Only** - Deploy on platforms that enforce HTTPS (Render, Vercel, AWS)
2. **Monitor Logs** - Check `server/logs/` regularly for suspicious activity
3. **Rotate API Keys** - Change keys periodically, especially if compromised
4. **Backup Data** - Regular backups of subscriptions and business profiles
5. **Update Dependencies** - Run `npm audit fix` regularly

## Troubleshooting

### CORS Errors
If you see CORS errors, ensure the client domain is in `ALLOWED_ORIGINS`.

### API Key Issues
- Ensure `X-API-Key` header is sent with requests
- Verify the key matches one in your `API_KEYS` environment variable

### Rate Limiting
If hitting rate limits, adjust values in `server/app.js`:
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // Time window
  max: 100,                   // Max requests
});
```
