# AeroGuard AI — PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       AeroGuard AI — Full-Stack Launcher" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptPath'; & .\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "Starting Next.js Frontend on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptPath\frontend'; npm run dev"

Write-Host "`nBoth servers started successfully!" -ForegroundColor Cyan
Write-Host "Backend API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "Frontend App:     http://localhost:3000" -ForegroundColor Yellow
