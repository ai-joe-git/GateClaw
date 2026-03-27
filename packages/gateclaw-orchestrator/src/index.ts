// Force daemon to use gateclaw's own isolated data directory
import os from "node:os"
process.env.OPENCODE_APP_NAME = "gateclaw"

// Platform-aware data directory (Windows uses LOCALAPPDATA, Unix uses XDG_DATA_HOME)
if (process.platform === "win32") {
  process.env.LOCALAPPDATA = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local")
} else {
  process.env.XDG_DATA_HOME = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share")
}
import { app } from "./server"
import { startBotApp } from "./telegram-bot/app/start-bot-app.js"
import { getSoulName, getPIDPath, getLogPath, getConfigDir } from "./soul"
import { spawn } from "bun"
import { execSync } from "child_process"
import fs from "node:fs"
import path from "node:path"
import { setTimeout as sleep } from "node:timers/promises"

const OPENCODE_PID_FILE = path.join(getConfigDir(), "opencode-server.pid")

function getOpenCodePID(): number | null {
  try {
    if (fs.existsSync(OPENCODE_PID_FILE)) {
      return parseInt(fs.readFileSync(OPENCODE_PID_FILE, "utf8").trim(), 10)
    }
  } catch {}
  return null
}

function saveOpenCodePID(pid: number): void {
  fs.writeFileSync(OPENCODE_PID_FILE, String(pid), "utf8")
}

function deleteOpenCodePID(): void {
  try {
    fs.unlinkSync(OPENCODE_PID_FILE)
  } catch {}
}

function killOpenCodeServer(): void {
  const pid = getOpenCodePID()
  if (!pid) return

  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" })
    } else {
      process.kill(pid, "SIGTERM")
    }
    console.log("[gateclaw] OpenCode server stopped")
  } catch {
    // Process already dead or not found
  }
  deleteOpenCodePID()
}

let telegramBotRunning = false

async function startTelegramBot(): Promise<void> {
  if (telegramBotRunning) return
  telegramBotRunning = true
  try {
    await startBotApp()
  } catch (err) {
    console.error("Failed to start Telegram bot:", err)
    telegramBotRunning = false
  }
}

async function stopTelegramBot(): Promise<void> {
  if (!telegramBotRunning) return
  telegramBotRunning = false
  console.log("[gateclaw] Telegram bot stop requested")
}

// Start OpenCode server on port 4100 if not already running
const startOpenCodeServer = async () => {
  try {
    const res = await fetch("http://localhost:4100/global/health", { signal: AbortSignal.timeout(1000) })
    if (res.ok) {
      console.log("[gateclaw] OpenCode server already running on port 4100")
      return
    }
  } catch {
    // Server not running, start it
  }

  // Try to start OpenCode server as detached process
  const opencodeDir = path.resolve(__dirname, "../../opencode")
  const gateclawConfigDir = getConfigDir()
  const gateclawRoot = path.resolve(__dirname, "../..")
  try {
    const child = Bun.spawn(["bun", "run", "src/index.ts", "serve", "--port", "4100", "--hostname", "0.0.0.0"], {
      cwd: opencodeDir,
      stdio: ["ignore", "ignore", "ignore"],
      detached: false,
      windowsHide: true,
      env: {
        ...process.env,
        XDG_CONFIG_HOME: process.env.APPDATA,
        OPENCODE_CONFIG_DIR: gateclawConfigDir,
        GATECLAW_DIRECTORY: gateclawRoot,
        OPENCODE_SERVER_PASSWORD: "",
      },
    })
    saveOpenCodePID(child.pid)
    console.log(`[gateclaw] OpenCode server spawned (pid ${child.pid})`)

    // Wait a bit and check if it started
    for (let i = 0; i < 30; i++) {
      await sleep(500)
      try {
        const res = await fetch("http://localhost:4100/global/health", { signal: AbortSignal.timeout(500) })
        if (res.ok) {
          console.log("[gateclaw] OpenCode server is ready on port 4100")
          return
        }
      } catch {
        // Still starting
      }
    }
    console.log("[gateclaw] OpenCode server may have failed to start - check manually")
  } catch (err) {
    console.log("[gateclaw] Failed to spawn OpenCode server:", err)
  }
}

// Check TTS server on port 8000 (external - managed by llama-swap)
const startTtsServer = async () => {
  try {
    const res = await fetch("http://localhost:8000/health", { signal: AbortSignal.timeout(1000) })
    if (res.ok) {
      console.log("[gateclaw] TTS server available on port 8000")
      return
    }
  } catch {
    // TTS not available - user manages via llama-swap
  }
  console.log("[gateclaw] TTS server not available (managed externally)")
}

// Check STT server on port 7372 (external - managed by llama-swap)
const startSttServer = async () => {
  try {
    const res = await fetch("http://localhost:7372/health", { signal: AbortSignal.timeout(1000) })
    if (res.ok) {
      console.log("[gateclaw] STT server available on port 7372")
      return
    }
  } catch {
    // STT not available - user manages via llama-swap
  }
  console.log("[gateclaw] STT server not available (managed externally)")
}

// Start Genesis memory watcher (Python process)
const GENESIS_WATCHER_PID_FILE = path.join(getConfigDir(), "genesis-watcher.pid")
const genesisWatcherPath = path.join(os.homedir(), "Desktop", "Sandbox", "GateClaw_Genesis", "genesis_watcher.py")

function getGenesisWatcherPID(): number | null {
  try {
    if (fs.existsSync(GENESIS_WATCHER_PID_FILE)) {
      return parseInt(fs.readFileSync(GENESIS_WATCHER_PID_FILE, "utf8").trim(), 10)
    }
  } catch {}
  return null
}

function isGenesisWatcherAlive(): boolean {
  const pid = getGenesisWatcherPID()
  if (!pid) return false
  try {
    if (process.platform === "win32") {
      execSync(`tasklist /FI "PID eq ${pid}" /NH`, { stdio: "ignore" })
    } else {
      process.kill(pid, 0)
    }
    return true
  } catch {
    return false
  }
}

function startGenesisWatcher(): void {
  // Check if already running
  if (isGenesisWatcherAlive()) {
    console.log("[gateclaw] Genesis watcher already running")
    return
  }

  // Check if the script exists
  if (!fs.existsSync(genesisWatcherPath)) {
    console.log("[gateclaw] Genesis watcher not found (skipping)")
    return
  }

  try {
    const proc = Bun.spawn(["python", genesisWatcherPath], {
      cwd: path.dirname(genesisWatcherPath),
      stdout: Bun.file(path.join(path.dirname(genesisWatcherPath), "watcher.log")),
      stderr: Bun.file(path.join(path.dirname(genesisWatcherPath), "watcher_err.log")),
      detached: true,
    })
    proc.unref()
    fs.writeFileSync(GENESIS_WATCHER_PID_FILE, String(proc.pid))
    console.log(`[gateclaw] Genesis watcher started (pid ${proc.pid})`)
  } catch (err) {
    console.log("[gateclaw] Failed to start Genesis watcher:", err)
  }
}

// Load environment from .env file
const ENV_PATH = path.join(getConfigDir(), ".env")
if (fs.existsSync(ENV_PATH)) {
  const envContent = fs.readFileSync(ENV_PATH, "utf8")
  const tokenMatch = envContent.match(/GATECLAW_TELEGRAM_TOKEN="([^"]+)"/)
  const chatIdMatch = envContent.match(/GATECLAW_TELEGRAM_CHAT_ID="(\d+)"/)
  if (tokenMatch) process.env.GATECLAW_TELEGRAM_TOKEN = tokenMatch[1]
  if (chatIdMatch) process.env.GATECLAW_TELEGRAM_CHAT_ID = chatIdMatch[1]
}

const port = 7371
const host = "127.0.0.1"

// Start OpenCode server first
await startOpenCodeServer()

// Start TTS and STT servers
await startTtsServer()
await startSttServer()

// Start Genesis memory watcher
startGenesisWatcher()

// Start Telegram bot after 3 seconds delay
console.log("[gateclaw] Starting Telegram bot in 3s...")
setTimeout(() => {
  startTelegramBot()
}, 3000)

console.log("GateClaw daemon listening on 127.0.0.1:7371")

// Auto-open dashboard in browser
const openBrowser = () => {
  const url = "http://localhost:7371/dashboard"
  try {
    if (process.platform === "win32") {
      execSync(`start ${url}`, { stdio: "ignore" })
    } else if (process.platform === "darwin") {
      execSync(`open ${url}`, { stdio: "ignore" })
    } else {
      execSync(`xdg-open ${url}`, { stdio: "ignore" })
    }
    console.log("[gateclaw] Dashboard opened in browser")
  } catch (e) {
    console.log("[gateclaw] Could not auto-open browser - visit http://localhost:7371/dashboard")
  }
}

// Open browser after server starts
setTimeout(openBrowser, 1000)

const server = Bun.serve({
  port,
  hostname: host,
  fetch: app.fetch,
})

const CHAT_ID = Number(process.env.GATECLAW_TELEGRAM_CHAT_ID)
console.log(
  `Telegram: token=${process.env.GATECLAW_TELEGRAM_TOKEN ? "set" : "missing"}, chatId=${CHAT_ID || "missing"}`,
)
// Welcome message is now handled by the original grammy bot via startBotApp()

// Auto-sync GateClaw DB → TUI DB every 15s (cross-platform)
setInterval(async () => {
  const fs = await import("node:fs/promises")
  const path = await import("node:path")
  const os = await import("node:os")
  const src =
    process.platform === "win32"
      ? path.join(process.env.LOCALAPPDATA || os.homedir(), "gateclaw", "gateclaw.db")
      : path.join(process.env.XDG_DATA_HOME || os.homedir(), ".local", "share", "gateclaw", "gateclaw.db")
  const dst =
    process.platform === "win32"
      ? path.join(process.env.LOCALAPPDATA || os.homedir(), "gateclaw", "opencode.db")
      : path.join(os.homedir(), ".local", "share", "gateclaw", "opencode.db")
  const srcStat = await fs.stat(src).catch(() => null)
  const dstStat = await fs.stat(dst).catch(() => null)
  if (srcStat && (!dstStat || srcStat.mtimeMs > dstStat.mtimeMs)) {
    await fs.copyFile(src, dst)
    console.log("[gateclaw:sync] → TUI DB")
  }
}, 15000)

process.on("uncaughtException", (err) => {
  console.error("[gateclaw] Uncaught exception (daemon kept alive):", err.message)
})
process.on("unhandledRejection", (reason) => {
  console.error("[gateclaw] Unhandled rejection (daemon kept alive):", reason)
})

const cleanup = async () => {
  const pidPath = getPIDPath()
  const logPath = getLogPath()

  // Stop Telegram bot
  await stopTelegramBot()

  // Stop OpenCode server
  killOpenCodeServer()

  if (fs.existsSync(pidPath)) {
    fs.unlinkSync(pidPath)
  }

  fs.appendFileSync(logPath, `[${new Date().toISOString()}] SHUTDOWN\n`, "utf8")
  server.stop()
  process.exit(0)
}

process.on("SIGINT", cleanup)
process.on("SIGTERM", cleanup)
