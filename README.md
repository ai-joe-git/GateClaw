# GateClaw - Resident AI Entity

**Not a chatbot. A resident AI that lives on your machine.**  
**Telegram-native · Memory-persistent · Soul-identified**

**Version:** 0.1.0-beta | **Repository:** https://github.com/ai-joe-git/GateClaw

---

## 🎯 What Is GateClaw?

GateClaw is **ONE resident AI entity** with multiple interfaces:

## 🎯 What Is GateClaw?

GateClaw is **ONE resident AI entity** with multiple interfaces:

| Interface    | Purpose                  | Primary? |
| ------------ | ------------------------ | -------- |
| **Telegram** | Chat-native, mobile      | ✅ Yes   |
| **TUI**      | Terminal interactive     | ✅ Equal |
| **CLI**      | Scripting/automation     | ✅ Equal |
| **HTTP API** | Programmatic (port 7371) | ✅ Equal |

**What makes it unique:**

- ✅ **Resident daemon** - Lives on your machine, background service
- ✅ **Persistent memory** - SQLite facts & history survive restarts
- ✅ **Soul identity** - Customizable personality (`SOUL.md`)
- ✅ **Multi-interface** - All equal, same entity
- ✅ **Full system access** - Shell, filesystem, HTTP, memory ops

---

## 🔧 Provider Setup

GateClaw works with **any OpenAI-compatible API**:

### Local (Privacy, Zero Cost) ✓ Recommended

**llama-swap** (your current setup):

- Fast model switching
- Local execution
- Your config: `http://localhost:8888/v1`

**Ollama**:

```bash
ollama pull qwen2.5:7b
ollama serve
```

**LM Studio**:

- GUI-based
- Windows/macOS
- Server mode: `http://localhost:1234/v1`

### Cloud (Fast Setup, API Costs)

**Anthropic** (Claude - best quality):

```jsonc
{
  "provider": {
    "anthropic": {
      "options": { "apiKey": "sk-ant-..." },
    },
  },
}
```

**OpenAI** (GPT - most popular):

```jsonc
{
  "provider": {
    "openai": {
      "options": { "apiKey": "sk-..." },
    },
  },
}
```

**Google** (Gemini/Vertex):

```jsonc
{
  "provider": {
    "google": {
      "options": { "apiKey": "..." },
    },
  },
}
```

---

## 📋 Configuration

### gateclaw.jsonc

Location: `~/.config/gateclaw/gateclaw.jsonc`

**Auto-generated example** (installer detected your llama-swap):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "llama-swap": {
      "name": "llama-swap",
      "npm": "@ai-sdk/openai-compatible",
      "models": {
        "Claude-4.6-Opus-35B": { "name": "Claude-4.6-Opus-35B", "limit": { "context": 262144, "output": 262144 } },
        "qwen35-4b-heretic": { "name": "Qwen3.5-4B Heretic", "limit": { "context": 262144, "output": 262144 } },
      },
      "options": { "baseURL": "http://localhost:8888/v1" },
    },
  },
}
```

### SOUL.md (Soul Identity)

Location: `~/.config/gateclaw/SOUL.md`

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
```

**Customize:**

```bash
gateclaw soul init
# Interactive prompts → regenerates SOUL.md
```

---

## 🧠 Memory System

GateClaw remembers **everything** across sessions:

### Facts (Key-Value)

- Stored in SQLite (`~/.local/share/gateclaw/gateclaw.db`)
- Persistent across restarts
- Tools: `store_fact`, `get_fact`, `get_all_facts`

**Store fact:**

```
/Telegram: "Store fact: my_cat_name = Whiskers"
GateClaw: ✅ Fact stored: my_cat_name
```

**View all:**

```bash
gateclaw facts
# Lists all facts
```

### Message History

- All conversations logged
- Session continuity
- Context persistence

---

## 🐾 Interfaces

### Telegram (Primary)

- Message your bot
- Responds instantly
- Full tool access

**Setup during install:**

1. @BotFather → `/newbot`
2. Name your bot
3. Get token → paste to installer
4. Message bot → get chat_id → paste

### TUI

```bash
gateclaw
# Interactive terminal UI
# Model picker, session manager, tool palette
```

### CLI

```bash
gateclaw providers ls  # List providers
gateclaw facts         # View facts
gateclaw soul show     # Show soul config
gateclaw memory        # Memory ops
gateclaw status        # Daemon status
```

### HTTP API

```bash
curl http://localhost:7371/facts
# Returns all facts as JSON
```

---

## 🚀 Usage Examples

### via Telegram

```
You: "What's the weather?"
GateClaw: "Use tool: http://wttr.in"

You: "List my facts"
GateClaw: [calls get_all_facts tool]
GateClaw: "You have 3 facts: ..."

You: "Read config.yml"
GateClaw: [calls read_file tool]
GateClaw: "Contents: ..."
```

### via CLI

```bash
# View facts
gateclaw facts

# Store new fact
echo '{"tool":"store_fact","key":"project","value":"GateClaw"}' | gateclaw

# Check daemon
gateclaw status

# Show soul
gateclaw soul show
```

### via TUI

```bash
gateclaw
# Opens TUI
# Ctrl+M: Model picker
# Ctrl+T: Tool browser
# Enter: Send prompt
```

---

## 🛠️ Tools

GateClaw has access to:

| Tool            | Purpose       | Example                  |
| --------------- | ------------- | ------------------------ |
| `shell`         | Run commands  | `powershell Get-Process` |
| `read_file`     | Read files    | `cat config.yml`         |
| `write_file`    | Write/create  | `echo "" > file.txt`     |
| `delete_file`   | Remove files  | `rm temp.txt`            |
| `search_files`  | Grep/search   | `find . -name '*.ts'`    |
| `http`          | API requests  | `GET /api/users`         |
| `store_fact`    | Save memory   | `key=value`              |
| `get_fact`      | Retrieve fact | `get key`                |
| `get_all_facts` | List memory   | `ls facts`               |

---

## 🔍 Troubleshooting

### Not responding?

```bash
# Check daemon running
cat ~/.config/gateclaw/daemon.pid

# Check logs
tail -f ~/.config/gateclaw/daily.log

# Test provider
curl http://localhost:8888/v1/models | jq

# Restart
pkill -f gateclaw
gateclaw
```

### Provider not detected?

1. Ensure service running (llama-swap/Ollama)
2. Check port (8888/11434/1234)
3. Manually create `gateclaw.jsonc`

### Telegram not working?

1. Check token in `~/.config/gateclaw/.env`
2. Verify bot responds on Telegram
3. Check `GATECLAW_TELEGRAM_CHAT_ID`

### Memory issues?

```bash
# Location
ls ~/.local/share/gateclaw/gateclaw.db

# View facts
gateclaw facts

# Reset (last resort)
rm ~/.local/share/g
```
