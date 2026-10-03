@echo off
title SAATHI AI - Local Server
color 0b
echo ========================================================
echo                 STARTING SAATHI AI SERVER
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Checking dependencies...
if not exist "node_modules\" (
    echo node_modules folder not found. Installing packages...
    call npm install
)

echo [2/2] Launching SAATHI AI Web Server...
start "" node server.js
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================================
echo   SAATHI AI is now hosted locally at http://localhost:3000
echo ========================================================
timeout /t 3 >nul
exit
