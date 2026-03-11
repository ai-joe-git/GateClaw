@echo off
call %~dp0stop.bat
timeout /t 2 /nobreak >nul
call %~dp0start.bat
echo GateClaw restarted.
