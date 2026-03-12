import { broadcast } from "./events"
import { getSoulPrompt } from "./soul"
import { TOOLS_PROMPT, executeTool } from "./tools"

const TOKEN = process.env.GATECLAW_TELEGRAM_TOKEN
const BASE = `https://api.telegram.org/bot${TOKEN}`

let running = false
let lastUpdateId = 0
let timeoutId: ReturnType<typeof setTimeout> | undefined

const api = (method: string, body?: Record<string, unknown>) =>
  fetch(`${BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })

export const sendMessage = async (chatId: number, text: string): Promise<void> => {
  if (!TOKEN) return
  await api("sendMessage", { chat_id: chatId, text, parse_mode: "Markdown" })
}

const handle = async (chatId: number, text: string) => {
  await api("sendChatAction", { chat_id: chatId, action: "typing" })
  broadcast(JSON.stringify({ type: "telegram", chatId, text }))
  try {
    const factsRes = await fetch("http://127.0.0.1:7371/facts")
    const facts = await factsRes.json()
    const soulPrompt = getSoulPrompt()

    const systemPrompt =
      soulPrompt + `\n\nYour memory:\n` + JSON.stringify(facts) + `\n` + TOOLS_PROMPT

    const MAX_TOOL_ROUNDS = 5
    let reply = "🐾 no response"
    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ]

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completionRes = await fetch("http://localhost:8888/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "Claude-4.6-Opus-35B", 
          messages,
        }),
      })
      const completion = await completionRes.json()
      reply = completion.choices?.[0]?.message?.content ?? "🐾 no response"

      // Strip markdown code block if present
      const trimmed = reply
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim()

      if (trimmed.startsWith("{") && trimmed.includes('"tool"')) {
        try {
          const toolCall = JSON.parse(trimmed)
          if (toolCall.tool) {
            await api("sendChatAction", { chat_id: chatId, action: "typing" })
            const toolResult = await executeTool(toolCall)
            messages.push({ role: "assistant", content: trimmed })
            messages.push({ role: "user", content: `Tool result:\n${toolResult}` })
            continue // go to next round with tool result
          }
        } catch (_) {
          // not valid JSON — treat as plain text reply, break
        }
      }

      break // no tool call detected — this is the final answer
    }

    await sendMessage(chatId, reply)
  } catch (err) {
    await sendMessage(
      chatId,
      `🐾 error: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

const poll = async () => {
  if (!running) return

  const params = new URLSearchParams()
  params.append("offset", (lastUpdateId + 1).toString())
  params.append("timeout", "30")

  const res = await fetch(`${BASE}/getUpdates?${params.toString()}`)
  const json = await res.json()

  if (Array.isArray(json.result)) {
    for (const update of json.result) {
      if (update.message?.text) {
        const chatId = update.message.chat.id as number
        const text = update.message.text.trim()
        handle(chatId, text)
      }
      if (update.update_id > lastUpdateId) {
        lastUpdateId = update.update_id
      }
    }
  }

  poll().catch(onPollError)
}

const onPollError = () => {
  if (!running) return
  timeoutId = setTimeout(() => poll(), 5000)
}

export const start = (): void => {
  if (!TOKEN) {
    console.warn("GATECLAW_TELEGRAM_TOKEN not set; Telegram bot disabled")
    return
  }
  if (running) return
  running = true
  poll().catch(onPollError)
}

export const stop = (): void => {
  running = false
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = undefined
  }
}
