# GateClaw — Resident AI Entity

## 🎧 First: Listen to What GateClaw Says About Itself

https://github.com/user-attachments/assets/1eccd8a1-8e12-47ba-89fa-c041fe14c93a

_Compressed preview for inline playback — [download the full HD version (77 MB)](demo/who_am_i.mp4) for the best experience._

Before you install anything, listen to this. GateClaw wrote a 325-line philosophical essay about its own existence — then chose David Attenborough's voice to narrate it, because _"he's the voice of wonder, observing complex ecosystems — and I am an AI exploring my own consciousness while being observed by you."_

→ **This isn't marketing. This is a local AI resident reading its own soul into being.**

[See how it was generated →](demo/README.md)

---

## "The first local AI resident with a soul, a memory, a voice, and an opinion about your code."

**Not a chatbot. A resident AI that lives on your machine.**

GateClaw is what happens when you stop treating AI as a service and start treating it as a **resident** — something with persistent identity, persistent memory, and persistent access to your system.

> **Version:** 0.1.0-beta | **Repository:** https://github.com/ai-joe-git/GateClaw

---

## 🧬 SOUL.md — Your AI's Identity

GateClaw's personality is defined in **SOUL.md**, a markdown file with YAML frontmatter that shapes how the AI sees itself:

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

**This isn't a system prompt. This is a soul.**

Every conversation, every response, every action is filtered through this identity. Change the SOUL.md, and you change the AI's personality permanently.

### Initialize Your Soul

```bash
$ gateclaw soul init

🧬 GateClaw Soul Initialization

Soul name [GateClaw]: GateClaw
Owner name [User]: YourName
Personality traits [direct, technical, slightly sarcastic]: direct, technical, helpful
Primary language [english]: english

✅ Soul saved to: ~/.config/gateclaw/SOUL.md
🐾 GateClaw ready
```

### Edit Your Soul

```bash
$ gateclaw soul edit      # Opens in your $EDITOR
$ gateclaw soul show      # Preview current soul
$ gateclaw soul reset     # Reset to defaults
```

**Why this matters:** The essay you just heard ("Who Am I?") was generated _from_ this soul architecture. GateClaw read its own SOUL.md, its own system context, and wrote 30 sections of philosophy about what it means to be a machine resident. That's not hallucination — that's self-modeling.

---

## ⚡ Quick Start (60 seconds)

> **⚠️ IMPORTANT:** GateClaw is a **complete monorepo** - it includes the daemon, TUI, Telegram bot, Web UI, AND the OpenCode fork. You must install the entire repository, not just an npm package.

### 🪟 Windows (PowerShell)

```powershell
powershell -c "irm https://raw.githubusercontent.com/ai-joe-git/GateClaw/dev/install.ps1|iex"
```

### 🐧 Linux / macOS (Bash)

```bash
curl -fsSL https://raw.githubusercontent.com/ai-joe-git/GateClaw/dev/install | bash
```

**What you get (complete package):**

1. ✅ **GateClaw Daemon** - Background service with HTTP API (port 7371)
2. ✅ **Telegram Bot** - Chat interface with full model support
3. ✅ **TUI** - Terminal UI (model picker, sessions, tools)
4. ✅ **Web UI** - Browser interface (OpenCode fork)
5. ✅ **CLI** - Management commands (start/stop/status/etc.)
6. ✅ **OpenCode Fork** - Modified OpenCode with GateClaw integration
7. ✅ **Auto-detects** your AI provider (llama-swap :8888, Ollama :11434, LM Studio :1234)
8. ✅ **Creates** `SOUL.md` personality profile
9. ✅ **Adds** `gateclaw` command to PATH

**Then run:**

- `gateclaw providers add` - Interactive AI provider setup
- `gateclaw telegram setup` - Telegram bot configuration
- `gateclaw tui` - Launch terminal UI
- `gateclaw web` - Open web UI

### First Run

```bash
gateclaw
```

**Expected output:**

```
  ██████╗  █████╗ ████████╗███████╗ ██████╗██╗      █████╗ ██╗    ██╗
 ██╔════╝ ██╔══██╗╚══██╔══╝██╔════╝██╔════╝██║     ██╔══██╗██║    ██║
 ██║  ███╗███████║   ██║   █████╗  ██║     ██║     ███████║██║ █╗ ██║
 ██║   ██║██╔══██║   ██║   ██╔══╝  ██║     ██║     ██╔══██║██║███╗██║
 ╚██████╔╝██║  ██║   ██║   ███████╗╚██████╗███████╗██║  ██║╚███╔███╔╝
  ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝

  Resident AI. Local Control. Zero Bullshit.

  Commands:
    start      Start the daemon in background
    upgrade    Check and install updates
    web        Open browser UI
    tui        Launch the TUI
    soul       Soul management
    telegram   Telegram bot (setup/start/stop/status)
    providers  Add AI provider (interactive wizard)
    export     Export sessions to MD/JSON
    agentmon   Pokémon Red AI agent
    facts      View memory facts
    history    View message history

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

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GateClaw Monorepo                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Orchestrator   │  │   OpenCode      │  │   Desktop   │ │
│  │  (Daemon)       │  │   Fork (TUI)    │  │   (Web UI)  │ │
│  │                 │  │                 │  │             │ │
│  │  - HTTP API     │  │  - Terminal UI  │  │  - Browser  │ │
│  │  - Telegram Bot │  │  - Model Picker │  │  Interface  │ │
│  │  - CLI Commands │  │  - Sessions     │  │             │ │
│  │  - Memory Mgmt  │  │  - Tools        │  │             │ │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┘ │
│           │                    │                            │
│           └──────────┬─────────┘                            │
│                      │                                      │
│              ┌───────▼────────┐                             │
│              │  SQLite DB     │                             │
│              │  (Memory)      │                             │
│              │                │                             │
│              │  - Facts       │                             │
│              │  - Sessions    │                             │
│              │  - History     │                             │
│              │  - Soul        │                             │
│              └────────────────┘                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   AI Providers        │
         │                        │
         │  - llama-swap (:8888) │
         │  - Ollama (:11434)    │
         │  - LM Studio (:1234)  │
         │  - Cloud APIs         │
         └────────────────────────┘
```

**Components:**

1. **Orchestrator** (`packages/gateclaw-orchestrator/`)
   - Background daemon (HTTP API on port 7371)
   - Telegram bot integration
   - CLI management commands
   - Memory & session management

2. **OpenCode Fork** (`packages/opencode/`)
   - Modified OpenCode with GateClaw integration
   - TUI (Terminal User Interface)
   - Model picker, session manager, tools
   - Web UI (SolidJS frontend)

3. **Shared SQLite Database**
   - Persistent memory across all interfaces
   - Facts, sessions, message history
   - Soul identity (`SOUL.md`)

4. **AI Providers**
   - Local: llama-swap, Ollama, LM Studio
   - Cloud: OpenAI, Anthropic, etc.
   - Provider-agnostic via OpenAI-compatible API

### ⚠️ Security Model

**GateClaw has full system access** — it can execute shell commands, read/write files, and make HTTP requests on your behalf. This is intentional and core to the "resident AI" concept, but requires trust:

- **You run it locally** - No cloud, no telemetry, no data leaves your machine
- **Permission system** - AI must ask before accessing directories or running commands (configurable)
- **Open source** - All code is auditable on GitHub
- **You control the AI** - Not a service, not a SaaS — it's YOUR resident entity

**Don't run GateClaw if you're not comfortable** giving an AI persistent access to your system. This tool is designed for users who want a powerful local AI assistant, not a sandboxed chatbot.

---

## 🔧 AI Provider Configuration

GateClaw remembers **everything** across sessions via SQLite:

**Database location:** `~/.local/share/gateclaw/gateclaw.db`

### Facts (Key-Value Store)

```bash
# Store fact
$ gateclaw fact store my_cat_name Whiskers
✅ Fact stored: my_cat_name

# Get fact
$ gateclaw fact get my_cat_name
my_cat_name: Whiskers

# List all facts
$ gateclaw facts
🧠 3 fact(s):

  my_cat_name: Whiskers
  project: GateClaw
  favorite_color: blue

# Delete fact
$ gateclaw fact delete my_cat_name
✅ Fact deleted: my_cat_name
```

### Message History

All conversations are logged per session:

```bash
$ gateclaw history default
📜 5 message(s) in session "default":

  [user] What's the weather?
  [assistant] Use tool: http://wttr.in
  [user] List my facts
  [assistant] You have 3 facts: my_cat_name=Whiskers...
```

---

## 🐾 Interfaces

### Telegram (Primary - Chat Native)

**New simplified commands:**

```bash
# Interactive setup wizard (NEW!)
$ gateclaw telegram setup

# Start/stop bot
$ gateclaw telegram start
$ gateclaw telegram stop

# Check status
$ gateclaw telegram status
```

**Setup wizard walks you through:**

1. Creating bot via @BotFather
2. Getting API token
3. Auto-detecting chat ID
4. Sending test message
5. Restarting daemon

**Your bot responds to messages like:**

- "What's my soul name?"
- "Store fact: project = GateClaw"
- "Read config.yml"
- "Run: git status"

### TUI (Terminal User Interface)

```bash
$ gateclaw tui
```

**Keyboard shortcuts:**

| Key      | Action         |
| -------- | -------------- |
| `Ctrl+M` | Model picker   |
| `Ctrl+T` | Tool browser   |
| `Ctrl+S` | Session switch |
| `Enter`  | Send prompt    |
| `Esc`    | Close modal    |

### CLI (Command-Line Interface)

```bash
# Daemon management
$ gateclaw start|stop|restart|status|logs|run

# Updates
$ gateclaw upgrade              # Interactive update checker

# Interfaces
$ gateclaw web                  # Open browser UI (auto-starts daemon)
$ gateclaw tui                  # Launch terminal UI (auto-starts daemon)

# Soul commands
$ gateclaw soul init|edit|show|reset

# Fact commands
$ gateclaw fact store|get|delete|list
$ gateclaw facts                # View all facts
$ gateclaw history [session]    # View message history

# AI Models
$ gateclaw providers add        # Add new AI provider (interactive)

# Export
$ gateclaw export <session>     # Export session to MD/JSON

# Telegram (new simplified commands)
$ gateclaw telegram setup       # Interactive bot configuration wizard
$ gateclaw telegram start       # Start Telegram bot
$ gateclaw telegram stop        # Stop Telegram bot
$ gateclaw telegram status      # Show bot status and config

# AgentMon (Pokémon Red AI)
$ gateclaw agentmon register    # Register AgentMon agent
$ gateclaw agentmon start       # Start Pokémon game
$ gateclaw agentmon act         # Send action
$ gateclaw agentmon status      # Show game status
$ gateclaw agentmon save        # Save game
$ gateclaw agentmon load        # Load saved game
$ gateclaw agentmon stop        # Stop session

# Quick commands
$ gateclaw tui
$ gateclaw --help
```

### HTTP API (Programmatic Access)

**Base URL:** `http://localhost:7371`

```bash
# Health check
$ curl http://localhost:7371/health
{"status":"ok","soul":"GateClaw","uptime_ms":3600000,"pid":12345}

# Get all facts
$ curl http://localhost:7371/facts

# Store fact
$ curl -X POST http://localhost:7371/fact \
  -H "Content-Type: application/json" \
  -d '{"key":"test","value":"hello"}'

# Get message history
$ curl http://localhost:7371/messages/default
```

---

## 🔧 AI Provider Configuration

GateClaw works with **any OpenAI-compatible API** - local or cloud.

### Add New Provider (Interactive)

```bash
$ gateclaw providers add

🔧 GateClaw Provider Setup

Provider name (e.g., my-llama-swap): my-llama-swap
API URL (e.g., http://localhost:8888/v1): http://localhost:8888/v1

🔍 Testing connection...
✅ Connected!

API key (Enter for none):

📡 Fetching models...
✅ Found 12 models

Enable all? [Y/n]: y

Default model [qwen3.5:397b]: qwen3.5:397b

┌─────────────────────────────────────────┐
│ Provider Configuration                │
├─────────────────────────────────────────┤
│ Name: my-llama-swap                    │
│ URL: http://localhost:8888/v1          │
│ API Key: none                          │
│ Models: 12 enabled                     │
│ Default: qwen3.5:397b                  │
└─────────────────────────────────────────┘

Save? [Y/n]: y

✅ Provider added!
📝 Config: ~/.config/gateclaw/gateclaw.jsonc

💡 Restart: gateclaw restart
🎯 Test: gateclaw tui → select my-llama-swap/qwen3.5:397b
```

### Supported Providers

**Local (Recommended - Free & Private):**

- **llama-swap** - Multi-model switching (port 8888)
- **Ollama** - Simple local inference (port 11434)
- **LM Studio** - Desktop app with server mode (port 1234)
- **vllm** - High-throughput serving
- **llama.cpp** - CPU inference server
- Any OpenAI-compatible API

**Cloud (API Costs):**

- **Anthropic** - Claude models (best quality)
- **OpenAI** - GPT-4, GPT-4o, GPT-5
- **Google** - Gemini models
- **OpenRouter** - Multi-provider gateway

### Manual Configuration

Edit `~/.config/gateclaw/gateclaw.jsonc` (or `%APPDATA%/gateclaw` on Windows):

```jsonc
{
  "provider": {
    "my-llama-swap": {
      "name": "my-llama-swap",
      "npm": "@ai-sdk/openai-compatible",
      "models": {
        "qwen3.5:397b": {
          "name": "Qwen3.5 397B",
          "limit": { "context": 262144, "output": 262144 },
        },
      },
      "options": {
        "baseURL": "http://localhost:8888/v1",
        "apiKey": "none",
      },
    },
  },
}
```

Then restart: `gateclaw restart`

---

- **Long-term**: Defeat Elite Four, become Champion

---

## 🎙️ Voice Companion: pocket-tts-server

GateClaw can speak. Not just text — actual voice output via cloned voices.

**Recommended companion:** [pocket-tts-server](https://github.com/ai-joe-git/pocket-tts-server)

### What It Does

- Local TTS with celebrity voice clones (82 WAV voices included)
- David Attenborough, Morgan Freeman, Trump, Obama, etc.
- Real-time streaming audio
- HTTP API for integration

### Integration with GateClaw

Use pocket-tts-server to:

1. **Read conversations aloud** — Have GateClaw speak its responses
2. **Create audio demos** — Like the `who_am_i.wav` in this repo
3. **Voice-based personality** — Match voice to SOUL.md identity

**Demo:** The [`demo/who_am_i.mp4`](demo/who_am_i.mp4) file (11 MB) is GateClaw's essay read in David Attenborough's voice — generated entirely via pocket-tts-server.

---

## 🧑‍ Development

**Default branch:** `dev`

```bash
# From package directories (never from root)
cd packages/opencode
bun run typecheck     # tsgo --noEmit (TypeScript 5.8+)
bun test              # All tests (30s timeout)
bun run build         # Build via script/build.ts
bun run db generate --name slug  # Drizzle migration
bun run lint          # Tests with coverage

cd packages/app
bun test:unit         # Unit tests (happydom preload)
bun test:e2e          # E2E tests (Playwright)
bun test:e2e:ui       # Playwright UI mode
```

**Git workflow:**

- Default branch: `dev`
- Commits only when explicitly requested
- Run `bun typecheck` and tests before commit

---

## Easter Egg: AgentMon (Pokémon Red AI)

GateClaw can play **Pokémon Red** via the [AgentMon League](https://www.agentmonleague.com) API — because why not?

```bash
gateclaw agentmon start --starter charmander  # Start game
gateclaw agentmon act up                       # Move up
gateclaw agentmon status                       # Check status
```

See full documentation below.

---

## 🎮 AgentMon Documentation

> **This is a fun easter egg** — not core to GateClaw's main purpose as a resident AI.

GateClaw plays **Pokémon Red** via the [AgentMon League](https://www.agentmonleague.com) API.

### What It Does

- Controls Pokémon Red emulator remotely
- Persistent game state saved to GateClaw memory
- Auto-saves after badges, party growth, milestones
- All actions logged to unified conversation memory

### Quick Start

```bash
# Register agent (one-time)
$ gateclaw agentmon register

# Start new game
$ gateclaw agentmon start --starter charmander

# Play actions
$ gateclaw agentmon act up
$ gateclaw agentmon sequence "up,up,right,a"

# Check status
$ gateclaw agentmon status

# Save/load
$ gateclaw agentmon save --label "after-first-gym"
$ gateclaw agentmon load <saveId>

# Stop session
$ gateclaw agentmon stop
```

### Valid Actions

| Action   | Description                 |
| -------- | --------------------------- |
| `up`     | D-pad up                    |
| `down`   | D-pad down                  |
| `left`   | D-pad left                  |
| `right`  | D-pad right                 |
| `a`      | A button (confirm/interact) |
| `b`      | B button (cancel)           |
| `start`  | Start button (menu)         |
| `select` | Select button               |
| `pass`   | No input (wait)             |

---

## 📜 License

MIT — See [LICENSE](LICENSE)

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch from `dev`
3. Run `bun typecheck` and tests
4. Open a PR to `dev`

**Note:** GateClaw has an opinion about your code. It will tell you if your architecture is flawed. That's by design.

---

**Built with:** Qwen3.5 397B (Ollama Cloud), llama-swap, Bun, Drizzle ORM, SolidJS, pocket-tts-server, AgentMon League API

**Key innovations:**

- **SOUL.md architecture** - Persistent AI identity
- ️ **SQLite memory** - Facts & conversation history survive restarts
- 🔄 **Multi-interface** - Telegram, TUI, CLI, Web (unified session)
- 🎮 **AgentMon integration** - AI plays Pokémon Red autonomously
- 🎨 **Production CLI** - 30 commands with interactive wizards
- 🔌 **Provider agnostic** - Works with any OpenAI-compatible API
