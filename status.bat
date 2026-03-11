@echo off
netstat -ano | findstr :7371
if errorlevel 1 (
  echo GateClaw is NOT running.
) else (
  echo GateClaw is running on port 7371.
)
