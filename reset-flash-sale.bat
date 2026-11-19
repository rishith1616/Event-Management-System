@echo off
title PES EventFlow - Reset Flash Sale Concurrency State
cd /d "%~dp0\server"
echo ======================================================================
echo Resetting Flash Sale Concurrency State for Live Demo...
echo Database: mongodb://localhost:27017/event-management
echo ======================================================================
node scripts/resetFlashSale.js
echo.
pause
