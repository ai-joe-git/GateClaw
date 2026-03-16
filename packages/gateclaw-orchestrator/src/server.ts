import { Hono } from "hono"
import { z } from "zod"
import { logger, formatError } from "./logger"

// Daemon uses TUI's exact database - migrations run automatically on first use
import { Database, eq } from "../../opencode/src/storage/db"
import { SessionTable, MessageTable } from "../../opencode/src/session/session.sql"
import { ProjectTable } from "../../opencode/src/project/project.sql"
import { desc } from "../../opencode/src/storage/db"

// Force migrations to run - don't skip them
process.env.OPENCODE_SKIP_MIGRATIONS = "false"

// Legacy memory functions for backward compat
import {
  saveFact,
  getFact,
  getAllFacts,
  deleteFact,
  saveMessage,
  getMessages,
} from "../../opencode/src/gateclaw/memory"

import { sendTelegramMessage } from "./telegram-bot/utils/telegram-send.js"
import { getSoulName, getSoulPrompt, getPIDPath, getLogPath, getConfigDir, getSOULPath } from "./soul"
import { TOOLS_PROMPT } from "./tools"
import { broadcast, clients } from "./events"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { parse as parseJSONC } from "jsonc-parser"

// SSE Event Bus for OpenCode SDK compatibility
type SseClient = { send: (type: string, data: unknown) => void; close: () => void }
const sseClients = new Set<SseClient>()

export function broadcastSseEvent(type: string, data: unknown) {
  for (const client of sseClients) {
    try {
      client.send(type, data)
    } catch {
      sseClients.delete(client)
    }
  }
}

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

// Process schema for unified message handling
const processSchema = z.object({
  source: z.string().optional(), // "telegram", "tui", "cli"
  session: z.string().min(1), // always "gateclaw" for unified entity
  text: z.string().min(1),
  chat_id: z.number().optional(), // for reply routing
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

app.post("/shutdown", async (c) => {
  logger.info("Shutdown requested via HTTP")

  // Import and call cleanup from index.ts
  const { execSync } = await import("child_process")
  const { getConfigDir } = await import("./soul")

  // Stop OpenCode server
  const opencodePidPath = path.join(getConfigDir(), "opencode-server.pid")
  try {
    if (fs.existsSync(opencodePidPath)) {
      const pid = parseInt(fs.readFileSync(opencodePidPath, "utf8").trim(), 10)
      if (pid && process.platform === "win32") {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" })
      } else if (pid) {
        process.kill(pid, "SIGTERM")
      }
      fs.unlinkSync(opencodePidPath)
      logger.info("OpenCode server stopped via HTTP shutdown")
    }
  } catch {}

  setTimeout(() => process.exit(0), 100)
  return c.json({ ok: true })
})

app.post("/fact", async (c) => {
  try {
    const body = await c.req.json()
    const parsed = factSchema.parse(body)
    saveFact(parsed.key, parsed.value)
    const chatId = Number(process.env.GATECLAW_TELEGRAM_CHAT_ID)
    if (chatId) sendTelegramMessage(chatId, `🐾 *Fact stored*\n\`${parsed.key}\` = ${parsed.value}`)
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
    console.log(`[gateclaw:server] /message called: session=${parsed.session_key}, role=${parsed.role}`)
    await saveMessage(parsed.session_key, parsed.role, parsed.content)
    console.log(`[gateclaw:server] /message completed`)
    logger.info("Message stored", { session: parsed.session_key, role: parsed.role })
    return c.json({ ok: true })
  } catch (err: any) {
    console.error(`[gateclaw:server] /message error:`, err)
    logger.error("Failed to save message", { error: formatError(err), message: err.message })
    return c.json({ error: "failed to save message", detail: err.message }, 500)
  }
})

app.get("/messages/:session_key", (c) => {
  try {
    const sessionKey = c.req.param("session_key")
    const msgs = getMessages(sessionKey, 20)
    return c.json(msgs || [])
  } catch (err) {
    logger.error("Failed to fetch messages", { error: formatError(err) })
    return c.json([])
  }
})

app.get("/sessions", async (c) => {
  try {
    const sessions = Database.use((db) => db.select().from(SessionTable).orderBy(desc(SessionTable.time_updated)).all())
    return c.json({ data: sessions })
  } catch (err) {
    logger.error("Failed to fetch sessions", { error: formatError(err) })
    return c.json({ error: "failed to fetch sessions" }, 500)
  }
})

app.post("/reload-soul", (c) => {
  // Force soul cache refresh - called when SOUL.md is edited
  import("./soul").then(({ reloadSoul }) => reloadSoul())
  logger.info("SOUL.md reloaded")
  return c.json({ ok: true })
})

// GET /global/event - OpenCode SDK compatible SSE stream
app.get("/global/event", (c) => {
  const enc = new TextEncoder()
  let closed = false

  const body = new ReadableStream({
    start(ctrl) {
      const client: SseClient = {
        send(type, data) {
          if (closed) return
          ctrl.enqueue(enc.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`))
        },
        close() {
          closed = true
          try {
            ctrl.close()
          } catch {}
        },
      }
      sseClients.add(client)

      // heartbeat so the connection stays alive
      const hb = setInterval(() => client.send("ping", {}), 15000)

      c.req.raw.signal?.addEventListener("abort", () => {
        clearInterval(hb)
        sseClients.delete(client)
        closed = true
      })
    },
  })

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
})

// Alias for /event and /session/:id/event
app.get("/event", (c) => c.redirect("/global/event"))
app.get("/session/:id/event", (c) => c.redirect("/global/event"))

// Unified message processor - called by Telegram, TUI, CLI, future WhatsApp
// Writes to TUI's Session + Message tables so both share same conversation
app.post("/process", async (c) => {
  try {
    const body = await c.req.json()
    const parsed = processSchema.parse(body)

    logger.info("Processing message", {
      source: parsed.source,
      session: parsed.session,
      text: parsed.text.slice(0, 50),
    })

    const sessionId = `ses_gateclaw`

    let existingSession = Database.use((db) => {
      return db.select().from(SessionTable).where(eq(SessionTable.id, sessionId)).get()
    })

    if (!existingSession) {
      let projectId: string
      const existingProject = Database.use((db) => db.select().from(ProjectTable).limit(1).get())
      if (existingProject) {
        projectId = existingProject.id
      } else {
        const directory = process.env.GATECLAW_DIRECTORY || process.cwd()
        const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(directory))
        const hashHex = Array.from(new Uint8Array(hash))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .slice(0, 26)
        projectId = `prj_${hashHex}`
        Database.use((db) => {
          db.insert(ProjectTable)
            .values({
              id: projectId,
              worktree: directory,
              vcs: "git",
              name: "GateClaw",
              sandboxes: [],
              time_created: Date.now(),
              time_updated: Date.now(),
              time_initialized: Date.now(),
            })
            .run()
        })
      }

      const newSession = {
        id: sessionId,
        project_id: projectId,
        slug: "gateclaw",
        title: "GateClaw Unified Session",
        directory: process.env.GATECLAW_DIRECTORY || process.cwd(),
        version: "local",
        time_created: Date.now(),
        time_updated: Date.now(),
        workspace_id: null,
        parent_id: null,
        share_url: null,
        summary_additions: null,
        summary_deletions: null,
        summary_files: null,
        summary_diffs: null,
        revert: null,
        permission: null,
        time_compacting: null,
        time_archived: null,
      }
      Database.use((db) => {
        db.insert(SessionTable)
          .values(newSession as any)
          .run()
      })
      existingSession = newSession
      logger.info("Created gateclaw session", { sessionId, projectId })
    }

    // Load SOUL.md as system prompt
    const soulPath = getSOULPath()
    const systemPrompt = fs.existsSync(soulPath) ? fs.readFileSync(soulPath, "utf-8") : getSoulPrompt()

    // Load conversation history from gc_message table (last 20 messages)
    const sqlite = (Database as any).state?.sqlite
    const history = sqlite
      ? (sqlite
          .query(
            `SELECT role, content FROM gc_message WHERE session_key = 'gateclaw' ORDER BY time_created DESC LIMIT 20`,
          )
          .all() as Array<{ role: string; content: string }>)
      : []
    history.reverse()

    // Build messages array with SOUL.md + history
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: parsed.text },
    ]

    // Get model from env or default to llama-swap's gpt-oss-20b
    const model = process.env.GATECLAW_MODEL || "gpt-oss-20b"

    // Call LLM with context
    const llmRes = await fetch("http://localhost:8888/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
      }),
      signal: AbortSignal.timeout(180000),
    })

    const completion = (await llmRes.json()) as { choices?: [{ message?: { content?: string } }] }
    const reply = completion.choices?.[0]?.message?.content || "[GateClaw] No response"

    // 1. Emit session.status busy → triggers typing indicator in bot
    broadcastSseEvent("session.status", {
      sessionID: sessionId,
      status: "busy",
    })

    // 2. Emit message.part with the content
    const msgId = `msg-${Date.now()}`
    broadcastSseEvent("message.part", {
      sessionID: sessionId,
      part: {
        id: `part-${Date.now()}`,
        sessionID: sessionId,
        messageID: msgId,
        type: "text",
        content: reply,
        time: { created: Date.now(), completed: Date.now() },
      },
    })

    // 3. Emit message.completed so bot knows to flush
    broadcastSseEvent("message.completed", {
      sessionID: sessionId,
      message: {
        id: msgId,
        role: "assistant",
        sessionID: sessionId,
        time: { created: Date.now(), completed: Date.now() },
      },
    })

    // 4. Emit session.idle → bot sends final message to Telegram
    broadcastSseEvent("session.idle", {
      sessionID: sessionId,
    })

    // Save user message to TUI's Message table
    const userMsg = {
      id: `msg-${Date.now()}-user`,
      session_id: sessionId,
      time_created: Date.now(),
      data: {
        role: "user" as const,
        time: { created: Date.now() },
        agent: "gateclaw",
        mode: "code",
        model: { providerID: "gateclaw", modelID: model },
      },
    }

    Database.use((db) => {
      db.insert(MessageTable).values(userMsg).run()
    })

    // Save assistant response to TUI's Message table
    const assistantMsg = {
      id: `msg-${Date.now()}-assistant`,
      session_id: sessionId,
      time_created: Date.now(),
      data: {
        role: "assistant" as const,
        time: { created: Date.now(), completed: Date.now() },
        parentID: "",
        modelID: model,
        providerID: "gateclaw",
        mode: "code",
        agent: "gateclaw",
        path: { cwd: "", root: "" },
        cost: 0,
        tokens: { input: 0, output: reply.length, reasoning: 0, cache: { read: 0, write: 0 } },
      },
    }

    Database.use((db) => {
      db.insert(MessageTable).values(assistantMsg).run()
    })

    // Also save to gc_message for cross-interface consistency
    await saveMessage("gateclaw", "user", parsed.text)
    await saveMessage("gateclaw", "assistant", reply)

    logger.info("Processed with LLM", { sessionId, model, replyLength: reply.length })

    return c.json({ ok: true, reply })
  } catch (err: any) {
    logger.error("Process failed", { error: err.message })
    return c.json({ error: "processing failed", detail: err.message }, 500)
  }
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
    await sendTelegramMessage(parsed.chat_id, parsed.text)
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

// OpenCode-compatible endpoints for TUI + Telegram SDK
app.get("/projects", async (c) => {
  try {
    const projects = Database.use((db) => db.select().from(ProjectTable).all())
    return c.json({ data: projects })
  } catch (err) {
    logger.error("Failed to fetch projects", { error: formatError(err) })
    return c.json({ error: "failed to fetch projects" }, 500)
  }
})

app.get("/models", async (c) => {
  try {
    const configDir = process.env.APPDATA
      ? path.join(process.env.APPDATA, "gateclaw")
      : path.join(os.homedir(), ".config", "gateclaw")
    const configPath = path.join(configDir, "gateclaw.jsonc")

    if (!fs.existsSync(configPath)) {
      return c.json({
        data: [
          {
            providerID: "gateclaw",
            modelID: process.env.GATECLAW_MODEL_ID || "big-pickle",
            name: process.env.GATECLAW_MODEL_ID || "big-pickle",
          },
        ],
      })
    }

    const configContent = fs.readFileSync(configPath, "utf8")
    const configJson = parseJSONC(configContent)
    const providers = configJson.provider || {}

    const allModels: any[] = []
    for (const providerId of Object.keys(providers)) {
      const provider = providers[providerId]
      const models = provider?.models || {}
      for (const modelId of Object.keys(models)) {
        const model = models[modelId]
        allModels.push({
          providerID: providerId,
          modelID: modelId,
          name: model?.name || modelId,
          limit: model?.limit,
        })
      }
    }

    return c.json({ data: allModels })
  } catch (err) {
    logger.error("Failed to fetch models", { error: formatError(err) })
    return c.json({ data: [] }, 500)
  }
})

app.get("/agents", async (c) => {
  try {
    // Default code agent
    const agents = [
      { name: "code", description: "Code assistant" },
      { name: "default", description: "Default assistant" },
    ]
    return c.json({ data: agents })
  } catch (err) {
    logger.error("Failed to fetch agents", { error: formatError(err) })
    return c.json({ data: [] }, 500)
  }
})

// OpenCode SDK compatible session prompt endpoint
app.post("/session/prompt", async (c) => {
  try {
    const body = await c.req.json()
    logger.debug("SDK prompt body", { body })

    // SDK sends: { path: { id: "..." }, body: { parts: [...] } }
    const parts = body?.body?.parts || body?.parts || []
    const textPart = parts.find((p: any) => p?.type === "text")
    const text = textPart?.text || ""

    logger.info("SDK prompt received", { parts: parts.length, text: text?.slice(0, 50) })

    if (!text || text.length < 1) {
      logger.warn("SDK prompt empty", { body })
      return c.json({ error: "empty prompt" }, 400)
    }

    // Fire-and-forget - bot subscribes to SSE for actual response
    fetch("http://localhost:7371/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "sdk",
        session: "gateclaw",
        text,
      }),
    }).catch((err) => logger.error("async process failed", { err }))

    // Return 200 immediately so bot proceeds to SSE subscription
    return c.json({ ok: true })
  } catch (err) {
    logger.error("Failed to process SDK prompt", { error: formatError(err) })
    return c.json({ error: "failed to process prompt", detail: formatError(err) }, 500)
  }
})

app.get("/variants", async (c) => {
  try {
    const variants = [{ name: "default", description: "Default variant" }]
    return c.json({ data: variants })
  } catch (err) {
    logger.error("Failed to fetch variants", { error: formatError(err) })
    return c.json({ data: [] }, 500)
  }
})

// OpenCode-compatible stubs for Telegram bot
app.get("/project", async (c) => {
  try {
    const projects = Database.use((db) => db.select().from(ProjectTable).all())
    if (projects.length === 0) {
      // Auto-create a default project if none exists
      const directory = process.env.GATECLAW_DIRECTORY || process.cwd()
      const projectId = "prj_gateclaw"
      Database.use((db) => {
        db.insert(ProjectTable)
          .values({
            id: projectId,
            worktree: directory,
            vcs: "git",
            name: "GateClaw",
            sandboxes: [],
            time_created: Date.now(),
            time_updated: Date.now(),
            time_initialized: Date.now(),
          })
          .run()
      })
      // Return bare array (not { data: [...] })
      return c.json([{ id: projectId, name: "GateClaw", worktree: directory }])
    }
    // Return bare array with valid worktree (never null)
    return c.json(
      projects.map((p) => ({
        id: p.id,
        name: p.name || p.worktree?.split(/[\\/]/).pop() || "GateClaw",
        worktree: p.worktree || process.env.GATECLAW_DIRECTORY || process.cwd(),
      })),
    )
  } catch (err) {
    logger.error("Failed to fetch projects", { error: formatError(err) })
    return c.json({ error: "failed to fetch projects" }, 500)
  }
})

app.get("/session", async (c) => {
  try {
    const sessions = Database.use((db) => db.select().from(SessionTable).all())
    // Bot expects array directly, not { data: [...] }
    return c.json(sessions)
  } catch (err) {
    logger.error("Failed to fetch sessions", { error: formatError(err) })
    return c.json({ error: "failed to fetch sessions" }, 500)
  }
})

app.get("/session/status", async (c) => {
  return c.json({ ses_gateclaw: { type: "idle" } })
})

app.get("/model", async (c) => {
  const model = process.env.GATECLAW_MODEL_ID || "big-pickle"
  return c.json({ data: [{ id: model, name: model, provider: "gateclaw" }] })
})

app.get("/provider", async (c) => {
  try {
    const configDir = process.env.APPDATA
      ? path.join(process.env.APPDATA, "gateclaw")
      : path.join(os.homedir(), ".config", "gateclaw")
    const configPath = path.join(configDir, "gateclaw.jsonc")

    if (!fs.existsSync(configPath)) {
      return c.json({ data: [{ id: "gateclaw", name: "GateClaw" }] })
    }

    const configContent = fs.readFileSync(configPath, "utf8")
    // Use jsonc-parser to handle comments and trailing commas
    const configJson = parseJSONC(configContent)
    const providers = configJson.provider || {}

    const providerList = Object.entries(providers).map(([id, config]: [string, any]) => ({
      id,
      name: config.name || id,
      npm: config.npm,
      models: config.models || {},
    }))

    return c.json({ data: providerList })
  } catch (err) {
    console.error("Failed to load providers:", err)
    return c.json({ data: [{ id: "gateclaw", name: "GateClaw" }] })
  }
})

// Telegram bot control endpoints
let telegramBotRunning = false
let telegramStopRequested = false

app.get("/telegram/status", async (c) => {
  const configDir = process.env.APPDATA
    ? path.join(process.env.APPDATA, "gateclaw")
    : path.join(os.homedir(), ".config", "gateclaw")
  const envPath = path.join(configDir, ".env")

  let tokenConfigured = false
  let chatIdConfigured = false

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8")
    tokenConfigured = !!envContent.match(/GATECLAW_TELEGRAM_TOKEN="([^"]+)"/)
    chatIdConfigured = !!envContent.match(/GATECLAW_TELEGRAM_CHAT_ID="(\d+)"/)
  }

  return c.json({
    running: telegramBotRunning,
    configured: tokenConfigured && chatIdConfigured,
    stopRequested: telegramStopRequested,
  })
})

app.post("/telegram/stop", async (c) => {
  telegramStopRequested = true
  telegramBotRunning = false // Mark as stopped
  return c.json({ success: true, message: "Stop signal sent to bot" })
})

app.post("/telegram/start", async (c) => {
  telegramStopRequested = false
  telegramBotRunning = true
  return c.json({ success: true, message: "Bot marked as started" })
})

export { app }
