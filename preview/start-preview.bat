@echo off
cd /d "%~dp0"
echo Installing deps (first run only)...
call npm install
echo.
echo Starting Playbook iPhone preview...
echo When it says ready, open:  http://localhost:5174/?skip=1
echo.
call npm run dev -- --host 127.0.0.1 --port 5174
pause
