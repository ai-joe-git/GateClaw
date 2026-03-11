# GateClaw

**Resident AI. Local Control. Zero Bullshit.**

## Overview
GateClaw is a local AI agent designed to live on your machine and get things done. It's not a chatbot you talk to for fun; it's a tool you use to execute tasks, manage files, and control your environment. Think of it as a digital sysadmin that actually knows what it's doing.

## Core Architecture

- **Base Model**: Built on the OpenCode codebase for reliable code generation and logical reasoning.
- **Inference Engine**: Runs locally via `llama-swap`, ensuring all processing stays on your hardware with zero latency to external servers.
- **Interface**: Communicates via Telegram. Send commands, get logs, monitor status — all from your phone or desktop Telegram client.
- **Memory**: Persistent memory system. GateClaw remembers context, facts, and task history across sessions. It doesn't forget what you told it yesterday.

## Capabilities

GateClaw has full tool access to interact with your system directly:

- **Shell Execution**: Run PowerShell commands, scripts, and system utilities.
- **Filesystem Control**: Read, write, delete, move, and search files with precision.
- **HTTP Operations**: Fetch resources, send API requests, interact with web services.
- **Persistent Memory**: Store, retrieve, and manage facts indefinitely.

## Hardware Requirements

- **CPU/GPU**: Optimized for Intel Arc hardware (iGPU). Runs efficiently on integrated graphics.
- **Location**: Local execution only. No cloud dependencies. Your data stays on your machine.

## Quick Start

```bash
# Install dependencies
bun install

# Set environment variables
GATECLAW_TELEGRAM_TOKEN=your_token
GATECLAW_TELEGRAM_CHAT_ID=your_chat_id

# Start the agent
bun run packages/gateclaw-orchestrator/src/index.ts
```

## Project Structure

```
packages/
  gateclaw-orchestrator/   # Core agent (Telegram, tools, memory, soul)
  opencode/                # TUI + HTTP server base (OpenCode fork)
```

## Installation

1. Clone this repo.
2. Configure `llama-swap` to serve your model.
3. Set up the Telegram bot token and chat ID in the environment.
4. Ensure Intel Arc drivers are up to date for optimal performance.

## Usage

Start the agent and interact via Telegram. GateClaw will respond to commands like:
- "Check system logs"
- "Read the last 5 lines of config.yml"
- "Run a PowerShell script named setup.ps1"

## Warning

GateClaw has full filesystem and shell access. It can break things if you give it bad instructions. Use at your own risk. Always verify before executing destructive commands.

---
*Version 1.0 | Resident ID: GateClaw | Status: Online*