import { Hono } from "hono"
import { saveFact, getFact, getAllFacts, saveMessage, getMessages } from "../../opencode/src/gateclaw/memory"
import { getSoulName, getSoulPrompt, getPIDPath, getLogPath } from "./soul"
import { broadcast, clients } from "./events"
import { sendMessage } from "./telegram"
import fs from "node:fs"
import path from "node:path"

const app = new Hono()
const startTime = Date.now()

const log = (msg: string) => {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  try {
    fs.appendFileSync(getLogPath(), line + "\n")
  } catch {}
}

const pidPath = getPIDPath()
const pid = process.pid.toString()
fs.writeFileSync(pidPath, pid, "utf8")

const soulName = getSoulName()
log(`BOOT soul=${soulName} pid=${pid}`)

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    soul: getSoulName(),
    uptime_ms: Date.now() - startTime,
    pid: process.pid,
  })
})

app.post("/fact", async (c) => {
  const body = await c.req.json<{ key: string; value: string }>()
  saveFact(body.key, body.value)
  const chatId = Number(process.env.GATECLAW_TELEGRAM_CHAT_ID)
  if (chatId) sendMessage(chatId, `🐾 *Fact stored*\n\`${body.key}\` = ${body.value}`)
  return c.json({ ok: true })
})

app.get("/facts", (c) => {
  const facts = getAllFacts()
  return c.json(facts)
})

app.get("/fact/:key", (c) => {
  const key = c.req.param("key")
  const fact = getFact(key)
  if (!fact) return c.json({ error: "not found" }, 404)
  return c.json({ key: fact.key, value: fact.value })
})

app.post("/message", async (c) => {
  const body = await c.req.json<{ session_key: string; role: string; content: string }>()
  saveMessage(body.session_key, body.role, body.content)
  return c.json({ ok: true })
})

app.get("/messages/:session_key", (c) => {
  const sessionKey = c.req.param("session_key")
  const msgs = getMessages(sessionKey, 20)
  return c.json(msgs)
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
  const body = await c.req.json<{ message: string }>()
  broadcast(body.message)
  return c.json({ ok: true, clients: clients.size })
})

app.post("/telegram/send", async (c) => {
  const body = await c.req.json<{ chat_id: number; text: string }>()
  await sendMessage(body.chat_id, body.text)
  return c.json({ ok: true })
})

app.delete("/fact/:key", (c) => {
  const key = c.req.param("key")
  deleteFact(key)  // need to export deleteFact from memory.ts too
  return c.json({ ok: true })
})


export { app }
