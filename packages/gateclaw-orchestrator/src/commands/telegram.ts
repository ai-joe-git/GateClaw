import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { $ } from "bun"
import { getSoulName } from "../soul"

const getConfigDir = () => {
  const dir = process.env.APPDATA
    ? path.join(process.env.APPDATA, "gateclaw")
    : path.join(os.homedir(), ".config/gateclaw")
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

const ENV_PATH = path.join(getConfigDir(), ".env")

interface TelegramResponse {
  ok: boolean
  result?: any
}

const readEnv = () => {
  if (!fs.existsSync(ENV_PATH)) return { token: null, chatId: null }
  const content = fs.readFileSync(ENV_PATH, "utf8")
  const token = content.match(/GATECLAW_TELEGRAM_TOKEN="([^"]+)"/)?.[1]
  const chatId = content.match(/GATECLAW_TELEGRAM_CHAT_ID="(\d+)"/)?.[1]
  return { token, chatId: token && chatId ? chatId : null }
}

const writeEnv = (token: string | null, chatId: string | null) => {
  const current = readEnv()
  const newToken = token ?? current.token ?? ""
  const newChatId = chatId ?? current.chatId ?? ""

  const content = `GATECLAW_TELEGRAM_TOKEN="${newToken}"
GATECLAW_TELEGRAM_CHAT_ID="${newChatId}"
`
  fs.writeFileSync(ENV_PATH, content, "utf8")
}

const prompt = async (question: string): Promise<string> => {
  const rl = (global as any).__GATECLAW_READLINE
  if (rl) {
    return new Promise((resolve) => {
      rl.question(question + " ", resolve)
    })
  }

  // Fallback: create readline if not exists
  const readline = await import("node:readline")
  const rlInstance = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise<string>((resolve) => {
    rlInstance.question(question + " ", (answer: string) => {
      rlInstance.close()
      resolve(answer)
    })
  })
}

const printMsg = (type: "info" | "success" | "error" | "warn", msg: string) => {
  const colors = {
    info: "\x1b[0;36m",
    success: "\x1b[0;32m",
    error: "\x1b[0;31m",
    warn: "\x1b[38;5;214m",
  }
  const reset = "\x1b[0m"
  const prefix = { info: "ℹ", success: "✓", error: "✗", warn: "⚠" }[type]
  console.log(`${colors[type]}${prefix} ${msg}${reset}`)
}

const getBotInfo = async (token: string): Promise<TelegramResponse> => {
  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`)
  return (await res.json()) as TelegramResponse
}

const getChatIdFromUpdates = async (token: string): Promise<string | null> => {
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`)
  const json = (await res.json()) as TelegramResponse
  if (!json.ok || !json.result || json.result.length === 0) {
    return null
  }
  const latest = json.result[json.result.length - 1]
  return String(latest.message?.chat?.id || latest.callback_query?.message?.chat?.id || null)
}

const sendMessage = async (chatId: string, text: string, token: string): Promise<TelegramResponse> => {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  })
  return (await res.json()) as TelegramResponse
}

export const telegram = {
  setup: async () => {
    printMsg("info", "🐾 Telegram Setup")
    console.log("")
    console.log("\u001b[1;34mStep 1: Create your bot\u001b[0m")
    console.log("  1. Message @BotFather on Telegram")
    console.log("  2. Send: /newbot")
    console.log("  3. Choose a name for your bot (e.g., MyGateClawBot)")
    console.log("  4. Copy the API token")
    console.log("")

    const token = await prompt("Paste your token:")
    if (!token) {
      printMsg("error", "No token provided")
      console.log("")
      console.log("\u001b[1;34mTip: The token looks like: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11\u001b[0m")
      return
    }

    printMsg("info", "Verifying token...")
    const botInfo = await getBotInfo(token)
    if (!botInfo.ok) {
      printMsg("error", "Invalid token")
      return
    }
    printMsg("success", `Bot: @${botInfo.result.username}`)

    console.log("")
    console.log("\u001b[1;34mStep 2: Activate your bot\u001b[0m")
    console.log("  1. Search for @${botInfo.result.username} on Telegram")
    console.log("  2. Click START or send any message")
    console.log("  3. I'll auto-detect your chat ID")
    console.log("")

    printMsg("info", "Getting your chat ID...")
    const chatId = await getChatIdFromUpdates(token)

    if (chatId) {
      printMsg("success", `Chat ID auto-detected: ${chatId}`)
    } else {
      printMsg("warn", "No chat updates found yet")
      console.log("")
      console.log("\u001b[1;34mTo get your chat ID:\u001b[0m")
      console.log("  1. Message your bot with any text (e.g., /start)")
      console.log("  2. I'll fetch it automatically, or you can enter it manually")
      console.log("")

      const tryAuto = await prompt("Message your bot then press Enter to auto-detect (or 'm' for manual):")

      if (tryAuto.toLowerCase() === "m") {
        const manualChatId = await prompt("Enter your chat ID:")
        if (!manualChatId) {
          printMsg("error", "No chat ID provided")
          return
        }
        writeEnv(token, manualChatId)
      } else {
        const retryChatId = await getChatIdFromUpdates(token)
        if (retryChatId) {
          printMsg("success", `Chat ID found: ${retryChatId}`)
          writeEnv(token, retryChatId)
        } else {
          printMsg("error", "Still no chat updates - please message your bot first")
          console.log("")
          console.log("\u001b[1;34mAlternative: Get chat ID manually\u001b[0m")
          console.log("  1. Visit: https://api.telegram.org/bot<TOKEN>/getUpdates")
          console.log("  2. Look for 'chat':{'id':NUMBER}")
          console.log("")
          const manualChatId = await prompt("Enter your chat ID:")
          if (!manualChatId) {
            printMsg("error", "No chat ID provided")
            return
          }
          writeEnv(token, manualChatId)
        }
      }
    }

    printMsg("success", "Telegram configured!")

    const soulName = getSoulName()
    const result = await sendMessage(chatId || "", `🐾 *GateClaw configured*\nsoul: ${soulName}\nstatus: ready`, token)

    if (result.ok) {
      printMsg("success", "Welcome message sent!")
    } else {
      printMsg("warn", "Could not send welcome message")
    }

    console.log("")
    printMsg("info", "Restart daemon: gateclaw restart")
  },

  status: async () => {
    const { token, chatId } = readEnv()

    if (!token) {
      printMsg("error", "Telegram not configured")
      console.log("")
      console.log("First-time setup:")
      console.log("  1. Run: gateclaw telegram setup")
      console.log("  2. Create bot via @BotFather")
      console.log("  3. Message your bot to activate")
      return
    }

    printMsg("info", "Fetching bot info...")
    const botInfo = await getBotInfo(token)

    if (!botInfo.ok) {
      printMsg("error", "Invalid token")
      return
    }

    console.log("")
    console.log(`Bot:       @${botInfo.result.username}`)
    console.log(`Name:      ${botInfo.result.first_name}`)
    console.log(`Chat ID:   ${chatId || "\u001b[38;5;214mnot set\u001b[0m"}`)
    console.log(`Config:    ${ENV_PATH}`)
    console.log("")

    if (!chatId) {
      printMsg("warn", "Chat ID not set")
      console.log("")
      console.log("\u001b[1;34mNext steps:\u001b[0m")
      console.log("  1. Message your bot on Telegram (e.g., /start)")
      console.log("  2. Run: gateclaw telegram autoid")
      console.log("     OR: gateclaw telegram setup")
    } else {
      printMsg("success", "Telegram ready")
    }
  },

  test: async () => {
    const { token, chatId } = readEnv()

    if (!token || !chatId) {
      printMsg("error", "Telegram not configured")
      console.log("Run: gateclaw telegram setup")
      return
    }

    printMsg("info", "Sending test message...")
    const result = await sendMessage(
      chatId,
      `🐾 *GateClaw test*\nThis is a test message from your GateClaw daemon.\nIf you see this, Telegram is working!`,
      token,
    )

    if (result.ok) {
      printMsg("success", "Test message sent!")
    } else {
      printMsg("error", "Failed to send message")
      console.log(JSON.stringify(result, null, 2))
    }
  },

  verify: async () => {
    const { token, chatId } = readEnv()

    if (!token) {
      printMsg("error", "Token not configured")
      return
    }

    printMsg("info", "Verifying token...")
    const botInfo = await getBotInfo(token)

    if (botInfo.ok) {
      printMsg("success", `Token valid - @${botInfo.result.username}`)
    } else {
      printMsg("error", "Token invalid")
      return
    }

    if (!chatId) {
      printMsg("warn", "Chat ID not set")
      return
    }

    printMsg("info", "Verifying chat ID...")
    const testResult = await sendMessage(chatId, "🐾 Verification check", token)

    if (testResult.ok) {
      printMsg("success", "Chat ID valid")
    } else {
      printMsg("error", "Chat ID invalid or bot blocked")
    }
  },

  reset: async () => {
    printMsg("warn", "This will clear your Telegram configuration")
    printMsg("info", "Token and chat ID will be removed")
    console.log("")
    const confirm = await prompt("Continue? [y/N]")

    if (!confirm || !confirm.toLowerCase().startsWith("y")) {
      printMsg("info", "Aborted")
      return
    }

    writeEnv(null, null)
    printMsg("success", "Telegram configuration cleared")
    console.log("")
    printMsg("info", "To setup again: gateclaw telegram setup")
  },

  info: async () => {
    const { token, chatId } = readEnv()

    if (!token) {
      console.log("Telegram: not configured")
      return
    }

    const botInfo = await getBotInfo(token)
    if (!botInfo.ok) {
      console.log("Telegram: invalid token")
      return
    }

    console.log(`Telegram: @${botInfo.result.username}`)
    console.log(`Chat ID: ${chatId || "not set"}`)
    console.log(`Status: ${chatId ? "ready" : "incomplete"}`)
  },

  autoid: async () => {
    const { token, chatId } = readEnv()

    if (!token) {
      printMsg("error", "Token not configured")
      return
    }

    printMsg("info", "Fetching latest chat ID from bot updates...")
    const autoChatId = await getChatIdFromUpdates(token)

    if (autoChatId) {
      printMsg("success", `Found chat ID: ${autoChatId}`)

      if (chatId && chatId !== autoChatId) {
        const confirm = await prompt(`Update from ${chatId} to ${autoChatId}? [y/N]`)
        if (confirm && confirm.toLowerCase().startsWith("y")) {
          writeEnv(token, autoChatId)
          printMsg("success", "Chat ID updated")
        } else {
          printMsg("info", "Kept existing chat ID")
        }
      } else if (!chatId) {
        writeEnv(token, autoChatId)
        printMsg("success", "Chat ID saved")
      } else {
        printMsg("info", "Chat ID unchanged")
      }
    } else {
      printMsg("warn", "No recent bot updates found")
      console.log("")
      console.log("\u001b[1;34mTo get a chat ID:\u001b[0m")
      console.log("1. Message your bot with any text")
      console.log("2. Run: gateclaw telegram autoid")
    }
  },
}
