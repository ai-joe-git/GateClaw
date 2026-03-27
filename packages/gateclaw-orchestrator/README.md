# GateClaw Orchestrator

**Resident AI Daemon** - Core backend for GateClaw with Telegram bot, HTTP API, and CLI.

## Quick Start

```bash
# Install globally
bun install -g @gateclaw/orchestrator

# Start daemon
gateclaw start

# Check status
gateclaw status

# Interactive setup
gateclaw telegram setup
```

## CLI Commands

### Daemon Management

| Command            | Description                     |
| ------------------ | ------------------------------- |
| `gateclaw start`   | Start daemon in background      |
| `gateclaw stop`    | Stop running daemon             |
| `gateclaw restart` | Restart daemon                  |
| `gateclaw status`  | Show daemon status and uptime   |
| `gateclaw logs`    | Tail live logs (Ctrl+C to stop) |
| `gateclaw run`     | Run in foreground (dev mode)    |

### Interfaces

| Command              | Description                                       |
| -------------------- | ------------------------------------------------- |
| `gateclaw web`       | Open WebUI at http://localhost:4100               |
| `gateclaw dashboard` | Open dashboard at http://localhost:7371/dashboard |

### Updates

| Command            | Description                |
| ------------------ | -------------------------- |
| `gateclaw upgrade` | Interactive update checker |

### Identity

| Command               | Description                      |
| --------------------- | -------------------------------- |
| `gateclaw soul init`  | Initialize SOUL.md interactively |
| `gateclaw soul edit`  | Edit existing SOUL.md            |
| `gateclaw soul show`  | Display current SOUL.md          |
| `gateclaw soul reset` | Reset to default soul            |

### Telegram Bot

| Command                    | Description                          |
| -------------------------- | ------------------------------------ |
| `gateclaw telegram setup`  | Interactive bot configuration wizard |
| `gateclaw telegram start`  | Start Telegram bot                   |
| `gateclaw telegram stop`   | Stop Telegram bot                    |
| `gateclaw telegram status` | Show bot status and config           |

### Memory & Facts

| Command                             | Description           |
| ----------------------------------- | --------------------- |
| `gateclaw facts`                    | View all stored facts |
| `gateclaw fact store <key> <value>` | Store a fact          |
| `gateclaw fact delete <key>`        | Delete a fact         |
| `gateclaw fact get <key>`           | Get a fact            |
| `gateclaw history [session]`        | View message history  |

### AI Models

| Command           | Description              |
| ----------------- | ------------------------ |
| `gateclaw models` | List available AI models |

### Export

| Command                              | Description               |
| ------------------------------------ | ------------------------- |
| `gateclaw export <session> [format]` | Export session to MD/JSON |

### AgentMon (Pokémon Red AI)

| Command                             | Description             |
| ----------------------------------- | ----------------------- |
| `gateclaw agentmon register`        | Register AgentMon agent |
| `gateclaw agentmon start [starter]` | Start Pokémon game      |
| `gateclaw agentmon act <action>`    | Send action             |
| `gateclaw agentmon status`          | Show game status        |
| `gateclaw agentmon save [label]`    | Save game               |
| `gateclaw agentmon load <saveId>`   | Load saved game         |
| `gateclaw agentmon stop`            | Stop session            |

## Architecture

```
gateclaw-orchestrator/
├── bin/
│   └── gateclaw.ts      # Main CLI entry point
├── src/
│   ├── index.ts         # Daemon entry point
│   ├── server.ts        # HTTP API server (port 7371)
│   ├── soul.ts          # Soul identity management
│   ├── telegram.ts      # Telegram integration
│   ├── telegram-bot/    # New Telegram bot implementation
│   │   ├── app/
│   │   ├── bot/
│   │   ├── config.ts
│   │   └── ...
│   ├── commands/        # CLI command handlers
│   │   ├── soul.ts
│   │   └── fact.ts
│   └── cli.ts           # Web gateway CLI
└── README.md
```

## API Endpoints

- `GET /health` - Daemon health check
- `GET /facts` - List all facts
- `POST /fact` - Store fact
- `DELETE /fact/:key` - Delete fact
- `GET /messages/:session` - Get message history
- `POST /message` - Send message to session

## Configuration

**Location**: `%APPDATA%/gateclaw/.env` (Windows) or `~/.config/gateclaw/.env` (Unix)

```bash
GATECLAW_TELEGRAM_TOKEN="your-bot-token"
GATECLAW_TELEGRAM_CHAT_ID="your-chat-id"
```

## Development

```bash
# Install dependencies
bun install

# Run in dev mode
bun run dev

# Typecheck
bun run typecheck

# Run CLI
bun run gate
```

## Testing

```bash
# Test CLI
bun ./bin/gateclaw.ts

# Test specific command
bun ./bin/gateclaw.ts status
```

## License

MIT - GateClaw Project
