@echo off
title Sentinel CCTV Intelligence Platform - Launcher
echo ======================================================================
echo    SENTINEL CCTV INTELLIGENCE PLATFORM - GUJARAT HACKATHON
echo ======================================================================
echo.
echo [1/3] Verifying Python Environment & Backend...
set PYTHONPATH=backend

start "Sentinel Backend Server" cmd /k "cd /d %~dp0 && set PYTHONPATH=backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Starting Frontend Dashboard Server...
start "Sentinel Frontend Dashboard" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [3/3] Opening Dashboard in browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173
start http://localhost:8000/docs

echo.
echo ======================================================================
echo Backend running at:  http://localhost:8000
echo Swagger API docs at: http://localhost:8000/docs
echo System Health at:    http://localhost:8000/health
echo Frontend UI at:      http://localhost:5173
echo ======================================================================
echo.
pause
