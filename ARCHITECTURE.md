# GateClaw Architecture - Current State

> **Last Updated:** March 2026 | **Version:** 0.2.0-beta

## Overview

GateClaw is a **resident AI entity** with persistent memory, soul identity, and multi-interface access (Telegram, TUI, CLI, HTTP API).

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER MACHINE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    GATECLAW MONOREPO                         │   │
│  │                                                               │   │
│  │  ┌─────────────────┐    ┌─────────────────────────────────┐│   │
│  │  │  gateclaw-      │    │        opencode (FORK)           ││   │
│  │  │  orchestrator   │    │                                 ││   │
│  │  │                 │    │  • TUI (Terminal UI)           ││   │
│  │  │  • Daemon :7371 │    │  • Web UI (Browser)            ││   │
│  │  │  • Telegram Bot │    │  • Session Management          ││   │
│  │  │  • CLI Commands │    │  • Model Picker                ││   │
│  │  │  • Memory/Facts │    │                                 ││   │
│  │  │                 │    │  • OpenCode Server :4100       ││   │
│  │  └────────┬────────┘    └────────────────┬──────────────────┘│   │
│  │           │                               │                  │   │
│  │           │        Uses SDK              │                  │   │
│  │           └──────────────────────────────┘                  │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                    │                                 │
│                                    ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    LLAMA-SWAP (:8888)                       │   │
│  │                  Proxy/Multiplexer                          │   │
│  │                                                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │   │
│  │  │ OmniCoder-9B │  │ whisper-large│  │   pocket-tts      │ │   │
│  │  │              │  │ -v3-turbo   │  │                  │ │   │
│  │  │  :10001      │  │   :7372     │  │    :8000         │ │   │
│  │  │  (LLM)      │  │   (STT)     │  │    (TTS)         │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Ports & Services

| Port   | Service          | Purpose                         | Started By      |
| ------ | ---------------- | ------------------------------- | --------------- |
| 4100   | OpenCode Server  | LLM sessions, AI processing     | gateclaw daemon |
| 4200   | OpenCode (alt)   | Forked OpenCode (if needed)     | gateclaw daemon |
| 7371   | GateClaw Daemon  | HTTP API, Telegram bot, memory  | gateclaw daemon |
| 7372   | Whisper STT      | Speech-to-text (via llama-swap) | llama-swap      |
| 8000   | Pocket-TTS       | Text-to-speech (via llama-swap) | llama-swap      |
| 8888   | Llama-Swap       | Proxy for STT/TTS/LLM           | User manual     |
| 10001+ | LLMs (llama.cpp) | Local inference servers         | llama-swap      |

## Key Files & Locations

### Configuration Files

| File                  | Path                                     | Purpose                 |
| --------------------- | ---------------------------------------- | ----------------------- |
| GateClaw config       | `%APPDATA%/gateclaw/gateclaw.jsonc`      | AI providers, models    |
| Environment variables | `%APPDATA%/gateclaw/.env`                | Telegram, API URLs      |
| Soul identity         | `%APPDATA%/gateclaw/SOUL.md`             | AI personality          |
| Memory database       | `%APPDATA%/gateclaw/memory.db`           | Facts, messages         |
| Daemon PID            | `%APPDATA%/gateclaw/daemon.pid`          | Running daemon process  |
| OpenCode PID          | `%APPDATA%/gateclaw/opencode-server.pid` | OpenCode server process |

### Source Code

| Component       | Location                                                        | Key Files                 |
| --------------- | --------------------------------------------------------------- | ------------------------- |
| Daemon entry    | `packages/gateclaw-orchestrator/src/index.ts`                   | Starts OpenCode, Telegram |
| Daemon routes   | `packages/gateclaw-orchestrator/src/server.ts`                  | HTTP API endpoints        |
| Telegram bot    | `packages/gateclaw-orchestrator/src/telegram-bot/`              | Bot commands, handlers    |
| Telegram config | `packages/gateclaw-orchestrator/src/telegram-bot/config.ts`     | API URLs, models          |
| OpenCode fork   | `packages/opencode/`                                            | TUI, Web UI, session mgmt |
| STT client      | `packages/gateclaw-orchestrator/src/telegram-bot/stt/client.ts` | Whisper integration       |
| TTS client      | `packages/gateclaw-orchestrator/src/telegram-bot/tts/client.ts` | TTS integration           |

## Environment Variables (.env)

```env
# Telegram Configuration
GATECLAW_TELEGRAM_TOKEN="your-bot-token"
GATECLAW_TELEGRAM_CHAT_ID="your-chat-id"

# AI Model
GATECLAW_MODEL="gpt-oss-20b"
GATECLAW_DIRECTORY="C:\\Path\\to\\GateClaw"

# OpenCode (SDK)
OPENCODE_API_URL=http://localhost:4100
OPENCODE_SERVER_USERNAME=gateclaw

# Voice Services (via llama-swap proxy)
STT_API_URL=http://localhost:8888
TTS_API_URL=http://localhost:8888
STT_API_KEY=

# Models for voice services
STT_MODEL=whisper-large-v3-turbo
TTS_MODEL=pocket-tts
```

## Critical Configuration Details

### STT/TTS via Llama-Swap

Llama-swap acts as a proxy that routes different service types:

- **STT (Speech-to-Text)**: `localhost:8888` → routes to `whisper-large-v3-turbo` → `localhost:7372`
- **TTS (Text-to-Speech)**: `localhost:8888` → routes to `pocket-tts` → `localhost:8000`

The bot sends requests to `localhost:8888` which then proxies to the appropriate backend.

### OpenCode API URL

**CRITICAL**: The Telegram bot uses `OPENCODE_API_URL` to connect to OpenCode Server. This MUST be `http://localhost:4100` (the OpenCode server), NOT `7371` (the daemon).

The daemon (7371) provides the Telegram bot interface and memory management, but actual LLM sessions are handled by OpenCode Server (4100) via the SDK.

## Startup Sequence

1. `gateclaw start` - CLI starts daemon
2. Daemon (`src/index.ts`):
   - Loads `.env` for configuration
   - Spawns OpenCode server on port 4100
   - Auto-starts Telegram bot after 3 seconds
3. User connects to Telegram and interacts

## Common Issues & Solutions

| Symptom                           | Cause                        | Fix                                        |
| --------------------------------- | ---------------------------- | ------------------------------------------ |
| "Error creating session: 404"     | Wrong OPENCODE_API_URL       | Set to `http://localhost:4100`             |
| "could not find suitable handler" | Wrong model name for STT/TTS | Use `whisper-large-v3-turbo`, `pocket-tts` |
| TTS returns "Unsupported format"  | Wrong audio format           | Use `wav` not `mp3`                        |
| STT not connecting                | Llama-swap not running       | Start llama-swap on port 8888              |

## Files NOT Rolled Back by Git Revert

The following files are stored outside the repository and will NOT be reverted by a Git rollback:

- `%APPDATA%/gateclaw/.env` - Environment variables
- `%APPDATA%/gateclaw/gateclaw.jsonc` - Provider configuration
- `%APPDATA%/gateclaw/SOUL.md` - Soul identity
- `%APPDATA%/gateclaw/memory.db` - SQLite memory database

If you experience issues after a Git revert, check these files first.

## Dependencies (External)

| Service     | Purpose       | Location                                       | Required By   |
| ----------- | ------------- | ---------------------------------------------- | ------------- |
| llama-swap  | Proxy/router  | `%USERPROFILE%/Desktop/llamaCPP/llama-swap/`   | STT, TTS, LLM |
| whisper.cpp | STT backend   | `%USERPROFILE%/Desktop/whispercpp/`            | llama-swap    |
| pocket-tts  | TTS backend   | `%USERPROFILE%/Desktop/Sandbox/PocketTTS.cpp/` | llama-swap    |
| llama.cpp   | LLM inference | `%USERPROFILE%/Desktop/llamaCPP/build/`        | llama-swap    |

## Documentation Files

| File                              | Purpose                              | Status          |
| --------------------------------- | ------------------------------------ | --------------- |
| `README.md`                       | Main documentation                   | ✅ Valid        |
| `AGENTS.md`                       | Development guidelines for AI agents | ✅ Valid        |
| `GateClaw-Telegram-Debugging.md`  | Telegram integration debugging       | ⚠️ Needs update |
| `VOICE_IMPLEMENTATION_CONTEXT.md` | Voice implementation notes           | ❌ Obsolete     |
| `.gateclaw/SOUL.md`               | Soul identity (runtime generated)    | N/A             |
| `.gateclaw/glossary/*.md`         | Translation glossaries               | ✅ Valid        |
| `.gateclaw/agent/*.md`            | Agent instructions                   | ✅ Valid        |
| `.gateclaw/command/*.md`          | Command documentation                | ✅ Valid        |

## Revision History

| Date       | Change Description                                                                       |
| ---------- | ---------------------------------------------------------------------------------------- |
| 2026-03-21 | Fixed OPENCODE_API_URL to use 4100, configured STT/TTS via llama-swap, fixed model names |
| 2026-03-19 | Added voice (TTS/STT) support via pocket-tts and whisper.cpp                             |
| 2026-03-15 | Initial Telegram bot integration                                                         |
