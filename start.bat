@echo off
cd /d %~dp0packages\gateclaw-orchestrator
start "GateClaw" bun run src/index.ts
echo GateClaw started.