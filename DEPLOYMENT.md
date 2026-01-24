# 🚀 Deployment Guide - Data Persistence

## Important: Employee Data Persistence

Employee data, passwords, and PTO requests are stored in files that **persist across deployments**. These files are NOT tracked in Git and will NOT reset when you deploy.

### Files That Persist (Not in Git):
- ✅ `server/data/employees.json` - Employee accounts, usernames, passwords
- ✅ `server/data/hrSessions.json` - Active HR portal sessions
- ✅ `server/data/ptoRequests.json` - Time-off requests
- ✅ `server/data/contracts/` - Employee contract files

### How It Works:

1. **Template Files** (tracked in Git):
   - `server/data/employees.template.json` - Initial employee setup

2. **On First Deploy**:
   - Server checks if `employees.json` exists
   - If not, copies from `employees.template.json`
   - Creates empty files for sessions and requests

3. **On Subsequent Deploys**:
   - Existing data files are preserved
   - No reset to defaults
   - All employee changes, password updates, and new employees persist

### Render.io Configuration:

Render automatically persists files between deployments unless you use "Clear Build Cache". Your employee data is safe across normal deployments.

### What Happens When You:

**✅ Add a new employee through admin:**
- Saved to `employees.json` (persists)
- Won't be lost on next deploy

**✅ Change an employee password:**
- Updated in `employees.json` (persists)
- Won't reset to template password

**✅ Deploy code updates:**
- Employee data unchanged
- All accounts remain active

**⚠️ Clear Build Cache on Render:**
- May delete data files
- BACKUP `employees.json` first!

### Manual Backup (Recommended):

Download employee data before major changes:
```bash
# Via Render Shell
cat server/data/employees.json > backup.json
```

Or use Render's file browser to download the file.

### Restoring from Backup:

If data is lost, upload your backup:
1. Go to Render Dashboard → Shell
2. Upload backup file
3. Copy to correct location:
   ```bash
   cp backup.json server/data/employees.json
   ```

### First Time Setup:

The template file includes these default users:
- calvinstein / Henri2026Cal!
- sarahjensen / Sarah#Secure24
- larsnielsen / LarsPass!99
- emmachristensen / EmmaHR@2026
- mikkelhansen / Mikkel$Dev88

After first deploy, change these passwords through the admin panel. They will persist!

---

## Environment Variables (Always Required):

Set these in Render Dashboard → Environment:
- `OPENAI_API_KEY` - Your OpenAI API key
- `ELEVENLABS_API_KEY` - Your ElevenLabs API key
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret

These are NOT in Git for security and must be set manually.
