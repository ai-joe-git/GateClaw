# GateClaw Dashboard

> **Status**: ✅ Complete | **Port**: `7371` | **Package**: `packages/gateclaw-orchestrator`

## Quick Start

```bash
gateclaw start
# Browser auto-opens to http://localhost:7371/dashboard
```

## Overview

The GateClaw Dashboard is a **self-contained** control center UI served directly by the GateClaw daemon. Single command, automatic browser launch, comprehensive management interface.

## Tabs

### 1. Overview Tab

- **Daemon Status**: Real-time health check (status, uptime, PID)
- **Soul Identity**: Current configured soul name
- **Telegram Integration**: Bot status (configured/running/stopped) with Start/Stop buttons
- **Quick Actions**: Reload Soul, Refresh All, Shutdown Daemon

### 2. Health Tab

- **Service Status**: Check connection status for:
  - Daemon (internal)
  - OpenCode Server (localhost:4100)
  - STT Server (localhost:7372)
  - TTS Server (localhost:8000)
  - Telegram Bot API
- **System Stats**: Memory usage, DB size, platform info, CPU count

### 3. Chat Tab

- **Embedded WebUI**: Full OpenCode interface embedded via iframe at http://localhost:4100
- **Purpose**: Provides access to the full chat/agent experience without leaving the dashboard
- **No custom UI**: Simply renders the existing WebUI for consistency

### 4. Memory Tab

- **Persistent Facts**: View all stored facts from `gc_message` table
- **Add Fact**: Store new key-value pairs in memory
- **Delete Fact**: Remove existing facts with confirmation

### 5. Messages Tab

- **Conversation History**: View recent messages between you and GateClaw
- **Load Limit**: Customizable number of messages to load (1-500)
- **Clear History**: Delete all conversation history

### 6. Logs Tab

- **Daemon Logs**: Live view of daemon log output
- **Customizable Lines**: Load 1-1000 lines
- **Error Highlighting**: Red highlighting for errors/warnings

### 7. Config Tab

- **Live Config Files**: View actual `.env`, `gateclaw.jsonc`, and `SOUL.md` content from disk
- **File Paths**: Display actual config file locations for each OS

### 8. Soul Tab

- **SOUL.md Viewer**: Display current soul configuration from disk
- **Reload Button**: Reload soul without restarting daemon

## API Endpoints

All endpoints are at `http://localhost:7371`:

| Endpoint           | Method | Description                                            |
| ------------------ | ------ | ------------------------------------------------------ |
| `/`                | GET    | Redirects to `/dashboard`                              |
| `/dashboard`       | GET    | Serves the dashboard HTML                              |
| `/health`          | GET    | Daemon status, uptime, PID, soul                       |
| `/health/checks`   | GET    | External services connection status                    |
| `/system/stats`    | GET    | Memory, CPU, disk usage                                |
| `/facts`           | GET    | All stored facts                                       |
| `/fact`            | POST   | Store new fact `{key, value}`                          |
| `/fact/:key`       | DELETE | Delete fact by key                                     |
| `/messages`        | GET    | Get conversation history                               |
| `/messages`        | DELETE | Clear conversation history                             |
| `/logs`            | GET    | Get daemon log lines                                   |
| `/config/:file`    | GET    | Read config file (`.env`, `gateclaw.jsonc`, `SOUL.md`) |
| `/telegram/status` | GET    | Telegram bot status                                    |
| `/telegram/start`  | POST   | Start Telegram bot                                     |
| `/telegram/stop`   | POST   | Stop Telegram bot                                      |
| `/soul/reload`     | POST   | Reload soul configuration                              |
| `/shutdown`        | POST   | Shutdown the daemon                                    |

## Architecture

```
packages/gateclaw-orchestrator/src/
├── index.ts                    # Entry point, auto-opens browser
├── server.ts                   # Hono API server with all endpoints
└── dashboard/
    └── dashboard.html          # Self-contained UI (Vanilla HTML/CSS/JS)
```

### Dashboard Structure

- **Header**: Logo (blue theme), Dashboard label, Web UI link, Refresh button
- **Tab Navigation**: Overview, Health, Chat, Memory, Logs, Telegram, Sessions, Activity, Plugins, Voice, Config, Soul, Settings
- **Chat Tab**: Embeds WebUI at port 4100 via iframe, fills content area seamlessly
- **Content Area**: Scrollable main area with consistent padding
- **Footer**: Status indicator, keyboard shortcuts

### Blue Theme

GateClaw branding uses blue (`#005be0`) throughout:

- Logo background
- Active tab indicator (border and text)
- Consistent with GateClaw's visual identity

### Auto-Open Browser

```typescript
// packages/gateclaw-orchestrator/src/index.ts

const openBrowser = () => {
  const url = "http://localhost:7371/dashboard"
  if (process.platform === "win32") {
    execSync(`start ${url}`, { stdio: "ignore" })
  } else if (process.platform === "darwin") {
    execSync(`open ${url}`, { stdio: "ignore" })
  } else {
    execSync(`xdg-open ${url}`, { stdio: "ignore" })
  }
}

setTimeout(openBrowser, 1000) // Wait for server to start
```

## Tech Stack

- **Server**: Bun + Hono
- **Dashboard**: Vanilla HTML/CSS/JS (no build step)
- **Styling**: Tailwind CSS via CDN
- **Icons**: Inline SVG
- **State**: Vanilla JS with global variables

## Running

### Simple

```bash
gateclaw start
# Or directly:
cd packages/gateclaw-orchestrator && bun run src/index.ts
```

### Manual

```bash
# If browser doesn't open:
open http://localhost:7371/dashboard
```

## Development

### Modifying Dashboard

```bash
# Edit the single HTML file
code packages/gateclaw-orchestrator/src/dashboard/dashboard.html

# Restart to see changes
gateclaw restart
```

### Adding Endpoints

```typescript
// packages/gateclaw-orchestrator/src/server.ts

app.get("/my-endpoint", async (c) => {
  return c.json({ data: "value" })
})
```

## Configuration

| OS      | Config Path           |
| ------- | --------------------- |
| Windows | `%APPDATA%/gateclaw/` |
| Linux   | `~/.config/gateclaw/` |
| macOS   | `~/.config/gateclaw/` |

| File             | Purpose                          |
| ---------------- | -------------------------------- |
| `.env`           | Environment variables            |
| `gateclaw.jsonc` | Provider and model configuration |
| `SOUL.md`        | Soul/personality configuration   |
| `gateclaw.db`    | SQLite with persistent memory    |
| `daemon.pid`     | Daemon process ID                |

## Key Features

1. **Zero Dependencies**: No separate server, no npm install, just `gateclaw start`
2. **Auto Browser**: Opens automatically on startup
3. **Health Checks**: Real-time status of all connected services
4. **Live Config**: Reads actual files from disk, not templates
5. **Conversation History**: Browse your chat history with GateClaw
6. **Daemon Logs**: View logs without opening terminal
7. **Memory Management**: Add/delete persistent facts from UI
8. **Telegram Control**: Start/stop bot from dashboard
9. **Embedded WebUI**: Full OpenCode chat experience integrated via iframe

## Theme

The dashboard uses a blue theme (`#005be0`) matching GateClaw's branding:

- Logo background: Blue (#005be0)
- Active tab indicator: Blue border
- Clean dark interface with Tailwind CSS

## Future Enhancements

- Config file editor with validation
- Theme toggle (dark/light)
- Voice pipeline testing
- Model switcher
- Plugin manager
- Session manager
- Voice/TTS controls
