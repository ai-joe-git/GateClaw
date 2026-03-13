import { Hono } from "hono"
import {
  saveFact,
  getFact,
  getAllFacts,
  deleteFact,
  saveMessage,
  getMessages,
} from "../../opencode/src/gateclaw/memory"
import { getSoulName, getSoulPrompt, getPIDPath, getLogPath } from "./soul"
import { broadcast, clients } from "./events"
import { sendMessage } from "./telegram"
import { logger, formatError } from "./logger"
import { z } from "zod"
import fs from "node:fs"

const app = new Hono()
const startTime = Date.now()

const pidPath = getPIDPath()
const pid = process.pid.toString()
fs.writeFileSync(pidPath, pid, "utf8")

const soulName = getSoulName()
logger.info("BOOT", { soul: soulName, pid })

// Validate env at startup
const telegramToken = process.env.GATECLAW_TELEGRAM_TOKEN
const telegramChatId = process.env.GATECLAW_TELEGRAM_CHAT_ID
if (!telegramToken || !telegramChatId) {
  logger.warn("Telegram not configured", { token: !!telegramToken, chatId: !!telegramChatId })
}

// Zod schemas for request validation
const factSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
})

const messageSchema = z.object({
  session_key: z.string().min(1),
  role: z.string().min(1),
  content: z.string().min(1),
})

const broadcastSchema = z.object({
  message: z.string().min(1),
})

const telegramSchema = z.object({
  chat_id: z.number().int().positive(),
  text: z.string().min(1),
})

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    soul: getSoulName(),
    uptime_ms: Date.now() - startTime,
    pid: process.pid,
    telegram: telegramToken && telegramChatId ? "configured" : "missing",
  })
})

app.post("/shutdown", (c) => {
  logger.info("Shutdown requested via HTTP")
  setTimeout(() => process.exit(0), 100)
  return c.json({ ok: true })
})

app.post("/fact", async (c) => {
  try {
    const body = await c.req.json()
    const parsed = factSchema.parse(body)
    saveFact(parsed.key, parsed.value)
    const chatId = Number(process.env.GATECLAW_TELEGRAM_CHAT_ID)
    if (chatId) sendMessage(chatId, `🐾 *Fact stored*\n\`${parsed.key}\` = ${parsed.value}`)
    logger.info("Fact stored", { key: parsed.key })
    return c.json({ ok: true })
  } catch (err) {
    logger.error("Failed to save fact", { error: formatError(err) })
    return c.json({ error: "failed to save fact" }, 500)
  }
})

app.get("/facts", (c) => {
  const facts = getAllFacts()
  return c.json(facts)
})

app.get("/fact/:key", (c) => {
  try {
    const key = c.req.param("key")
    const fact = getFact(key)
    if (!fact) return c.json({ error: "not found" }, 404)
    return c.json({ key: fact.key, value: fact.value })
  } catch {
    return c.json({ error: "invalid key" }, 400)
  }
})

app.post("/message", async (c) => {
  try {
    const body = await c.req.json()
    const parsed = messageSchema.parse(body)
    saveMessage(parsed.session_key, parsed.role, parsed.content)
    logger.info("Message stored", { session: parsed.session_key, role: parsed.role })
    return c.json({ ok: true })
  } catch (err) {
    logger.error("Failed to save message", { error: formatError(err) })
    return c.json({ error: "failed to save message" }, 500)
  }
})

app.get("/messages/:session_key", (c) => {
  try {
    const sessionKey = c.req.param("session_key")
    const msgs = getMessages(sessionKey, 20)
    return c.json(msgs)
  } catch (err) {
    logger.error("Failed to fetch messages", { error: formatError(err) })
    return c.json({ error: "failed to fetch messages" }, 500)
  }
})

app.get("/events", (c) => {
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const send = (msg: string) => {
    writer.write(encoder.encode(`data: ${msg}\n\n`)).catch(() => {
      clients.delete(send)
    })
  }

  clients.add(send)

  writer.write(encoder.encode(`data: ${JSON.stringify({ type: "connected", soul: getSoulName() })}\n\n`))

  const keepalive = setInterval(() => {
    writer.write(encoder.encode(`: keepalive\n\n`)).catch(() => {
      clearInterval(keepalive)
      clients.delete(send)
    })
  }, 30_000)

  c.req.raw.signal.addEventListener("abort", () => {
    clearInterval(keepalive)
    clients.delete(send)
    writer.close().catch(() => {})
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
})

app.post("/broadcast", async (c) => {
  try {
    const body = await c.req.json()
    const parsed = broadcastSchema.parse(body)
    broadcast(parsed.message)
    logger.info("Broadcast sent", { clients: clients.size })
    return c.json({ ok: true, clients: clients.size })
  } catch (err) {
    logger.error("Broadcast failed", { error: formatError(err) })
    return c.json({ error: "broadcast failed" }, 500)
  }
})

app.post("/telegram/send", async (c) => {
  try {
    const body = await c.req.json()
    const parsed = telegramSchema.parse(body)
    await sendMessage(parsed.chat_id, parsed.text)
    logger.info("Telegram message sent", { chat_id: parsed.chat_id })
    return c.json({ ok: true })
  } catch (err) {
    logger.error("Failed to send telegram message", { error: formatError(err) })
    return c.json({ error: "failed to send message" }, 500)
  }
})

app.delete("/fact/:key", (c) => {
  try {
    const key = c.req.param("key")
    deleteFact(key)
    logger.info("Fact deleted", { key })
    return c.json({ ok: true })
  } catch {
    return c.json({ error: "not found" }, 404)
  }
})

export { app }
