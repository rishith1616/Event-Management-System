@echo off
title PES EventFlow - NFR-01 Flash Sale 50 Buyers Concurrency Test
cd /d "%~dp0"
echo ======================================================================
echo Running NFR-01 Flash Sale Concurrency Test (50 Simultaneous Buyers)...
echo Database: mongodb://localhost:27017/event-management
echo ======================================================================
node --test tests/loadPerformance.test.js
echo.
echo ======================================================================
echo Test Complete! Check Organizer Dashboard to download the manifest.
echo ======================================================================
pause
