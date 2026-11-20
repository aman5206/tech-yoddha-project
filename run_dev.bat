@echo off
echo ========================================================
echo        AeroGuard AI — Full-Stack Launcher
echo ========================================================
echo Starting FastAPI Backend (Port 8000)...
start "AeroGuard AI - Backend" cmd /k "cd /d %~dp0 && .venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Next.js Frontend (Port 3000)...
start "AeroGuard AI - Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo Both servers are launching!
echo Backend:  http://localhost:8000 (Docs: http://localhost:8000/docs)
echo Frontend: http://localhost:3000
echo ========================================================
