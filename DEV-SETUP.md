# Development Environment Setup

## Server Stabilization Changes

This document describes the changes made to stabilize the local development environment and prevent crash/restart loops.

## Starting the Server

**There is now only ONE supported way to run the server locally:**

```bash
npm run start:dev
```

This will:
- Start the server on port **3001** (not 3000)
- Load environment variables from `.env`
- Validate required environment variables at startup
- Show a green checkmark with loaded configuration
- Run without auto-restart (no nodemon)

## What Was Changed

### 1. VS Code Tasks (`.vscode/tasks.json`)
- **Before**: Background task that auto-killed node processes and started server automatically
- **After**: Manual task that requires explicit execution via Terminal > Run Task
- **Result**: VS Code no longer auto-starts the server

### 2. Package.json Scripts
- **Before**: Multiple scripts (`dev`, `start`, `start:prod`) using nodemon for auto-restart
- **After**: Single manual script (`start:dev`) using plain node
- **Result**: No auto-restart on file changes, preventing multiple processes

### 3. start-server.bat
- **Before**: Active batch file that killed ALL node.exe processes system-wide
- **After**: Renamed to `start-server.bat.disabled`
- **Result**: No longer interferes with development

### 4. Server Port
- **Before**: Port 3000
- **After**: Port 3001
- **Result**: Avoids conflicts with other local services

### 5. Environment Variable Validation
- **Before**: dotenv loaded in config.js only
- **After**: Validation at server startup in app.js with clear error messages
- **Result**: Missing env vars are caught immediately with helpful error messages

## Server URLs

With the server running on port 3001:

- **Admin Panel**: http://localhost:3001/admin/index.html
  - Username: admin
  - Password: Redfox02

- **Henri Widget (Test Mode)**: http://localhost:3001/widget/index.html?business=HenriDemo&testMode=dzyjmz

- **Health Check**: http://localhost:3001/api/health

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Troubleshooting

### Multiple node processes running?

Check how many are running:
```powershell
Get-Process node -ErrorAction SilentlyContinue | Select-Object Id,ProcessName
```

Kill all node processes:
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

Then restart with `npm run start:dev`.

### Port 3001 already in use?

Kill the process using that port:
```powershell
netstat -ano | findstr :3001
Stop-Process -Id <PID> -Force
```

### Environment variable errors?

Make sure your `.env` file contains:
```
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
PORT=3001
```

## What NOT to Do

- ❌ Don't use `start-server.bat` (it's disabled)
- ❌ Don't run multiple start commands simultaneously
- ❌ Don't use the old VS Code "Start Server" task as a background task
- ❌ Don't manually kill node processes unless troubleshooting

## Benefits

✅ **Single process**: Only one server instance runs at a time
✅ **Manual control**: You decide when to start/stop the server
✅ **Clear startup**: See exactly what's loaded and on which port
✅ **No conflicts**: Port 3001 avoids common conflicts
✅ **Safe env loading**: Errors are caught immediately with clear messages
✅ **No auto-restart**: File changes don't trigger unexpected restarts
