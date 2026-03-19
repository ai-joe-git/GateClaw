# GateClaw Installation Guide

> **Version:** 0.2.0-beta | **Last Updated:** March 16, 2026

## Quick Install (Choose One)

### 🪟 Windows (PowerShell)

```powershell
powershell -c "irm https://raw.githubusercontent.com/ai-joe-git/GateClaw/dev/install.ps1|iex"
```

### 🐧 Linux / macOS (Bash)

```bash
curl -fsSL https://raw.githubusercontent.com/ai-joe-git/GateClaw/dev/install | bash
```

### Manual Install (All Platforms)

```bash
# 1. Clone repository
git clone --depth 1 --branch dev https://github.com/ai-joe-git/GateClaw.git
cd GateClaw

# 2. Install dependencies
cd packages/gateclaw-orchestrator
bun install

# 3. Add to PATH (optional)
# Windows: Add %APPDATA%\gateclaw\bin to PATH
# Linux/Mac: Add ~/.local/share/gateclaw/bin to PATH

# 4. Run directly
bun run bin/gateclaw.ts
```

---

## Prerequisites

### Required

- **Bun** v1.3.0 or later ([Install](https://bun.sh))

  ```bash
  # Windows/Mac/Linux
  curl -fsSL https://bun.sh/install | bash

  # Windows (PowerShell)
  powershell -c "irm bun.sh/install.ps1|iex"
  ```

- **Git** for version control ([Install](https://git-scm.com))

### Recommended

- **Local AI Provider** (choose one):
  - **llama-swap** (recommended) - Port 8888
  - **Ollama** - Port 11434
  - **LM Studio** - Port 1234
- **Telegram account** (for bot interface)

---

## Post-Installation Setup

### 1. Verify Installation

```bash
gateclaw --help
```

Expected output:

```
  ██████╗  █████╗ ████████╗███████╗ ██████╗██╗      █████╗ ██╗    ██╗
 ██╔════╝ ██╔══██╗╚══██══╝██╔════╝██╔════╝██║     ██╔══██╗██║    ██║
 ...

 Resident AI. Local Control. Zero Bullshit.

 Commands:
   start      Start daemon
   status     Check status
   providers  Add AI provider
   telegram   Telegram bot setup
   ...
```

### 2. Add AI Provider

```bash
gateclaw providers add
```

**Interactive wizard will:**

1. Detect running providers (llama-swap, Ollama, LM Studio)
2. Show available models
3. Let you select models to enable
4. Generate `gateclaw.jsonc` config

**Manual provider setup:**

Edit `%APPDATA%\gateclaw\gateclaw.jsonc` (Windows) or `~/.config/gateclaw\gateclaw.jsonc` (Linux/Mac):

```jsonc
{
  "provider": {
    "llama-swap": {
      "name": "llama-swap",
      "npm": "@ai-sdk/openai-compatible",
      "models": {
        "gpt-oss-20b": {
          "name": "gpt-oss-20b",
          "limit": { "context": 131072, "output": 131072 },
        },
      },
      "options": { "baseURL": "http://localhost:8888/v1" },
    },
  },
}
```

### 3. Initialize Soul Identity

```bash
gateclaw soul init
```

**Example:**

```
🧬 GateClaw Soul Initialization

Soul name [GateClaw]: GateClaw
Owner name [User]: YourName
Personality traits [direct, technical, helpful]: direct, technical, witty
Primary language [english]: english

✅ Soul saved to: C:\Users\You\AppData\Roaming\gateclaw\SOUL.md
🐾 GateClaw ready
```

### 4. Start Daemon

```bash
gateclaw start
```

Expected output:

```
🐾 Starting GateClaw daemon...
✅ GateClaw started (pid 12345)
🟢 Daemon is ready
🌐 GateClaw core server starting on port 4100...
🤖 Telegram bot will start in 3s...
📋 Logs: gateclaw logs
```

### 5. Setup Telegram Bot (Optional)

```bash
gateclaw telegram setup
```

**Interactive wizard will:**

1. Ask for Telegram Bot Token (from @BotFather)
2. Ask for your Chat ID (from @userinfobot)
3. Test connection
4. Save to `%APPDATA%\gateclaw\.env`

**Manual setup:**

Create `%APPDATA%\gateclaw\.env`:

```bash
GATECLAW_TELEGRAM_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
GATECLAW_TELEGRAM_CHAT_ID="7638575659"
```

Then start bot:

```bash
gateclaw telegram start
```

---

## Verification

### Check Daemon Status

```bash
gateclaw status
```

Expected:

```
🟢 GateClaw is ONLINE (pid 12345)
   Soul:    GateClaw
   Uptime:  233s
```

### Test TUI

```bash
gateclaw tui
```

Should launch terminal interface with:

- Model picker
- Chat interface
- Session manager

### Test Web UI

```bash
gateclaw web
```

Opens browser at `http://localhost:4100`

### Test Telegram Bot

1. Send `/start` to your bot
2. Bot should respond with welcome message
3. Try `/help` to see commands

---

## Configuration Files

### Locations

| Platform    | Config Directory                          | Data Directory                            |
| ----------- | ----------------------------------------- | ----------------------------------------- |
| **Windows** | `%APPDATA%\gateclaw\`                     | `%APPDATA%\gateclaw\`                     |
| **Linux**   | `~/.config/gateclaw/`                     | `~/.local/share/gateclaw/`                |
| **macOS**   | `~/Library/Application Support/gateclaw/` | `~/Library/Application Support/gateclaw/` |

### Key Files

| File             | Purpose                                      |
| ---------------- | -------------------------------------------- |
| `gateclaw.jsonc` | Provider & model configuration               |
| `.env`           | Environment variables (Telegram token, etc.) |
| `SOUL.md`        | AI personality & identity                    |
| `gateclaw.db`    | SQLite database (memory, facts, sessions)    |
| `model.json`     | Favorite & recent models                     |
| `daemon.pid`     | Daemon process ID                            |
| `daemon.log`     | Daemon log file                              |

---

## Troubleshooting

### "gateclaw: command not found"

**Windows:**

```powershell
# Add to PATH manually
$env:Path += ";$env:APPDATA\gateclaw\bin"

# Or restart terminal
```

**Linux/Mac:**

```bash
export PATH="$HOME/.local/share/gateclaw/bin:$PATH"
# Add to ~/.bashrc or ~/.zshrc for persistence
```

### Daemon Won't Start

1. **Check if already running:**

   ```bash
   gateclaw status
   ```

2. **Check logs:**

   ```bash
   gateclaw logs
   ```

3. **Kill stale process:**

   ```bash
   gateclaw stop
   gateclaw start
   ```

4. **Check port 7371:**

   ```bash
   # Windows
   netstat -ano | findstr :7371

   # Linux/Mac
   lsof -i :7371
   ```

### Telegram Bot Not Responding

1. **Verify token & chat ID:**

   ```bash
   gateclaw telegram status
   ```

2. **Check bot is running:**

   ```bash
   gateclaw telegram start
   ```

3. **Verify chat ID matches:**
   - Message from @userinfobot should match `GATECLAW_TELEGRAM_CHAT_ID`

### Models Not Showing in Telegram

1. **Check model.json:**

   ```bash
   # Windows
   type %APPDATA%\gateclaw\model.json

   # Linux/Mac
   cat ~/.local/share/gateclaw\model.json
   ```

2. **Add models to favorites in TUI:**

   ```bash
   gateclaw tui
   # Press Ctrl+F to favorite models
   ```

3. **Restart daemon:**
   ```bash
   gateclaw restart
   ```

### Provider Not Detected

1. **Ensure provider is running:**
   - llama-swap: `http://localhost:8888`
   - Ollama: `http://localhost:11434`
   - LM Studio: `http://localhost:1234`

2. **Manually add provider:**
   Edit `gateclaw.jsonc` (see "Manual provider setup" above)

3. **Refresh providers:**
   ```bash
   gateclaw providers refresh
   ```

---

## Uninstall

### Windows

```powershell
# Stop daemon
gateclaw stop

# Remove installation
Remove-Item -Recurse -Force "$env:APPDATA\gateclaw"

# Remove from PATH (manual)
# System Properties → Environment Variables → Edit Path
```

### Linux/Mac

```bash
# Stop daemon
gateclaw stop

# Remove installation
rm -rf ~/.local/share/gateclaw
rm -rf ~/.config/gateclaw

# Remove from PATH (edit ~/.bashrc or ~/.zshrc)
```

---

## Next Steps

After successful installation:

1. ✅ **Read the docs:** [Main README](README.md)
2. ✅ **Understand architecture:** [SOUL.md](.gateclaw/agent/gateclaw.md)
3. ✅ **Join community:** [GitHub Discussions](https://github.com/ai-joe-git/GateClaw/discussions)
4. ✅ **Report issues:** [GitHub Issues](https://github.com/ai-joe-git/GateClaw/issues)

---

## Support

- **Documentation:** [README.md](README.md)
- **Troubleshooting:** [GateClaw-Telegram-Debugging.md](GateClaw-Telegram-Debugging.md)
- **Issues:** https://github.com/ai-joe-git/GateClaw/issues
- **Discussions:** https://github.com/ai-joe-git/GateClaw/discussions
