@echo off
echo =========================================================
echo 🚀 LANCEMENT DU TEST VISUEL EN LIVE DANS CHROME DEV
echo =========================================================
start "" "C:\Program Files\Google\Chrome Dev\Application\chrome.exe" --user-data-dir="C:\tmp\chrome_live_profile" --remote-debugging-port=9222 --start-maximized --new-window "http://localhost:3000"
timeout /t 2 /nobreak
node deep_visual_live_audit.cjs
