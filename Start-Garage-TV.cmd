@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js LTS from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)
node scripts/build.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
echo Open http://localhost:4173/garage-tv/ in Microsoft Edge.
echo Keep this window open while using Garage TV. Press Ctrl+C to stop.
node scripts/serve.mjs
pause
