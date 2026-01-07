@echo off
cd /d "%~dp0"
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *" 2>nul
timeout /t 2 /nobreak >nul
node server/app.js
pause
