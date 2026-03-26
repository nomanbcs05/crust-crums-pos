@echo off
cd /d "%~dp0"
echo Starting POS Application with Trusted Types fixes...
npx vite --port 8080
pause
