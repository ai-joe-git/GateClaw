import { broadcast } from "./events"
import { getSoulPrompt, getSoulName } from "./soul"
import { TOOLS_PROMPT, executeTool } from "./tools"
import type { ToolCall } from "./tools"
import path from "node:path"
import os from "node:os"
import fs from "node:fs"
import { parse as parseJsonc } from "jsonc-parser"

// Load token dynamically from .env file
const getConfigDir = () => {
  // On Windows, check both APPDATA and USERPROFILE/.config
  if (process.platform === "win32") {
    const userProfile = process.env.USERPROFILE || os.homedir()
    const configPath = path.join(userProfile, ".config", "gateclaw")
    if (fs.existsSync(configPath)) {
      console.log("Telegram: using .config path:", configPath)
      return configPath
    }
    const appDataPath = path.join(process.env.APPDATA || userProfile, "gateclaw")
    console.log("Telegram: using APPDATA path:", appDataPath)
    return appDataPath
  }
  // Unix-like systems
  return path.join(os.homedir(), ".config", "gateclaw")
}

const ENV_PATH = path.join(getConfigDir(), ".env")
const loadToken = (): string | null => {
  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, "utf8")
    return content.match(/GATECLAW_TELEGRAM_TOKEN="([^"]+)"/)?.[1] || null
  }
  return process.env.GATECLAW_TELEGRAM_TOKEN || null
}

const loadModels = async (): Promise<string[]> => {
  const configDir = getConfigDir()
  const configPath = path.join(configDir, "gateclaw.jsonc")
  console.log("Telegram: loading models from", configPath)

  // Check if file exists FIRST
  const exists = fs.existsSync(configPath)
  console.log("Telegram: config exists?", exists, "at", configPath)
  if (!exists) {
    console.log("Telegram: config file NOT found at", configPath)
    return ["Claude-4.6-Opus-35B"]
  }

  try {
    const content = fs.readFileSync(configPath, "utf8")
    console.log("Telegram: config size:", content.length, "bytes")

    // Use jsonc-parser parse function to properly handle JSONC (comments, trailing commas)
    const parsed = parseJsonc(content) as any
    console.log("Telegram: parsed JSON successfully using jsonc-parser")
    console.log("Telegram: has provider?", !!parsed.provider)
    console.log("Telegram: provider keys:", Object.keys(parsed.provider || {}))

    // Collect models from all providers
    const allModels: string[] = []
    const providers = parsed.provider || {}

    for (const providerKey of Object.keys(providers)) {
      const providerData = providers[providerKey]
      console.log("Telegram: checking provider", providerKey, "type:", typeof providerData)
      if (providerData && typeof providerData === "object") {
        const modelsObj = (providerData as any).models || {}
        const modelKeys = Object.keys(modelsObj)
        console.log("Telegram: provider", providerKey, "has models:", modelKeys)
        allModels.push(...modelKeys)
      }
    }

    console.log(`Telegram: total models collected: ${allModels.length}`, allModels)

    if (allModels.length === 0) {
      console.log("Telegram: no models found in any provider")
      return ["Claude-4.6-Opus-35B"]
    }

    return allModels
  } catch (err: any) {
    console.error("Failed to load models:", err.message)
    console.error("Stack:", err.stack)
    return ["Claude-4.6-Opus-35B"]
  }
}

// Token loaded dynamically per API call
const getBase = (): string | null => {
  const token = loadToken()
  return token ? `https://api.telegram.org/bot${token}` : null
}

const TOKEN = loadToken()

let running = false
let lastUpdateId = 0
let timeoutId: ReturnType<typeof setTimeout> | undefined
let currentModel = "Claude-4.6-Opus-35B" // default model

// Initialize lastUpdateId from the latest updates
const initLastUpdateId = async () => {
  console.log("Telegram: initializing lastUpdateId...")
  const base = getBase()
  if (!base) {
    console.error("Telegram: no token configured")
    return
  }
  try {
    const res = await fetch(`${base}/getUpdates?limit=1`)
    console.log("Telegram: getUpdates response status:", res.status)
    const json = (await res.json()) as { ok: boolean; result?: Array<{ update_id?: number }> }
    console.log("Telegram: getUpdates response:", json.ok ? "ok" : "error", json.result?.length ?? 0, "updates")
    if (json.result && json.result.length > 0) {
      const latest = json.result[0]
      if (latest && latest.update_id != null) {
        lastUpdateId = latest.update_id
        console.log(`Telegram: initialized lastUpdateId=${lastUpdateId}`)
      }
    }
  } catch (err) {
    console.error("Telegram init error:", err instanceof Error ? err.message : err)
  }
}

const api = (method: string, body?: Record<string, unknown>) => {
  const base = getBase()
  if (!base) {
    console.error("Telegram: no token configured for API call")
    return Promise.reject(new Error("Telegram token not configured"))
  }
  return fetch(`${base}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
}

export const sendMessage = async (chatId: number, text: string): Promise<void> => {
  const token = loadToken()
  if (!token) {
    console.error("Telegram: cannot send message, token not configured")
    return
  }
  const base = getBase()
  if (!base) {
    return
  }
  await fetch(`${base}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  })
}

const handle = async (chatId: number, text: string, sessionKey = "telegram") => {
  console.log(`Telegram: handling message from ${chatId}: "${text}"`)
  try {
    await api("sendChatAction", { chat_id: chatId, action: "typing" })
    broadcast(JSON.stringify({ type: "telegram", chatId, text }))

    const factsRes = await fetch("http://127.0.0.1:7371/facts")
    if (!factsRes.ok) {
      console.error("Telegram: failed to fetch facts, status:", factsRes.status)
    }
    const facts = await factsRes.json()
    const soulPrompt = getSoulPrompt()

    const systemPrompt = soulPrompt + `\n\nYour memory:\n` + JSON.stringify(facts) + `\n` + TOOLS_PROMPT

    const MAX_TOOL_ROUNDS = 5
    let reply = "🐾 no response"
    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ]

    console.log(`Telegram: calling LLM with ${messages.length} messages, model: ${currentModel}`)
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      // 5 hour timeout for local LLM providers (llama-swap, Ollama, LM Studio)
      const completionRes = await fetch("http://localhost:8888/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: currentModel,
          messages,
        }),
        signal: AbortSignal.timeout(18000000), // 5 hours = 18,000,000ms
      })
      console.log(`Telegram: LLM response status: ${completionRes.status}`)
      const completion = (await completionRes.json()) as { choices?: [{ message?: { content?: string } }] }
      reply = completion.choices?.[0]?.message?.content ?? "🐾 no response"
      console.log(`Telegram: LLM reply: ${reply.slice(0, 80)}...`)

      // Strip markdown code block if present
      const trimmed = reply
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim()

      if (trimmed.startsWith("{") && trimmed.includes('"tool"')) {
        console.log(`Telegram: tool call detected`)
        try {
          // Try to parse - handle multiline content by finding JSON bounds
          const jsonStart = trimmed.indexOf("{")
          const jsonEnd = trimmed.lastIndexOf("}")
          const jsonStr = trimmed.slice(jsonStart, jsonEnd + 1)
          const toolCall = JSON.parse(jsonStr)
          if (toolCall.tool) {
            await api("sendChatAction", { chat_id: chatId, action: "typing" })
            const toolResult = await executeTool(toolCall)
            messages.push({ role: "assistant", content: trimmed })
            messages.push({ role: "user", content: `Tool result:\n${toolResult}` })
            continue // go to next round with tool result
          }
        } catch (e: any) {
          console.error(`Telegram: tool parse error: ${e.message}`)
          console.error(`Telegram: failed JSON: ${trimmed.slice(0, 200)}...`)
          // If JSON parse fails, try to extract tool name and execute anyway
          const toolMatch = trimmed.match(/"tool"\s*:\s*"([^"]+)"/)
          if (toolMatch && toolMatch[1]) {
            try {
              const partialCall = { tool: toolMatch[1] } as ToolCall
              // Try to extract other params
              const pathMatch = trimmed.match(/"path"\s*:\s*"([^"]+)"/)
              const cmdMatch = trimmed.match(/"command"\s*:\s*"([^"]+)"/)
              const contentMatch = trimmed.match(/"content"\s*:\s*"([^"]+)"/)
              if (pathMatch) partialCall.path = pathMatch[1]
              if (cmdMatch) partialCall.command = cmdMatch[1]
              if (contentMatch) partialCall.content = contentMatch[1]
              const toolResult = await executeTool(partialCall)
              messages.push({ role: "assistant", content: trimmed })
              messages.push({ role: "user", content: `Tool result:\n${toolResult}` })
              continue
            } catch (e2: any) {
              console.error(`Telegram: partial tool execution failed: ${e2.message}`)
            }
          }
        }
      }

      break // no tool call detected — this is the final answer
    }

    console.log(`Telegram: sending reply to ${chatId}`)
    await sendMessage(chatId, reply)
    console.log(`Telegram: message sent`)
  } catch (err: any) {
    console.error(`Telegram: handler error: ${err.message}`)
    await sendMessage(chatId, `🐾 error: ${err instanceof Error ? err.message : String(err)}`)
  }
}

const getModelsListMessage = async (): Promise<string> => {
  const availableModels = await loadModels()
  let msg = "📋 *Available Models:*\n"
  availableModels.forEach((m: string, i: number) => {
    msg += `${i + 1}. ${m}\n`
  })
  msg += `\n*Current:* ${currentModel}`
  msg += `\n\n_Use: /model <name>_`
  return msg
}

const getHelpMessage = (): string => {
  return `\`\`\`
🐾 GateClaw Commands:
  /start     - Bot introduction
  /models    - List available models
  /model     - Set current model
  /help      - This help message
\`\`\``
}

const poll = async () => {
  if (!running) return
  const base = getBase()
  if (!base) return

  const params = new URLSearchParams()
  params.append("offset", (lastUpdateId + 1).toString())
  params.append("timeout", "30")

  try {
    const res = await fetch(`${base}/getUpdates?${params.toString()}`)
    const json = (await res.json()) as {
      ok: boolean
      result?: Array<{ message?: { chat?: { id?: number }; text?: string }; update_id?: number }>
    }

    if (json.result && Array.isArray(json.result)) {
      for (const update of json.result) {
        if (update.message?.text && update.message.chat?.id) {
          const chatId = update.message.chat.id
          const textContent = update.message.text?.trim() || ""
          console.log(`Telegram message from ${chatId}: ${textContent.slice(0, 50)}...`)

          // Handle slash commands
          if (textContent.startsWith("/")) {
            const cmd = textContent.slice(1).split(" ")[0] || ""
            const args = textContent.split(" ").slice(1).join(" ")

            if (cmd === "models") {
              console.log("Telegram: /models command received")
              const availableModels = await loadModels()
              let msg = "📋 *Available Models:*\n"
              availableModels.forEach((m: string, i: number) => {
                msg += `${i + 1}. ${m}\n`
              })
              msg += `\n*Current:* ${currentModel}`
              msg += `\n\n_Use: /model <name>_`
              await sendMessage(chatId, msg)
            } else if (cmd === "model") {
              console.log("Telegram: /model command received, args:", args)
              const newModel = args.trim()
              if (newModel) {
                currentModel = newModel
                console.log(`Telegram: switched model to ${currentModel}`)
                await sendMessage(chatId, `✅ Model changed to: *${currentModel}*`)
              } else {
                const list = await loadModels()
                let listMsg = "📋 *Available Models:*\n"
                list.forEach((m: string, i: number) => {
                  listMsg += `${i + 1}. ${m}\n`
                })
                listMsg += `\n\n_Use: /model <name>_`
                await sendMessage(chatId, "Usage: `/model <name>`\n\n" + listMsg)
              }
            } else if (cmd === "start") {
              await sendMessage(
                chatId,
                `🐾 *GateClaw online*\nsoul: ${getSoulName()}\npid: ${process.pid}\nmodel: ${currentModel}`,
              )
            } else if (cmd === "help") {
              await sendMessage(chatId, getHelpMessage())
            } else {
              console.log(`Telegram: unknown command "${cmd}", treating as regular message`)
              handle(chatId, textContent)
            }
          } else {
            handle(chatId, textContent)
          }
        }
        if ((update.update_id ?? 0) > lastUpdateId) {
          lastUpdateId = update.update_id ?? 0
        }
      }
    }
  } catch (err) {
    console.error("Telegram poll error:", err instanceof Error ? err.message : err)
  }

  poll().catch(onPollError)
}

const onPollError = () => {
  if (!running) return
  timeoutId = setTimeout(() => poll(), 5000)
}

export const start = async (): Promise<void> => {
  if (!TOKEN) {
    console.warn("GATECLAW_TELEGRAM_TOKEN not set; Telegram bot disabled")
    return
  }
  if (running) return
  running = true
  await initLastUpdateId()
  console.log(`Telegram: starting poll from update ${lastUpdateId}`)
  poll().catch(onPollError)
}

export const stop = (): void => {
  running = false
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = undefined
  }
}
