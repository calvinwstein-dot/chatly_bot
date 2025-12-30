# Admin Panel Security Setup

## Overview
Your admin panel is now protected with password authentication. Users must log in at `/admin/login.html` before accessing `/admin/index.html`.

## Setup Instructions

### 1. Set Admin Password in Render

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your service (chatly-bot-1)
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   - **Key:** `ADMIN_PASSWORD`
   - **Value:** Your secure password (e.g., a strong random password)
6. Click **Save Changes**
7. Render will automatically redeploy with the new environment variable

### 2. Default Password (Development Only)

If `ADMIN_PASSWORD` environment variable is not set, the system uses the default password:
```
admin123
```

⚠️ **IMPORTANT:** Always set a custom `ADMIN_PASSWORD` in production!

## How It Works

### Login Flow
1. User visits `/admin/index.html`
2. System checks for valid token in `localStorage`
3. If no token, redirects to `/admin/login.html`
4. User enters password
5. Password validated against `ADMIN_PASSWORD` environment variable
6. On success: generates secure 64-character hex token
7. Token stored in browser's `localStorage`
8. User redirected to `/admin/index.html`

### Token Security
- Token generated using `crypto.randomBytes(32)` (cryptographically secure)
- Token expires after 24 hours
- Token stored in-memory on server (cleared on server restart)
- Logout removes token from both client and server

### Protected Endpoints
- `/api/admin/login` - Validates password, returns token
- `/api/admin/verify` - Checks if token is valid
- `/api/admin/logout` - Invalidates token

## Usage

### Logging In
1. Go to: `https://chatly-bot-1.onrender.com/admin/login.html`
2. Enter your admin password
3. Click "Login"
4. You'll be redirected to the admin panel

### Logging Out
- Click the "🚪 Logout" button in the top-right corner of the admin panel
- You'll be redirected back to the login page
- Token will be invalidated

## Security Recommendations

1. **Use a Strong Password**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, and symbols
   - Don't use dictionary words
   - Example generator: https://passwordsgenerator.net/

2. **Rotate Password Regularly**
   - Update `ADMIN_PASSWORD` environment variable every 3-6 months
   - All existing sessions will be invalidated on server restart

3. **Never Share Credentials**
   - Each admin should have their own password
   - (For future: implement multi-user auth if needed)

4. **Monitor Access**
   - Check server logs for failed login attempts
   - Watch for unusual access patterns

## Testing Locally

1. Set environment variable:
   ```bash
   $env:ADMIN_PASSWORD = "your_test_password"
   ```

2. Start server:
   ```bash
   npm start
   ```

3. Visit: `http://localhost:3000/admin/login.html`

4. Enter your test password

## Troubleshooting

### "Invalid password" on correct password
- Check if `ADMIN_PASSWORD` is set correctly in Render
- Ensure no extra spaces in the environment variable value
- Try redeploying after setting the variable

### Redirected to login after successful login
- Check browser console for errors
- Verify token is stored: Open DevTools → Application → Local Storage → check for `adminToken`
- Try clearing browser cache and localStorage

### Token expired message
- Tokens expire after 24 hours
- Server restart clears all tokens (in-memory storage)
- Simply log in again

## Files Modified

1. **server/app.js** - Registered `/api/admin` route
2. **server/routes/adminAuth.js** - NEW: Authentication endpoints
3. **admin/login.html** - NEW: Login page
4. **admin/index.html** - Added auth check and logout button

## Next Steps (Optional Enhancements)

1. Add rate limiting to prevent brute force attacks
2. Implement multi-user authentication with database
3. Add 2FA (two-factor authentication)
4. Log all admin actions for audit trail
5. Add password reset functionality
6. Protect metrics API endpoints with same auth
