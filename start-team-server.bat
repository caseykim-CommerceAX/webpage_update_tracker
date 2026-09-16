@echo off
setlocal
cd /d "%~dp0"

where node.exe >nul 2>nul
if errorlevel 1 (
    echo Node.js was not found. Install Node.js 24 or newer first.
    pause
    exit /b 1
)

if not exist node_modules\ (
    echo Installing dependencies...
    call npm.cmd install
    if errorlevel 1 goto :failed
)

if not exist .env if exist .env.example copy /Y .env.example .env >nul

echo Preparing the local database...
call npm.cmd run db:setup
if errorlevel 1 goto :failed

echo Building the production server...
call npm.cmd run build
if errorlevel 1 goto :failed

node scripts\show-team-urls.mjs 3000
echo Keep this window open while your team uses the dashboard.
echo Press Ctrl+C to stop the server.
echo.
call npm.cmd run start
if errorlevel 1 goto :failed
exit /b 0

:failed
echo.
echo The team server could not be started.
pause
exit /b 1
