@echo off
REM GateClaw Windows Startup Service
REM Place this file in: C:\ProgramData\GateClaw\gateclaw-service.bat
REM Or add to Task Scheduler for auto-start on login

setlocal enabledelayedelayedexpansion

REM Configuration
set GATECLAW_HOME=C:\opt\GateClaw
set BUN_PATH=C:\Users\%USERNAME%\.bun\bun.exe
set LOG_FILE=C:\Users\%USERNAME%\.config\gateclaw\gateclaw.log
set PID_FILE=C:\Users\%USERNAME%\.config\gateclaw\daemon.pid

REM Ensure directories exist
if not exist "%GATECLAW_HOME%" mkdir "%GATECLAW_HOME%"
if not exist "%USERPROFILE%\.config\gateclaw" mkdir "%USERPROFILE%\.config\gateclaw"
if not exist "%USERPROFILE%\.local\share\gateclaw" mkdir "%USERPROFILE%\.local\share\gateclaw"

REM Check if already running
if exist "%PID_FILE%" (
    set /p PID=<"%PID_FILE%"
    tasklist /FI "PID eq %PID%" /NH 2>nul | findstr %PID% >nul
    if not errorlevel 1 (
        echo GateClaw already running (pid %PID%)
        exit /b 0
    )
    del /f "%PID_FILE%" 2>nul
)

REM Start GateClaw daemon
echo Starting GateClaw daemon...
start /B "%BUN_PATH%" run "%GATECLAW_HOME%\src\index.ts"
timeout /t 2 /nobreak >nul

REM Capture PID
for /f "tokens=2" %%p in ('wmic process where "name='bun.exe'" get ProcessId /value ^| find "="') do (
    set PID=%%p
    goto :got_pid
)

:got_pid
if defined PID (
    echo %PID% > "%PID_FILE%"
    echo GateClaw started (pid %PID%)
    echo Logs: %LOG_FILE%
) else (
    echo Failed to capture PID
    exit /b 1
)

REM Tail logs if requested
if "%1"=="logs" (
    echo Tailing logs (Ctrl+C to stop)
    type +F "%LOG_FILE%"
)

exit /b 0
