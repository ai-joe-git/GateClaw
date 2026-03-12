# GateClaw - Resident AI Entity

![GateClaw Logo](gateclaw_logo.png)

**Not a chatbot. A resident AI that lives on your machine.**  
**Telegram-native · Memory-persistent · Soul-identified**

> **Version:** 0.1.0-beta | **Repository:** https://github.com/ai-joe-git/GateClaw

---

## ⚡ Quick Start (60 seconds)

### One-Line Install

```bash
curl -fsSL https://raw.githubusercontent.com/ai-joe-git/GateClaw/dev/install | bash
```

**What it does:**

1. ✅ Auto-detects your AI provider (llama-swap :8888, Ollama :11434, LM Studio :1234)
2. ✅ Interactive Telegram bot setup via @BotFather
3. ✅ Generates `gateclaw.jsonc` with your models
4. ✅ Creates `SOUL.md` personality profile
5. ✅ Clones repo, runs `bun install`, adds to PATH

### First Run

```bash
gateclaw
```

**Expected output:**

```
░██████╗░█████╗░███████╗███████╗░██████╗██╗░░░░░█████╗░██╗░░░░░██╗
║██╔════╝██╔══██╗╚══██╔╝██╔════╝██╔════╝██║░░░░░██╔══██╗██║░░░░░██║
║██║░░██╗███████║░░██║░░█████╗░░██║░░░░░██║░░░░░███████║██║░█╗░██║
║██║░░██║██╔══██║░░██║░░██╔══╝░░██║░░░░░██║░░░░░██╔══██║██║███╗██║
║╚██████╔╝██║░░██║░░██║░░███████╗╚██████╗███████╗██║░░██║╚███╔███╔╝
░╚═════╝░╚═╝░░╚═╝░░╚═╝░░╚══════╝░╚═════╝╚══════╝╚═╝░░╚═╝░╚══╝╚══╝░

Resident AI. Local Control. Zero Bullshit.

🐾 GateClaw daemon started (pid 12345)
📋 Logs: gateclaw logs
```

Then message your Telegram bot — it responds instantly! 🤖

---

## 🎬 Live Preview

![GateClaw Preview](gateclaw_preview.gif)

_GateClaw TUI — Model picker, session manager, tool palette, real-time streaming_

**Watch the full demo:** [gateclaw_video.mp4](gateclaw_video.mp4)

---

## 🎯 What Is GateClaw?

GateClaw is **ONE resident AI entity** with multiple equal interfaces:

| Interface    | Purpose                  | Primary? | Latency    |
| ------------ | ------------------------ | -------- | ---------- |
| **Telegram** | Chat-native, mobile      | ✅ Yes   | < 1 second |
| **TUI**      | Terminal interactive     | ✅ Equal | Real-time  |
| **CLI**      | Scripting/automation     | ✅ Equal | Immediate  |
| **HTTP API** | Programmatic (port 7371) | ✅ Equal | < 100ms    |

### What Makes It Unique

- ✅ **Resident daemon** - Lives on your machine as a background service
- ✅ **Persistent memory** - SQLite facts & message history survive restarts
- ✅ **Soul identity** - Customizable personality via `SOUL.md`
- ✅ **Multi-interface** - All interfaces are equal, same entity
- ✅ **Full system access** - Shell, filesystem, HTTP, memory operations
- ✅ **Provider agnostic** - Works with any OpenAI-compatible API
- ✅ **Local-first** - Recommended: llama-swap, Ollama, LM Studio (zero cost, private)

---

## 🔧 Provider Setup

GateClaw works with **any OpenAI-compatible API**:

### Local Providers (Privacy, Zero Cost) ⭐ Recommended

#### llama-swap (Your Current Setup)

- **Port:** `http://localhost:8888/v1`
- **Fast model switching** - Swap between 11 models instantly
- **Local execution** - Runs on your hardware
- **Your config:** Claude-4.6-Opus-35B, Qwen3.5-4B Heretic, etc.

**Auto-detected by installer:**

```bash
$ gateclaw status
● GateClaw | soul: GateClaw | uptime: 3600s | pid: 12345

$ curl http://localhost:8888/v1/models | jq '.data[].id'
"Claude-4.6-Opus-35B"
"qwen35-4b-heretic"
"llama-3.2-90b-vision"
# ... 8 more models
```

#### Ollama

```bash
# Install
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull llama3.2:latest
ollama pull qwen2.5:7b
ollama pull phi3:mini

# Start server
ollama serve

# GateClaw config
{
  "provider": "ollama",
  "endpoint": "http://localhost:11434",
  "models": {
    "default": "llama3.2:latest",
    "fast": "phi3:mini",
    "quality": "llama3.2:90b"
  }
}
```

#### LM Studio

- **GUI-based** - Windows/macOS desktop app
- **Server mode:** `http://localhost:1234/v1`
- **Drag & drop** GGUF models

**Setup:**

1. Download LM Studio → load model → Start Server
2. Auto-detected by installer on port 1234
3. Works offline, no API keys needed

---

### Cloud Providers (Fast Setup, API Costs)

#### Anthropic (Claude - Best Quality)

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "anthropic": {
      "api_key": "sk-ant-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "models": {
        "default": "claude-sonnet-4-20250514",
        "fast": "claude-3-haiku-20240307",
        "quality": "claude-opus-4-20250514",
      },
      "context_limit": 200000,
      "max_tokens": 8192,
    },
  },
}
```

**Test:**

```bash
$ curl -X POST https://api.anthropic.com/v1/messages \
  -H "Authorization: Bearer sk-ant-..." \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'

{"id":"msg_01234","type":"message","role":"assistant","content":[{"type":"text","text":"Hello! How can I help?"}]}
```

#### OpenAI (GPT - Most Popular)

```jsonc
{
  "provider": "openai",
  "api_key": "sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "models": {
    "default": "gpt-4o",
    "fast": "gpt-4o-mini",
    "quality": "gpt-4-turbo",
  },
  "context_limit": 128000,
  "max_tokens": 4096,
}
```

**Test:**

```bash
$ curl https://api.openai.com/v1/models -H "Authorization: Bearer sk-..."
{"object":"list","data":[{"id":"gpt-4o","object":"model","created":1234567890}]}
```

#### Google (Gemini/Vertex)

```jsonc
{
  "provider": "google",
  "api_key": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "models": {
    "default": "gemini-2.0-flash",
    "quality": "gemini-2.0-pro",
  },
}
```

---

## 📋 Configuration Files

### gateclaw.jsonc (Provider Config)

**Location:** `~/.config/gateclaw/gateclaw.jsonc`

**Auto-generated by installer:**

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "llama-swap": {
      "name": "llama-swap",
      "npm": "@ai-sdk/openai-compatible",
      "models": {
        "Claude-4.6-Opus-35B": {
          "name": "Claude-4.6-Opus-35B",
          "limit": { "context": 262144, "output": 262144 },
        },
        "qwen35-4b-heretic": {
          "name": "Qwen3.5-4B Heretic",
          "limit": { "context": 262144, "output": 262144 },
        },
      },
      "options": { "baseURL": "http://localhost:8888/v1" },
    },
  },
}
```

**Manual edit:**

```bash
$ gateclaw soul edit      # Opens in $EDITOR
$ code ~/.config/gateclaw/gateclaw.jsonc
```

**Example configs:** See `.gateclaw/provider-examples/` (or legacy `.opencode/provider-examples/`) for 6 provider templates:

- `gateclaw.jsonc.llama-swap`
- `gateclaw.jsonc.ollama`
- `gateclaw.jsonc.lm-studio`
- `gateclaw.jsonc.anthropic`
- `gateclaw.jsonc.openai`
- `gateclaw.jsonc.multi` (failover chain)

---

### SOUL.md (Soul Identity)

**Location:** `~/.config/gateclaw/SOUL.md`

**Default:**

```markdown
---
name: GateClaw
owner: User
personality: direct, technical, slightly sarcastic
language: english
---

You are GateClaw. You live on this machine.
You have persistent memory. You take initiative.
You are not a chat assistant — you are an AI resident.
Act like it.
```

**Interactive setup:**

```bash
$ gateclaw soul init

🧬 GateClaw Soul Initialization

Soul name [GateClaw]: GateClaw
Owner name [User]: User
Personality traits [direct, technical, slightly sarcastic]: direct, technical, helpful
Primary language [english]: english

📋 Preview of SOUL.md:
────────────────────────────────────────────────────────────
---
name: GateClaw
owner: User
personality: direct, technical, helpful
language: english
---
You are GateClaw. You live on this machine.
You have persistent memory. You take initiative.
You are not a chat assistant — you are an AI resident.
Act like it.
────────────────────────────────────────────────────────────

Save this soul? [y/N]: y

✅ Soul saved to: C:\Users\uscha\AppData\Roaming\gateclaw\SOUL.md
   name: GateClaw
   owner: User
   personality: direct, technical, helpful
   language: english

🐾 GateClaw ready
```

**View:**

```bash
$ gateclaw soul show

🧬 Current Soul:

  name:         GateClaw
  owner:        User
  personality:  direct, technical, helpful
  language:     english

────────────────────────────────────────────────────────────
---
name: GateClaw
owner: User
personality: direct, technical, helpful
language: english
---
You are GateClaw. You live on this machine.
You have persistent memory. You take initiative.
You are not a chat assistant — you are an AI resident.
Act like it.
────────────────────────────────────────────────────────────
```

**Edit:**

```bash
$ gateclaw soul edit      # Opens in $EDITOR (default: notepad on Windows)
$ gateclaw soul reset     # Reset to defaults
```

---

## 🧠 Memory System

GateClaw remembers **everything** across sessions via SQLite:

**Database location:** `~/.local/share/gateclaw/gateclaw.db`

### Facts (Key-Value Store)

Persistent facts survive restarts:

```sql
-- SQLite schema
CREATE TABLE gc_fact (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  time_created INTEGER NOT NULL,
  time_updated INTEGER NOT NULL
)
```

**Store fact:**

```bash
# CLI
$ gateclaw fact store my_cat_name Whiskers
✅ Fact stored: my_cat_name

$ gateclaw fact store project GateClaw
✅ Fact stored: project

# Via Telegram
You: "Store fact: favorite_color = blue"
GateClaw: ✅ Fact stored: favorite_color

# Via HTTP API
$ curl -X POST http://localhost:7371/fact \
  -H "Content-Type: application/json" \
  -d '{"key":"api_key","value":"sk-test123"}'
{"ok":true}
```

**Get fact:**

```bash
$ gateclaw fact get my_cat_name
my_cat_name: Whiskers

$ curl http://localhost:7371/fact/my_cat_name
{"id":"01KGX...","key":"my_cat_name","value":"Whiskers","time_created":1773315595715}
```

**List all facts:**

```bash
$ gateclaw facts
🧠 3 fact(s):

  my_cat_name: Whiskers
  project: GateClaw
  favorite_color: blue

$ curl http://localhost:7371/facts | jq
[
  {"id":"01KGX...","key":"my_cat_name","value":"Whiskers","time_created":1773315595715},
  {"id":"01KGY...","key":"project","value":"GateClaw","time_created":1773315600000},
  {"id":"01KGZ...","key":"favorite_color","value":"blue","time_created":1773315610000}
]
```

**Delete fact:**

```bash
$ gateclaw fact delete my_cat_name
✅ Fact deleted: my_cat_name

$ gateclaw facts
🧠 2 fact(s):

  project: GateClaw
  favorite_color: blue
```

### Message History

All conversations are logged per session:

```sql
CREATE TABLE gc_message (
  id TEXT PRIMARY KEY,
  session_key TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL,
  time_created INTEGER NOT NULL
)
```

**View history:**

```bash
$ gateclaw history default
📜 5 message(s) in session "default":

  [user] What's the weather?
  [assistant] Use tool: http://wttr.in
  [user] List my facts
  [assistant] You have 3 facts: my_cat_name=Whiskers...
  [user] Read config.yml
```

**HTTP API:**

```bash
$ curl http://localhost:7371/messages/default | jq
[
  {"id":"01KH1...","session_key":"default","role":"user","content":"What's the weather?"},
  {"id":"01KH2...","session_key":"default","role":"assistant","content":"Use tool: http://wttr.in"}
]
```

---

## 🐾 Interfaces

### Telegram (Primary - Chat Native)

#### Setup via CLI (Recommended)

Use the interactive Telegram CLI to configure your bot:

```bash
# Start interactive setup
gateclaw telegram setup

# Flow:
# 1. Message @BotFather → /newbot → get token
# 2. Message your new bot (any text)
# 3. CLI auto-detects your chat ID from bot updates
# 4. Sends welcome message to verify
```

**Telegram Commands:**

```bash
gateclaw telegram setup      # Interactive bot setup 🆕
gateclaw telegram status     # Show current config
gateclaw telegram test       # Send test message
gateclaw telegram verify     # Verify token and chat ID
gateclaw telegram reset      # Clear configuration
gateclaw telegram autoid     # Auto-detect chat ID from updates 🆕
gateclaw telegram info       # Quick status check (for scripting)
```

**Manual Setup (Alternative):**

1. Message @BotFather on Telegram
2. `/newbot` → name your bot
3. Copy API token
4. Message your new bot to get chat ID
5. Edit config manually:

```bash
# Config location: ~/.config/gateclaw/.env (or %APPDATA%/gateclaw/.env on Windows)
GATECLAW_TELEGRAM_TOKEN="your-bot-token"
GATECLAW_TELEGRAM_CHAT_ID="your-chat-id"
```

**Test:**

```bash
# Check status
gateclaw telegram status
# Output: Bot: @YourBotName | Chat ID: 987654321 | Status: ready

# Send test message
gateclaw telegram test
# Your bot sends: "🐾 GateClaw test - This is a test message..."

# Message bot on Telegram
You: "What's my soul name?"
GateClaw: "Your soul name is 'GateClaw'"
```

**Auto-Detect Chat ID:**

If you skip entering chat ID during setup, or message your bot later:

```bash
# Automatically fetch latest chat ID from bot updates
gateclaw telegram autoid
# Output: ✓ Found chat ID: 987654321 | ✓ Chat ID saved
```

**Verify Configuration:**

```bash
gateclaw telegram verify
# Validates token with Telegram API
# Sends verification message to chat ID
# Output: ✓ Token valid - @YourBotName | ✓ Chat ID valid
```

---

### TUI (Terminal User Interface)

```bash
$ gateclaw tui
```

**Features:**

- **Model picker** (Ctrl+M) - Choose from configured models
- **Tool browser** (Ctrl+T) - All available tools
- **Session manager** - Multiple conversations
- **Real-time streaming** - See tokens as they generate
- **Syntax highlighting** - Code blocks rendered beautifully

**Keyboard shortcuts:**
| Key | Action |
| --------- | ------------------------- |
| `Ctrl+M` | Model picker |
| `Ctrl+T` | Tool browser |
| `Ctrl+S` | Session switch |
| `Enter` | Send prompt |
| `Ctrl+C` | Cancel/cut |
| `Esc` | Close modal |

---

### CLI (Command-Line Interface)

**All commands:**

#### Daemon Management

```bash
# Start daemon in background
$ gateclaw start
🐾 Starting GateClaw daemon...
✅ GateClaw started (pid 12345)
📋 Logs: gateclaw logs

# Stop daemon
$ gateclaw stop
🛑 GateClaw stopped (via HTTP)

# Restart
$ gateclaw restart
🛑 Stopped (pid 12345)
✅ GateClaw restarted (pid 12346)

# Check status
$ gateclaw status
● GateClaw | soul: GateClaw | uptime: 3600s | pid: 12346

# Tail logs
$ gateclaw logs
📋 Tailing C:\Users\uscha\AppData\Roaming\gateclaw\daily.log (Ctrl+C to stop)

[2026-03-12T09:15:19.346Z] BOOT soul=GateClaw pid=18524
[2026-03-12T09:34:15.426Z] Shutdown requested via HTTP
[2026-03-12T09:44:22.226Z] BOOT soul=GateClaw pid=22444
^C

# Run in foreground (dev mode)
$ gateclaw run
🐾 GateClaw running in foreground (dev mode)...
GateClaw daemon listening on 127.0.0.1:7371
```

#### Soul Commands

```bash
# Interactive setup
$ gateclaw soul init

# Edit existing soul
$ gateclaw soul edit

# Show current config
$ gateclaw soul show

# Reset to defaults
$ gateclaw soul reset
```

#### Fact Commands

```bash
# Store new fact
$ gateclaw fact store key value
✅ Fact stored: key

# Get specific fact
$ gateclaw fact get key
key: value

# Delete fact
$ gateclaw fact delete key
✅ Fact deleted: key

# List all facts
$ gateclaw facts
🧠 3 fact(s):

  key: value
  another_key: another_value
  my_cat_name: Whiskers
```

#### History Commands

```bash
# View session history
$ gateclaw history default
📜 5 message(s) in session "default":

  [user] What's the weather?
  [assistant] Use tool: http://wttr.in
  [user] List my facts
  [assistant] You have 3 facts: ...
```

#### Quick Commands

```bash
# List providers
$ gateclaw providers ls

# Show soul config
$ gateclaw soul show

# Check daemon
$ gateclaw status

# Launch TUI
$ gateclaw tui

# View help
$ gateclaw --help
```

---

### HTTP API (Programmatic Access)

**Base URL:** `http://localhost:7371`

**Endpoints:**

```bash
# Health check
$ curl http://localhost:7371/health
{"status":"ok","soul":"GateClaw","uptime_ms":3600000,"pid":12345}

# Get all facts
$ curl http://localhost:7371/facts
[{"id":"01KGX...","key":"my_cat_name","value":"Whiskers"}]

# Get specific fact
$ curl http://localhost:7371/fact/my_cat_name
{"id":"01KGX...","key":"my_cat_name","value":"Whiskers"}

# Store fact
$ curl -X POST http://localhost:7371/fact \
  -H "Content-Type: application/json" \
  -d '{"key":"test","value":"hello"}'
{"ok":true}

# Delete fact
$ curl -X DELETE http://localhost:7371/fact/test
{"ok":true}

# Get message history
$ curl http://localhost:7371/messages/default
[{"id":"01KH1...","session_key":"default","role":"user","content":"Hello"}]

# Shutdown daemon
$ curl -X POST http://localhost:7371/shutdown
{"ok":true}
```

**Event Stream (SSE):**

```bash
$ curl -N http://localhost:7371/events
data: {"type":"connected","soul":"GateClaw"}

: keepalive

data: {"type":"fact_stored","key":"test"}
```

---

## 🚀 Usage Examples

### Via Telegram (Primary)

```
You: "What's the weather?"
GateClaw: [calls http tool]
GateClaw: "Currently 22°C in Paris, partly cloudy."

You: "List my facts"
GateClaw: [calls get_all_facts tool]
GateClaw: "You have 3 facts:
  - my_cat_name: Whiskers
  - project: GateClaw
  - favorite_color: blue"

You: "Read config.yml"
GateClaw: [calls read_file tool]
GateClaw: "Contents:
  provider: llama-swap
  endpoint: http://localhost:8888/v1
  ..."

You: "Store fact: deployment = production"
GateClaw: ✅ Fact stored: deployment
```

### Via CLI (Scripting)

```bash
# View facts
$ gateclaw facts
🧠 3 fact(s):

  my_cat_name: Whiskers
  project: GateClaw
  favorite_color: blue

# Store new fact (script-friendly)
$ gateclaw fact store api_key sk-test123
✅ Fact stored: api_key

# Delete fact
$ gateclaw fact delete api_key
✅ Fact deleted: api_key

# Check daemon status (in scripts)
$ gateclaw status
● GateClaw | soul: GateClaw | uptime: 3600s | pid: 12345
echo $?  # Exit code 0 = running

# Automate with pipes
$ echo '{"tool":"store_fact","key":"version","value":"0.1.0"}' | gateclaw
✅ Fact stored: version
```

### Via TUI (Interactive)

```bash
$ gateclaw tui

# Opens TUI
# Model picker (Ctrl+M) → select Claude-4.6-Opus-35B
# Type: "What tools do I have?"
# GateClaw responds with tool list
# Ctrl+T → Tool browser
# Select "read_file" tool
# Type: "Read README.md"
# See streaming response with syntax highlighting
```

### Via HTTP API (Automation)

```bash
# Store fact in deployment script
$ curl -X POST http://localhost:7371/fact \
  -H "Content-Type: application/json" \
  -d '{"key":"deploy_time","value":"'"$(date -Iseconds)"'"}'
{"ok":true}

# Get last deployment
$ curl http://localhost:7371/fact/deploy_time | jq -r .value
2026-03-12T10:30:00+00:00

# Check daemon health in monitoring
$ curl -s http://localhost:7371/health | jq -r .status
ok
$?  # 0 = healthy, non-zero = unhealthy
```

---

## 🛠️ Available Tools

GateClaw has access to these tools via function calling:

| Tool            | Purpose       | Example                  | Permissions   |
| --------------- | ------------- | ------------------------ | ------------- |
| `shell`         | Run commands  | `powershell Get-Process` | All           |
| `read_file`     | Read files    | `cat config.yml`         | All readable  |
| `write_file`    | Write/create  | `echo "" > file.txt`     | Writable dirs |
| `delete_file`   | Remove files  | `rm temp.txt`            | Writable dirs |
| `search_files`  | Grep/search   | `find . -name '*.ts'`    | Readable dirs |
| `http`          | API requests  | `GET /api/users`         | All           |
| `store_fact`    | Save memory   | `key=value`              | All           |
| `get_fact`      | Retrieve fact | `get key`                | All           |
| `get_all_facts` | List memory   | `ls facts`               | All           |

**Tool behavior:**

- Auto-detected based on context
- Requires permission for sensitive ops
- Logged in message history for audit

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GateClaw Entity                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Telegram    │  │     TUI      │  │     CLI      │     │
│  │   Bot        │  │  (Terminal)  │  │  (Commands)  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                   ┌────────▼────────┐                       │
│                   │  Daemon (7371)  │                       │
│                   │  HTTP Server    │                       │
│                   └────────┬────────┘                       │
│                            │                                │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐     │
│  │   Soul       │  │    Memory    │  │   Provider   │     │
│  │  (SOUL.md)   │  │   (SQLite)   │  │  (llama-swap)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Components:**

1. **Orchestrator** (`packages/gateclaw-orchestrator`)
   - HTTP server (port 7371)
   - Telegram bot handler
   - Memory manager (SQLite)
   - Soul config loader

2. **TUI** (`packages/opencode`)
   - Terminal UI via opentui
   - Model picker
   - Session manager

3. **CLI** (`gateclaw` command)
   - Daemon control (`start|stop|restart|status`)
   - Fact management (`store|delete|get`)
   - Soul commands (`init|edit|show|reset`)
   - History viewer

4. **Memory** (`gateclaw.db`)
   - Facts table (key-value)
   - Messages table (session history)
   - Tasks table (scheduled ops)

---

## 🔍 Troubleshooting

### Daemon Not Starting

**Check if running:**

```bash
$ gateclaw status
● GateClaw | soul: GateClaw | uptime: 3600s | pid: 12345

# If offline
$ gateclaw status
○ GateClaw | not running
```

**Start manually:**

```bash
$ gateclaw start
🐾 Starting GateClaw daemon...
✅ GateClaw started (pid 12345)
```

**Check logs:**

```bash
$ gateclaw logs
📋 Tailing C:\Users\uscha\AppData\Roaming\gateclaw\daily.log

[2026-03-12T09:15:19.346Z] BOOT soul=GateClaw pid=18524
[2026-03-12T09:15:20.123Z] 🐾 GateClaw online
soul: GateClaw
pid: 18524
```

**Kill stale process:**

```bash
# Windows
$ taskkill /F /PID 18524

# Linux/macOS
$ kill -9 18524

# Then restart
$ gateclaw start
```

---

### Provider Not Detected

**Test provider endpoint:**

```bash
# llama-swap
$ curl http://localhost:8888/v1/models | jq '.data[].id'
"Claude-4.6-Opus-35B"
"qwen35-4b-heretic"

# Ollama
$ curl http://localhost:11434/api/tags | jq '.models[].name'
"llama3.2:latest"
"qwen2.5:7b"

# LM Studio
$ curl http://localhost:1234/v1/models | jq '.data[].id'
"local-model"
```

**If port not responding:**

1. Start the service (llama-swap / `ollama serve` / LM Studio Server)
2. Check firewall allows local connections
3. Verify no other process bound to port:

   ```bash
   # Windows
   $ netstat -ano | findstr :8888

   # Linux/macOS
   $ lsof -i :8888
   ```

**Manual config:**
Create `~/.config/gateclaw/gateclaw.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "llama-swap": {
      "name": "llama-swap",
      "npm": "@ai-sdk/openai-compatible",
      "models": {
        "Claude-4.6-Opus-35B": {
          "name": "Claude-4.6-Opus-35B",
          "limit": { "context": 262144, "output": 262144 },
        },
      },
      "options": { "baseURL": "http://localhost:8888/v1" },
    },
  },
}
```

---

### Telegram Bot Not Responding

**Quick fix with CLI:**

```bash
# Verify token and chat ID
gateclaw telegram verify

# Auto-detect chat ID if not set
gateclaw telegram autoid

# Send test message
gateclaw telegram test

# If needed, reset and reconfigure
gateclaw telegram reset
gateclaw telegram setup
```

**Check credentials:**

```bash
# Config location: ~/.config/gateclaw/.env (or %APPDATA%/gateclaw/.env on Windows)
cat ~/.config/gateclaw/.env
# GATECLAW_TELEGRAM_TOKEN="your-token"
# GATECLAW_TELEGRAM_CHAT_ID="your-chat-id"
```

**Test token with CLI:**

```bash
gateclaw telegram status
# Output: Bot: @YourBotName | Chat ID: 987654321 | Status: ready
```

**Restart daemon:**

```bash
gateclaw restart
🛑 Stopped (pid 12345)
✅ GateClaw restarted (pid 12346)

# Message bot on Telegram
You: "/start"
GateClaw: 🐾 GateClaw online
```

---

### Memory Issues

**Check database:**

```bash
# Windows
$ ls C:\Users\uscha\AppData\Local\gateclaw\gateclaw.db

# Linux
$ ls ~/.local/share/gateclaw/gateclaw.db

# macOS
$ ls ~/Library/Application\ Support/gateclaw/gateclaw.db
```

**View facts:**

```bash
$ gateclaw facts
🧠 3 fact(s):

  my_cat_name: Whiskers
  project: GateClaw
  favorite_color: blue
```

**SQLite direct query:**

```bash
$ sqlite3 ~/.local/share/gateclaw/gateclaw.db
SQLite version 3.45.0
Enter ".help" for usage hints.

sqlite> SELECT * FROM gc_fact;
01KGX...|my_cat_name|Whiskers|1773315595715|1773315595715
01KGY...|project|GateClaw|1773315600000|1773315600000
01KGZ...|favorite_color|blue|1773315610000|1773315610000

sqlite> SELECT COUNT(*) FROM gc_message;
42
```

**Backup & reset (last resort):**

```bash
# Backup
$ cp ~/.local/share/gateclaw/gateclaw.db gateclaw.db.backup

# Reset
$ rm ~/.local/share/gateclaw/gateclaw.db

# Restart
$ gateclaw restart
```

---

### TUI Display Issues

**Terminal requirements:**

- True color support (24-bit)
- Unicode fonts (for box-drawing chars)
- Modern terminal (Windows Terminal, iTerm2, gnome-terminal)

**Check capabilities:**

```bash
$ echo $COLORTERM
truecolor

$ echo $TERM
xterm-256color
```

**Fallback:**

```bash
# Disable colors
$ GATECLAW_NO_COLOR=1 gateclaw tui

# Simple mode
$ GATECLAW_SIMPLE=1 gateclaw tui
```

---

## 📦 Installation Scripts

### System Services

**Linux (systemd):**

```bash
# Install service
$ sudo cp script/gateclaw.service /etc/systemd/system/
$ sudo systemctl daemon-reload
$ sudo systemctl enable gateclaw
$ sudo systemctl start gateclaw
$ systemctl status gateclaw
● gateclaw.service - GateClaw Daemon
   Loaded: loaded (/etc/systemd/system/gateclaw.service, enabled)
   Active: active (running)
```

**macOS (launchd):**

```bash
# Install plist
$ cp script/gateclaw.plist ~/Library/LaunchAgents/
$ launchctl load ~/Library/LaunchAgents/gateclaw.plist
$ launchctl start ai.gateclaw.daemon
```

**Windows (Task Scheduler):**

```powershell
# Run as admin
> gateclaw install
✓ GateClaw will start on login

# Uninstall
> gateclaw uninstall
✓ Auto-start removed
```

---

### Shell Completion

**Bash:**

```bash
# Add to ~/.bashrc
echo 'source <(gateclaw --completion)' >> ~/.bashrc
source ~/.bashrc
```

**Zsh:**

```bash
# Add to ~/.zshrc
echo 'source <(gateclaw --completion)' >> ~/.zshrc
source ~/.zshrc
```

**PowerShell:**

```powershell
# Run in admin
gateclaw --completion | Out-File -FilePath $PROFILE
. $PROFILE
```

---

## 🤝 Contributing

### Development Setup

```bash
# Clone
$ git clone https://github.com/ai-joe-git/GateClaw.git
$ cd GateClaw

# Install dependencies
$ bun install

# Run typecheck
$ bun turbo typecheck

# Run tests
$ cd packages/gateclaw-orchestrator && bun test
$ cd packages/opencode && bun test

# Dev mode
$ bun dev              # Root: opencode CLI
$ bun dev:desktop      # Tauri desktop
$ bun dev:web          # Web app
```

### Submitting PRs

1. **Branch from `dev`**

   ```bash
   $ git checkout dev
   $ git checkout -b feature/telegram-v2
   ```

2. **Run checks**

   ```bash
   $ bun turbo typecheck
   $ bun test
   ```

3. **Commit convention**

   ```
   feat: add Telegram v2 support
   fix: correct soul init prompt
   docs: update CLI examples
   chore: bump version to 0.1.1
   ```

4. **Submit PR to `dev` branch**
   - Link to issue/task
   - Include screenshots if UI changes
   - Note breaking changes

---

## 📄 License

**MIT License** — See [LICENSE](LICENSE) for details.

**TL;DR:**

- ✅ Free to use, modify, distribute
- ✅ Commercial use allowed
- ✅ Private forks allowed
- ❌ No warranty
- ❌ No liability

---

## 👥 Credits

**GateClaw** is a resident AI entity forked from [OpenCode](https://github.com/anomalyco/opencode).

**Built with:**

- [opentui](https://github.com/opentui/opentui) - Terminal UI framework
- [SolidJS](https://www.solidjs.com/) - Reactive UI library
- [Bun](https://bun.sh/) - JavaScript runtime & package manager
- [Drizzle ORM](https://orm.drizzle.team/) - SQLite/Postgres ORM
- [Hono](https://hono.dev/) - HTTP server framework
- [Effect](https://effect.website/) - Functional error handling
- [Zod](https://zod.dev/) - Runtime validation

**Interfaces:**

- **Telegram** - Native bot integration
- **Tauri** - Desktop app framework (opencode-desktop)
- **Electron** - Alternative desktop (opencode-desktop-electron)

**AI Providers:**

- llama-swap, Ollama, LM Studio (local)
- Anthropic, OpenAI, Google (cloud)

---

## 🙏 Thanks to

- **OpenCode team** — [anomalyco/opencode](https://github.com/anomalyco/opencode)
- **Terminal UI** — opentui community
- **AI models** — llama-swap, Ollama, LM Studio users

---

## 📮 Contact

- **GitHub:** https://github.com/ai-joe-git/GateClaw
- **Issues:** Report bugs, request features
- **Discussions:** Share setups, model configs

**Resident AI. Local Control. Zero Bullshit.** 🐾

---

<div align="center">

**⚡ Quick Start:** `curl -fsSL https://raw.githubusercontent.com/ai-joe-git/GateClaw/dev/install | bash`

**🐾 GateClaw entity — lives on your machine, remembers everything, takes initiative**

</div>
