# GateClaw v0.2.0-beta - First Stable Beta Release

🎉 **GateClaw is now ready for beta testing!** This release marks the first stable version with full cloud model support and cross-platform installation.

## 🚀 Quick Install

### Windows (PowerShell)

```powershell
powershell -c "irm https://raw.githubusercontent.com/ai-joe-git/GateClaw/dev/install.ps1|iex"
```

### Linux / macOS (Bash)

```bash
curl -fsSL https://raw.githubusercontent.com/ai-joe-git/GateClaw/dev/install | bash
```

## ✨ What's New

### 🎉 Major Features

- **Cloud Model Support in Telegram** - Telegram bot now shows ALL favorited models including cloud providers (nvidia, ollama-cloud, opencode) - no longer filtered by server catalog
- **Cross-Platform Installers** - One-line install for both Windows (PowerShell) and Linux/macOS (Bash)
- **Unified State Management** - Fixed TUI/daemon state path mismatch, now both use `%LOCALAPPDATA%\gateclaw\model.json`
- **Improved Startup** - Increased daemon timeout from 7.5s to 15s, eliminating false "not responding" warnings on Windows

### 🔧 Technical Improvements

- Disabled catalog filtering for Telegram bot favorites
- Fixed model.json path to use correct GateClaw directory (not OpenCode's)
- Added cloud model logging to show which models aren't in gateclaw.jsonc
- Updated package name from `@gateclaw/orchestrator` to `gateclaw`
- Version updated to `0.2.0-beta` (accurate beta status)

### 📝 Documentation

- Comprehensive INSTALL.md guide with troubleshooting
- CHANGELOG.md for tracking changes
- Updated README.md with Windows/Linux install instructions
- Added Telegram debugging guide

## 📦 What's Included

- ✅ Resident AI daemon with persistent memory
- ✅ Telegram bot with full model support
- ✅ TUI (Terminal User Interface)
- ✅ CLI management commands
- ✅ Soul identity system (SOUL.md)
- ✅ SQLite memory & facts
- ✅ Multi-interface support (Telegram, TUI, CLI, HTTP API)
- ✅ Provider-agnostic AI support

## 🎯 Testing Focus

We're particularly interested in feedback on:

1. **Cloud model integration** - Do all your favorited models appear in Telegram?
2. **Installation experience** - Did the one-line installer work smoothly?
3. **Windows startup** - Is the 15s timeout sufficient?
4. **Cross-platform consistency** - Any differences between Windows/Linux/Mac?

## 🐛 Known Issues

- Type checking shows some TypeScript warnings (non-blocking)
- Windows PATH may require manual update after install
- Daemon startup can take 10-15 seconds on slower machines

## 📚 Documentation

- [Installation Guide](https://github.com/ai-joe-git/GateClaw/blob/dev/INSTALL.md)
- [Main README](https://github.com/ai-joe-git/GateClaw/blob/dev/README.md)
- [Changelog](https://github.com/ai-joe-git/GateClaw/blob/dev/CHANGELOG.md)
- [Telegram Debugging](https://github.com/ai-joe-git/GateClaw/blob/dev/GateClaw-Telegram-Debugging.md)

## 🔗 Links

- **Repository:** https://github.com/ai-joe-git/GateClaw
- **Issues:** https://github.com/ai-joe-git/GateClaw/issues
- **Discussions:** https://github.com/ai-joe-git/GateClaw/discussions
- **Tag:** v0.2.0-beta
- **Commit:** See dev branch

## 🙏 Thanks

This beta release wouldn't be possible without extensive testing and feedback from the community. Special thanks to all contributors!

---

**Install now and let us know what you think!** 🐾

```bash
# Windows
powershell -c "irm gateclaw.ai/install.ps1|iex"

# Linux/Mac
curl -fsSL gateclaw.ai/install | bash
```
