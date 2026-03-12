import { app } from "./server"
import { start as startTelegram, sendMessage } from "./telegram"
import { getSoulName, getPIDPath, getLogPath, getConfigDir } from "./soul"
import fs from "node:fs"
import path from "node:path"

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

startTelegram().catch((err) => console.error("Failed to start Telegram:", err))

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

if (CHAT_ID && process.env.GATECLAW_TELEGRAM_TOKEN) {
  sendMessage(CHAT_ID, `🐾 *GateClaw online*\nsoul: ${getSoulName()}\npid: ${process.pid}`)
    .then(() => console.log("Telegram welcome message sent"))
    .catch((err) => console.error("Failed to send Telegram message:", err))
}

const cleanup = () => {
  const pidPath = getPIDPath()
  const logPath = getLogPath()

  if (fs.existsSync(pidPath)) {
    fs.unlinkSync(pidPath)
  }

  fs.appendFileSync(logPath, `[${new Date().toISOString()}] SHUTDOWN\n`, "utf8")
  if (CHAT_ID) sendMessage(CHAT_ID, `🐾 *GateClaw shutting down*\npid: ${process.pid}`)
  server.stop()
  process.exit(0)
}

process.on("SIGINT", cleanup)
process.on("SIGTERM", cleanup)
