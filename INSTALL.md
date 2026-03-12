# GateClaw Installation Guide

**Fresh machine → Resident AI in 5 minutes**

Version: 0.1.0-beta | Repository: https://github.com/ai-joe-git/GateClaw

---

## Step 1: Install Bun

GateClaw requires **Bun** (JavaScript runtime):

### macOS/Linux

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or ~/.zshrc
```

### Windows (PowerShell)

```powershell
powershell -c "iwr https://bun.sh/install.ps1 -useb | iex"
```

### Verify

```bash
bun --version
# Should print version
```

---

## Step 2: Choose Provider

GateClaw needs an **OpenAI-compatible API**:

```
                    Need AI inference?
                          │
              ┌───────────┴───────────┐
              │                       │
         Want privacy?          Want fast setup?
              │                       │
      ┌───────┴───────┐          ┌────┴────┐
      │               │          │         │
   llama-swap     Ollama     Anthropic  OpenAI
   (fastest)      (simple)   (best)     (popular)
```

### Local (Recommended ✓)

**llama-swap** (what you're using):

- Fast, multi-model switching
- Port: `8888`
- Models: Your current 11-model setup

**Ollama**:

```bash
# Install
curl -fsSL https://ollama.com/install.sh | sh

# Pull model
ollama pull qwen2.5:7b

# Start
ollama serve
```

**LM Studio**:

- Download: https://lmstudio.ai
- GUI-based
- Server: Port `1234`

### Cloud (Fast, Costs)

**Anthropic** (Claude):

- API key: https://console.anthropic.com
- Best quality, privacy-safe
- Cost: ~$1-10/month for light usage

**OpenAI** (GPT):

- API key: https://platform.openai.com
- Most popular, good docs
- Cost: ~$5-20/month

---

## Step 3: Run Installer

```bash
curl -fsSL https://raw.githubusercontent.com/ai-joe-git/GateClaw/main/install | bash
```

**Interactive prompts:**

### A. Provider Detection

```
Provider detected: llama-swap
Generate config? [Y/n] Y
```

### B. Model Selection

```
Models:
  1. Claude-4.6-Opus-35B
  2. qwen35-4b-heretic
  3. Claude-4.6-Opus-2B
  ...

Select (nums space-sep or 'a'): a
# Or: 1 2 3 (specific models)
```

**Result:**

```
Config generated: ~/.config/gateclaw/gateclaw.jsonc
✓ 11 models configured
```

### C. Telegram Setup

```
🐾 Telegram Setup
1. Message @BotFather
2. /newbot
3. Copy token
4. Message bot, get chat_id

Token: 7890123456:ABCdefGHIjkl...
Chat ID: 123456789

✓ Telegram configured!
```

### D. Clone & Build

```
Cloning...
bun install...
Building...
✓ Installation complete!
```

### E. PATH Setup

```
Added to PATH: ~/.bashrc
Exported to current shell
```

**Done:**

```
                ▄
█▀▀█ █▀▀█ █▀▀█ █▀▀▄ █▀▀▀ █▀▀█ █▀▀█ █▀▀█
█░░█ █░░█ █▀▀▀ █░░█ █░░░ █░░█ █░░█ █▀▀▀
▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀  ▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀

GateClaw 0.1.0-beta - Resident AI
✓ Installation complete!

Next: source ~/.bashrc && gateclaw
```

---

## Step 4: First Run Verification

### Check daemon

```bash
gateclaw
# Starts daemon on localhost:7371
```

### Verify PID

```bash
cat ~/.config/g
```
