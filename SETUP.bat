@echo off
echo ========================================
echo   SHRI RAM CLOTHINGS - Installing Deps
echo ========================================

echo.
echo [1/2] Installing Backend dependencies...
cd /d %~dp0backend
call npm install

echo.
echo [2/2] Installing Frontend dependencies...
cd /d %~dp0frontend
call npm install

echo.
echo ========================================
echo  Setup complete! Run START.bat to launch
echo ========================================
echo.
echo IMPORTANT: Create admin account by running:
echo   cd backend
echo   node createAdmin.js
echo.
pause
