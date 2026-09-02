# Sentinel CCTV Intelligence Platform - PowerShell Launcher
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   SENTINEL CCTV INTELLIGENCE PLATFORM - GUJARAT HACKATHON" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/3] Starting Backend Server on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootPath'; `$env:PYTHONPATH='backend'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "[2/3] Starting Frontend Dashboard on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootPath\frontend'; npm run dev"

Start-Sleep -Seconds 3
Write-Host "[3/3] Launching web browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"
Start-Process "http://localhost:8000/docs"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "Backend API:      http://localhost:8000" -ForegroundColor White
Write-Host "Swagger Docs:     http://localhost:8000/docs" -ForegroundColor White
Write-Host "System Health:    http://localhost:8000/health" -ForegroundColor White
Write-Host "Frontend UI:      http://localhost:5173" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Green
