// GateClaw Telegram - Clean rewrite
// Simple, stable, no bugs

import { broadcast } from "./events"
import { getSoulPrompt } from "./soul"
import { TOOLS_PROMPT, executeTool, type ToolCall } from "./tools"
import path from "node:path"
import os from "node:os"
import fs from "node:fs"

const SESSION = "gateclaw"
let lastUpdateId = 0
let running = true
let currentModel = "gpt-oss-20b"

function getConfigDir(): string {
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || os.homedir(), "gateclaw")
  }
  return path.join(os.homedir(), ".config", "gateclaw")
}

function loadToken(): string | null {
  const ENV_PATH = path.join(getConfigDir(), ".env")
  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, "utf8")
    return content.match(/GATECLAW_TELEGRAM_TOKEN="([^"]+)"/)?.[1] || null
  }
  return process.env.GATECLAW_TELEGRAM_TOKEN || null
}

function getBase(): string | null {
  const token = loadToken()
  if (!token) return null
  return `https://api.telegram.org/bot${token}`
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  try {
    await fetch(`${getBase()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    })
  } catch (e: any) {
    console.error("Telegram send failed:", e.message)
  }
}

export { sendMessage }

async function handleCommand(chatId: number, cmd: string, args: string): Promise<boolean> {
  if (cmd === "models") {
    const res = await fetch("http://localhost:4100/provider/models")
    if (res.ok) {
      const models = (await res.json()) as string[]
      let msg = `📋 *Models:*\n`
      models.forEach((m, i) => (msg += `${i + 1}. ${m}\n`))
      msg += `\n*Current:* ${currentModel}\n\n_Use: /model <name>_`
      await sendMessage(chatId, msg)
      return true
    }
  } else if (cmd === "model" && args) {
    currentModel = args.trim()
    await sendMessage(chatId, `✅ Model set: ${currentModel}`)
    return true
  } else if (cmd === "help") {
    await sendMessage(
      chatId,
      `🐾 GateClaw Commands:\n  /models - List models\n  /model - Set model\n  /help - This help`,
    )
    return true
  }
  return false
}

interface TelegramUpdate {
  update_id: number
  message?: { text?: string; chat?: { id?: number } }
}

interface TelegramResponse {
  ok: boolean
  result?: TelegramUpdate[]
}

interface CompletionResponse {
  choices?: [{ message?: { content?: string } }]
}

// Server URL (OpenCode server, not daemon)
const SERVER_URL = "http://localhost:4100"

async function handle(chatId: number, text: string): Promise<void> {
  console.log(`Telegram: ${chatId}: ${text}`)

  // Commands
  if (text.startsWith("/")) {
    const parts = text.slice(1).split(" ")
    const cmd = parts[0] || ""
    const args = parts.slice(1).join(" ")
    if (await handleCommand(chatId, cmd, args)) return
  }

  // Use /session/:sessionID/message endpoint - this creates a user message and triggers AI processing
  try {
    await sendMessage(chatId, "🐾 _typing..._")

    const sessionID = "ses_gateclaw"
    const messageID = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`

    const res = await fetch(`${SERVER_URL}/session/${sessionID}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageID,
        agent: "gateclaw",
        variant: "default",
        parts: [{ id: `part-${Date.now()}`, type: "text", text }],
      }),
      signal: AbortSignal.timeout(180000),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[telegram] API error: ${res.status} ${err}`)
      throw new Error(`Session message failed: ${res.status} ${err}`)
    }

    // Read the response - it contains the message info with parts
    const result = (await res.json()) as {
      info?: { id?: string; agent?: string; role?: string }
      parts?: Array<{ type?: string; text?: string; content?: string }>
    }

    // Extract the AI's reply from the first text part
    const textPart = result.parts?.find((p) => p.type === "text")
    const reply = textPart?.text || textPart?.content || "🐾 done"

    // Send reply to Telegram
    await sendMessage(chatId, reply)
  } catch (e: any) {
    console.error("[telegram] Error:", e.message)
    await sendMessage(chatId, `❌ Error: ${e.message}`)
  }
}

async function poll(): Promise<void> {
  if (!running) return
  const base = getBase()
  if (!base) return

  const params = new URLSearchParams()
  params.append("offset", (lastUpdateId + 1).toString())
  params.append("timeout", "30")

  try {
    const res = await fetch(`${base}/getUpdates?${params.toString()}`)
    const json = (await res.json()) as TelegramResponse

    if (json.result && Array.isArray(json.result)) {
      for (const update of json.result) {
        if (update.message?.text && update.message.chat?.id) {
          lastUpdateId = update.update_id || 0
          const text = update.message.text
          const chatId = update.message.chat.id
          if (text && chatId) {
            console.log("[telegram] message:", text, "from:", chatId)
            broadcast(JSON.stringify({ type: "telegram", text }))
            await handle(chatId, text) // await to prevent duplicates
          }
        }
      }
    }
  } catch (e: any) {
    console.error("[telegram] Poll error:", e.message)
    setTimeout(() => poll(), 3000)
    return
  }

  setTimeout(() => poll(), 100)
}

export async function start(): Promise<void> {
  if (!loadToken()) {
    console.error("Telegram: no token")
    return
  }
  console.log("Telegram: polling")
  poll()
}
