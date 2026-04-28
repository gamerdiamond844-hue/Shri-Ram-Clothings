@echo off
echo ========================================
echo   SHRI RAM CLOTHINGS - Starting Servers
echo ========================================

echo.
echo [1/2] Starting Backend...
start "SRC Backend" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend...
start "SRC Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo  Backend  : http://localhost:5000
echo  Frontend : http://localhost:5173
echo  Admin    : http://localhost:5173/admin
echo ========================================
echo.
pause
