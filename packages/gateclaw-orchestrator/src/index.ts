import { app } from "./server"
import { start as startTelegram, sendMessage } from "./telegram"
import { getSoulName, getPIDPath, getLogPath } from "./soul"
import fs from "node:fs"

const port = 7371
const host = "127.0.0.1"

startTelegram()

console.log("GateClaw daemon listening on 127.0.0.1:7371")

const server = Bun.serve({
  port,
  hostname: host,
  fetch: app.fetch,
})

const CHAT_ID = Number(process.env.GATECLAW_TELEGRAM_CHAT_ID)
if (CHAT_ID) sendMessage(CHAT_ID, `🐾 *GateClaw online*\nsoul: ${getSoulName()}\npid: ${process.pid}`)

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
