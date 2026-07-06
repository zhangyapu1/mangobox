@echo off
chcp 65001 >nul
title MangoBox
echo ========================================
echo            MangoBox - TVBox PC
echo ========================================
echo.
echo Starting MangoBox...
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo First run, installing dependencies...
    call npm install
    echo.
)

:: Clear old build cache
if exist "dist-electron" rmdir /s /q "dist-electron"

call npm run dev

pause
