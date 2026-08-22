@echo off
title Secure P2P Decentralized File Transfer
color 06

echo =====================================================================
echo  🚀 STARTING SECURE P2P FILE SHARING SYSTEM (100%% FREE & ZERO-CONFIG)
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting Unified Backend Server on port 8080...
start /b node backend/dist/server.js > server.log 2>&1
timeout /t 2 /nobreak > nul

echo [2/3] Starting High-Speed Cloudflare Global Public Tunnel...
start /b cloudflared.exe tunnel --url http://localhost:8080 > tunnel.log 2>&1
timeout /t 4 /nobreak > nul

echo [3/3] Opening P2P Cybernetic Web App in default browser...
start http://localhost:8080

echo.
echo =====================================================================
echo  ✅ SYSTEM IS LIVE AND RUNNING!
echo  📡 Local Web App: http://localhost:8080
echo  🌐 Check 'tunnel.log' or your terminal for the public Cloudflare URL
echo =====================================================================
echo.
echo Press any key to stop all background services...
pause > nul

taskkill /f /im node.exe > nul 2>&1
taskkill /f /im cloudflared.exe > nul 2>&1
echo Services stopped cleanly.
