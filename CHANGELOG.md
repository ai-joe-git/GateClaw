# Changelog

All notable changes to GateClaw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0-beta] - 2026-03-16

### 🎉 Added

- **Cloud model support in Telegram** - Show ALL favorited models including cloud providers (nvidia, ollama-cloud, opencode)
- **Windows PowerShell installer** - One-line install: `powershell -c "irm gateclaw.ai/install.ps1|iex"`
- **Model manager logging** - Shows which cloud models aren't in gateclaw.jsonc config
- **Increased daemon startup timeout** - 7.5s → 15s to prevent false warnings on Windows

### 🔧 Fixed

- **TUI state path** - Now writes to `%LOCALAPPDATA%\gateclaw\model.json` (not OpenCode's path)
- **Daemon model path** - Reads from correct `%LOCALAPPDATA%\gateclaw\model.json`
- **Catalog filtering** - Disabled for Telegram bot, shows all user favorites
- **Startup warning** - Eliminated "Daemon started but not responding yet" false positive

### 📦 Changed

- **Package name** - `@gateclaw/orchestrator` → `gateclaw` (simpler)
- **Version** - `1.0.0` → `0.2.0-beta` (accurate beta status)

### 📝 Documentation

- Updated README with Windows/Linux install instructions
- Added installation guide
- Updated Telegram debugging guide

### 🏗️ Architecture

- **Model Manager** - No longer filters favorites by server catalog
- **State Management** - Unified state path across TUI and daemon
- **Cross-platform** - Full Windows + Linux/macOS support

---

## [0.1.0-beta] - 2026-03-15

### 🎉 Initial Beta Release

- Resident AI daemon with persistent memory
- Telegram bot integration
- TUI (Terminal User Interface)
- CLI management commands
- Soul identity system (`SOUL.md`)
- SQLite memory & facts
- Multi-interface support (Telegram, TUI, CLI, HTTP API)
- Provider-agnostic AI support (llama-swap, Ollama, LM Studio, cloud providers)
