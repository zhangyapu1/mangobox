@echo off
chcp 65001 >nul
title MangoBox
echo ========================================
echo            MangoBox - TVBox PC
echo ========================================
echo.
echo Cleaning up old processes...
echo.

cd /d "%~dp0"

:: Kill any existing node/electron processes from previous runs
taskkill /f /im electron.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

:: Clear old build cache
if exist "dist-electron" rmdir /s /q "dist-electron"

:: Check if dependencies are installed
if not exist "node_modules" (
    echo First run, installing dependencies...
    call npm install
    echo.
)

echo Starting MangoBox...
echo.

call npm run dev

pause
