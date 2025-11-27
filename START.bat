@echo off
REM Quick Start Script for Medicare Web - Backend + Frontend

echo.
echo ============================================
echo   MEDICARE WEB - QUICK START
echo ============================================
echo.

REM Kill any running Python processes
echo Cleaning up old processes...
taskkill /F /IM python.exe 2>nul
timeout /T 1 /nobreak >nul

REM Start Backend
echo.
echo [1/2] Starting Backend Server...
echo.
cd /d "C:\Users\PREDATOR\Downloads\Medicare\Backend"
start cmd /k "title=Medicare Backend & python app.py"

REM Wait for backend to start
timeout /T 3 /nobreak >nul

REM Start Frontend
echo.
echo [2/2] Starting Frontend Dev Server...
echo.
cd /d "C:\Users\PREDATOR\Downloads\Medicare\Frontend_React"
start cmd /k "title=Medicare Frontend & npm run dev"

echo.
echo ============================================
echo   SERVERS STARTED!
echo ============================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000
echo.
echo Two new terminals should have opened.
echo.
pause
