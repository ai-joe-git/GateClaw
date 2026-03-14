// Force daemon to use gateclaw's own isolated data directory
import os from "node:os"
process.env.OPENCODE_APP_NAME = "gateclaw"

// Platform-aware data directory (Windows uses LOCALAPPDATA, Unix uses XDG_DATA_HOME)
if (process.platform === "win32") {
  process.env.LOCALAPPDATA = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local")
} else {
  process.env.XDG_DATA_HOME = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share")
}

import { runMigrations } from "../../opencode/src/gateclaw/migrator"
import { app } from "./server"
import { startBotApp } from "./telegram-bot/app/start-bot-app.js"
import { getSoulName, getPIDPath, getLogPath, getConfigDir } from "./soul"
import { spawn } from "bun"
import fs from "node:fs"
import path from "node:path"
import { setTimeout as sleep } from "node:timers/promises"

// Apply migrations at startup BEFORE any message handling
runMigrations()

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

  console.log("[gateclaw] Starting OpenCode server on port 4100...")
  const serverProcess = spawn({
    cmd: ["bun", "run", "--conditions=node", "./src/index.ts", "serve", "--port", "4100"],
    cwd: path.join(process.cwd(), "..", "opencode"),
    stdout: "pipe",
    stderr: "pipe",
  })

  // Wait for server to start
  for (let i = 0; i < 10; i++) {
    await sleep(500)
    try {
      const healthRes = await fetch("http://localhost:4100/global/health", { signal: AbortSignal.timeout(1000) })
      if (healthRes.ok) {
        console.log("[gateclaw] OpenCode server started on port 4100")
        return
      }
    } catch {
      // Still waiting
    }
  }

  console.error("[gateclaw] Failed to start OpenCode server on port 4100")
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

// Start OpenCode server before Telegram
await startOpenCodeServer()

// Start original grammy-based Telegram bot
console.log("[gateclaw] Starting grammy Telegram bot...")
startBotApp().catch((err) => console.error("Failed to start Telegram bot:", err))

console.log("GateClaw daemon listening on 127.0.0.1:7371")

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

const cleanup = () => {
  const pidPath = getPIDPath()
  const logPath = getLogPath()

  if (fs.existsSync(pidPath)) {
    fs.unlinkSync(pidPath)
  }

  fs.appendFileSync(logPath, `[${new Date().toISOString()}] SHUTDOWN\n`, "utf8")
  // Shutdown message is now handled by the original grammy bot
  server.stop()
  process.exit(0)
}

process.on("SIGINT", cleanup)
process.on("SIGTERM", cleanup)
