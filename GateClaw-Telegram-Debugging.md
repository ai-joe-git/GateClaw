# GateClaw Telegram Bot Integration - Debugging Guide

## Overview

The GateClaw Telegram bot is a thin client that connects to:

1. **Daemon (port 7371)** - Handles Telegram bot commands, stores memory/facts
2. **OpenCode Server (port 4100)** - Handles actual AI sessions, LLM calls

## Architecture

```
Telegram Bot
    |
    +--> Daemon (127.0.0.1:7371)
    |       - /provider endpoint (returns custom providers from gateclaw.jsonc)
    |       - /messages, /sessions endpoints
    |       - Telegram bot Webhook handler
    |
    +--> OpenCode Server (127.0.0.1:4100)
            - Session management
            - LLM calls to providers
            - Model validation
```

## Key Files & Locations

### Configuration Files

| File            | Path                                           | Purpose                               |
| --------------- | ---------------------------------------------- | ------------------------------------- |
| GateClaw config | `AppData/Roaming/gateclaw/gateclaw.jsonc`      | Custom providers (ollama, llama-swap) |
| Environment     | `AppData/Roaming/gateclaw/.env`                | Telegram token, chat ID               |
| Daemon PID      | `AppData/Roaming/gateclaw/daemon.pid`          | Running daemon process ID             |
| OpenCode PID    | `AppData/Roaming/gateclaw/opencode-server.pid` | Running OpenCode server PID           |

### Source Code Locations

| Component        | File                                                               | Key Functions                                          |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| Daemon startup   | `packages/gateclaw-orchestrator/src/index.ts`                      | `startOpenCodeServer()`, spawns OpenCode with env vars |
| Server endpoints | `packages/gateclaw-orchestrator/src/server.ts`                     | `/provider`, `/telegram/start`, `/shutdown`            |
| Telegram config  | `packages/gateclaw-orchestrator/src/telegram-bot/config.ts`        | API URL, model settings                                |
| Model manager    | `packages/gateclaw-orchestrator/src/telegram-bot/model/manager.ts` | Fetches providers from daemon                          |
| OpenCode auth    | `packages/opencode/src/server/server.ts`                           | Basic auth middleware                                  |
| Provider loading | `packages/opencode/src/provider/provider.ts`                       | `getModel()`, provider state                           |

## Startup Sequence

1. **`gateclaw start`** - CLI starts daemon
2. **Daemon (`src/index.ts`)**:
   - Loads `.env` for Telegram credentials
   - Spawns OpenCode server on port 4100 with env vars:
     - `XDG_CONFIG_HOME` = `APPDATA`
     - `OPENCODE_CONFIG_DIR` = gateclaw config dir
     - `OPENCODE_SERVER_PASSWORD=""` (CRITICAL - disables auth)
   - Starts Telegram bot after 3 second delay

## Critical Configuration (.env)

**Location:** `%APPDATA%/gateclaw/.env`

```env
# CRITICAL: Must point to OpenCode Server (4100), NOT Daemon (7371)
OPENCODE_API_URL=http://localhost:4100

# Voice services via llama-swap proxy (8888)
STT_API_URL=http://localhost:8888
TTS_API_URL=http://localhost:8888
STT_MODEL=whisper-large-v3-turbo
TTS_MODEL=pocket-tts
```

## Critical Fixes Applied

### 1. OpenCode Server Auth (port 4100)

**Problem:** Server returned 401 Unauthorized
**Root Cause:** `OPENCODE_SERVER_PASSWORD` env var inherited from parent process
**Fix:** Explicitly set to empty string when spawning:

```typescript
// packages/gateclaw-orchestrator/src/index.ts
const child = Bun.spawn(["bun", "run", "src/index.ts", "serve", "--port", "4100"], {
  env: {
    ...process.env,
    OPENCODE_SERVER_PASSWORD: "", // CRITICAL - disable auth
  },
})
```

### 2. Config Path Resolution

**Problem:** OpenCode looked in `~/.config/gateclaw` instead of `AppData/Roaming/gateclaw`
**Root Cause:** `xdg-basedir` package resolved incorrectly on Windows
**Fix:** Pass explicit config path via environment:

```typescript
env: {
  XDG_CONFIG_HOME: process.env.APPDATA,
  OPENCODE_CONFIG_DIR: gateclawConfigDir,
}
```

### 3. Model Validation Bypass

**Problem:** "Model not found: llama-swap/gpt-oss-20b" despite model being in config
**Root Cause:** Complex provider loading in OpenCode - config loaded but not merged into provider state
**Fix:** Modified `getModel()` to allow unknown providers:

```typescript
// packages/opencode/src/provider/provider.ts
export async function getModel(providerID: string, modelID: string) {
  const s = await state()
  const provider = s.providers[providerID]
  if (!provider) {
    // Allow unknown providers - let the actual API call fail later
    console.log(`[provider] Unknown provider ${providerID}, allowing anyway`)
    return {
      id: modelID,
      name: modelID,
      providerID,
      api: { id: modelID, npm: "@ai-sdk/openai-compatible", url: "http://localhost:11434/v1" },
      capabilities: { temperature: true, reasoning: false, attachment: false, toolcall: true },
    } as Model
  }

  const info = provider.models[modelID]
  if (!info) {
    // Allow unknown models - let the actual API call fail later
    console.log(`[provider] Unknown model ${providerID}/${modelID}, allowing anyway`)
    return {
      id: modelID,
      name: modelID,
      providerID,
      api: {
        id: modelID,
        npm: "@ai-sdk/openai-compatible",
        url: (provider.models && Object.values(provider.models)[0]?.api?.url) || "http://localhost:11434/v1",
      },
      capabilities: { temperature: true, reasoning: false, attachment: false, toolcall: true },
    } as Model
  }
  return info
}
```

### 4. Config Priority

**Problem:** `config.json` took priority over `gateclaw.jsonc`
**Fix:** Reordered in `packages/opencode/src/config/config.ts`:

```typescript
const files = [
  path.join(Global.Path.config, "gateclaw.jsonc"), // FIRST
  path.join(Global.Path.config, "gateclaw.json"),
  path.join(Global.Path.config, "opencode.jsonc"),
  path.join(Global.Path.config, "opencode.json"),
  path.join(Global.Path.config, "config.json"), // LAST
]
```

### 5. Provider Endpoint Full Models

**Problem:** Daemon `/provider` endpoint only returned modelCount, not actual models
**Fix:** Changed to return full `models` object in `packages/gateclaw-orchestrator/src/server.ts`:

```typescript
const providerList = Object.entries(providers).map(([id, config]: [string, any]) => ({
  id,
  name: config.name || id,
  npm: config.npm,
  models: config.models || {}, // Return full models object
}))
```

### 6. Telegram ModelManager Fetch Source

**Problem:** ModelManager was fetching from OpenCode (port 4100) instead of Daemon (port 7371)
**Fix:** Changed to use daemon's `/provider` endpoint in `packages/gateclaw-orchestrator/src/telegram-bot/model/manager.ts`:

```typescript
const response = await fetch("http://localhost:7371/provider", { signal: AbortSignal.timeout(5000) })
```

## Debugging Commands

### Check what's running

```cmd
netstat -ano | findstr :4100   # OpenCode server
netstat -ano | findstr :7371   # Daemon
```

### Test OpenCode server

```cmd
curl http://localhost:4100/global/health
# Should return: {"healthy":true,"version":"local"}
```

### Test Daemon provider endpoint

```cmd
curl http://localhost:7371/provider
# Should return custom providers from gateclaw.jsonc
```

### Check logs

```cmd
type AppData\Roaming\gateclaw\logs\telegram.log
type AppData\Roaming\gateclaw\log\dev.log
```

### Restart sequence

```cmd
gateclaw stop
gateclaw start
gateclaw telegram start
```

## Common Issues & Solutions

| Symptom                           | Cause                                       | Fix                                           |
| --------------------------------- | ------------------------------------------- | --------------------------------------------- |
| "Model not found"                 | Auth enabled or config not loading          | Ensure `OPENCODE_SERVER_PASSWORD=""` in spawn |
| "Unauthorized" on 4100            | Password set in .env                        | Remove `OPENCODE_SERVER_PASSWORD` from .env   |
| Providers not showing             | Wrong config path                           | Pass `XDG_CONFIG_HOME` env var                |
| Telegram "Unable to connect"      | OpenCode not running                        | Check port 4100 with `netstat`                |
| Providers show in TUI but not bot | Bot uses OpenCode SDK (port 4100)           | Apply model validation bypass fix             |
| Favorites filtered out            | ModelManager fetching from wrong source     | Fetch from daemon (7371) not OpenCode (4100)  |
| Only one model in favorites       | Provider endpoint returning modelCount only | Return full models object                     |

## Environment Variables

| Variable                    | Used By         | Purpose                    |
| --------------------------- | --------------- | -------------------------- |
| `GATECLAW_TELEGRAM_TOKEN`   | Daemon          | Telegram bot token         |
| `GATECLAW_TELEGRAM_CHAT_ID` | Daemon          | Allowed user ID            |
| `OPENCODE_SERVER_PASSWORD`  | OpenCode server | If set, enables basic auth |
| `XDG_CONFIG_HOME`           | OpenCode server | Config directory override  |
| `OPENCODE_CONFIG_DIR`       | OpenCode server | Explicit config path       |

## Testing Checklist

When testing after changes:

1. [ ] `curl http://localhost:4100/global/health` returns healthy (no auth)
2. [ ] `curl http://localhost:7371/provider` returns custom providers with full model list
3. [ ] Telegram bot starts without "Unauthorized" errors
4. [ ] Can see favorites in model selection (more than 1 model)
5. [ ] Can select a custom model (e.g., llama-swap/gpt-oss-20b)
6. [ ] `/new` creates a session without "Model not found" error
7. [ ] Session becomes idle (LLM responded) without errors
