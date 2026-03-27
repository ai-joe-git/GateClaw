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

// Global telegram bot state (set by telegram bot when running)
declare global {
  // eslint-disable-next-line no-var
  var __telegramBotRunning: boolean | undefined
}

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
import {
  preResponse,
  postResponse,
  shouldInitiate,
  getInitiativeAction,
  formatInitiativeMessage,
  reloadSoul as reloadSoulEngine,
} from "./soul-engine"
import { TOOLS_PROMPT } from "./tools"
import { broadcast, clients } from "./events"
import { processManager } from "./telegram-bot/process/manager.js"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { parse as parseJSONC } from "jsonc-parser"
import { createOpencodeClient } from "@opencode-ai/sdk/v2"

// OpenCode client for Chat tab (same as Telegram bot)
const opencodeClient = createOpencodeClient({
  baseUrl: process.env.OPENCODE_API_URL || "http://localhost:4100",
  headers: process.env.OPENCODE_SERVER_PASSWORD
    ? { Authorization: `Basic ${Buffer.from(`gateclaw:${process.env.OPENCODE_SERVER_PASSWORD}`).toString("base64")}` }
    : undefined,
})

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

  const { execSync } = await import("child_process")
  const { getConfigDir } = await import("./soul")

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

  setTimeout(async () => {
    logger.info("Daemon shutdown complete")
    process.exit(0)
  }, 500)
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
  reloadSoulEngine() // Also reload soul engine config
  logger.info("SOUL.md and soul engine reloaded")
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
    let reply = completion.choices?.[0]?.message?.content || "[GateClaw] No response"

    // Apply soul engine post-processing
    const modifiers = preResponse({ source: parsed.source, session: parsed.session })
    reply = postResponse(reply, modifiers)

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

// Voice endpoints
app.get("/voice/voices", async (c) => {
  try {
    const { getAvailableVoices } = await import("./telegram-bot/tts/client.js")
    const voices = await getAvailableVoices()
    return c.json({ data: voices })
  } catch (err) {
    logger.error("Failed to fetch voices", { error: formatError(err) })
    return c.json({ data: [] }, 500)
  }
})

app.post("/voice/synthesize", async (c) => {
  try {
    const body = await c.req.json()
    const { text, voice } = body
    if (!text || text.length < 1) {
      return c.json({ error: "empty text" }, 400)
    }

    const { synthesizeSpeech } = await import("./telegram-bot/tts/client.js")
    const result = await synthesizeSpeech(text, voice)

    return c.json({ ok: true, audio: result.audio.toString("base64"), contentType: result.contentType })
  } catch (err: any) {
    logger.error("Failed to synthesize speech", { error: formatError(err) })
    return c.json({ error: "synthesis failed", detail: err.message }, 500)
  }
})

app.get("/voice/status/:user_id", async (c) => {
  try {
    const userId = parseInt(c.req.param("user_id"))
    if (isNaN(userId)) {
      return c.json({ error: "invalid user_id" }, 400)
    }

    const { getUserVoiceSettings } = await import("./telegram-bot/voice/manager.js")
    const settings = getUserVoiceSettings(userId)

    return c.json({ enabled: settings.enabled, voice: settings.voice })
  } catch (err) {
    logger.error("Failed to get voice status", { error: formatError(err) })
    return c.json({ enabled: false, voice: "david-attenborough-original" })
  }
})

app.post("/voice/settings", async (c) => {
  try {
    const body = await c.req.json()
    const { user_id, enabled, voice } = body
    if (!user_id || typeof enabled !== "boolean") {
      return c.json({ error: "invalid request" }, 400)
    }

    const { setUserVoiceSettings } = await import("./telegram-bot/voice/manager.js")
    setUserVoiceSettings(user_id, { enabled, voice: voice || "david-attenborough-original" })

    return c.json({ ok: true })
  } catch (err) {
    logger.error("Failed to save voice settings", { error: formatError(err) })
    return c.json({ error: "save failed" }, 500)
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

// ========== CONFIG ENDPOINTS ==========

// Read config file content
app.get("/config/:file", async (c) => {
  const file = c.req.param("file")
  const validFiles = [".env", "gateclaw.jsonc", "SOUL.md", "soul_v2/SOUL.md"]
  if (!validFiles.includes(file)) {
    return c.json({ error: "Invalid file" }, 400)
  }

  const configDir = getConfigDir()
  // For SOUL.md, prefer soul_v2/SOUL.md if it exists
  let filePath = path.join(configDir, file)
  if (file === "SOUL.md") {
    const soulV2Path = path.join(configDir, "soul_v2", "SOUL.md")
    if (fs.existsSync(soulV2Path)) {
      filePath = soulV2Path
    }
  }

  try {
    if (!fs.existsSync(filePath)) {
      return c.json({ content: null, exists: false })
    }
    const content = fs.readFileSync(filePath, "utf-8")
    return c.json({ content, exists: true, path: filePath })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Save config file content
app.post("/config/:file", async (c) => {
  const file = c.req.param("file")
  const validFiles = [".env", "gateclaw.jsonc"]
  if (!validFiles.includes(file)) {
    return c.json({ error: "Invalid file" }, 400)
  }

  const configDir = getConfigDir()
  const filePath = path.join(configDir, file)

  try {
    const body = await c.req.json()
    if (typeof body.content !== "string") {
      return c.json({ error: "Content must be string" }, 400)
    }
    fs.writeFileSync(filePath, body.content, "utf-8")
    return c.json({ success: true })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== SYSTEM STATS ENDPOINTS ==========

// Get system stats (CPU, memory, disk)
app.get("/system/stats", async (c) => {
  try {
    const os = await import("node:os")
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    const configDir = getConfigDir()
    const dbPath = path.join(configDir, "gateclaw.db")
    let dbSize = 0
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath)
      dbSize = stats.size
    }

    return c.json({
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
      },
      cpu: cpuUsage,
      uptime: process.uptime(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      dbSize,
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== HEALTH CHECKS ==========

type HealthStatus = "ok" | "error" | "offline" | "unknown" | "configured" | "not_configured"
type HealthCheck = { status: HealthStatus; latency: number | null }

// Check all external service connections
app.get("/health/checks", async (c) => {
  const checks: Record<string, HealthCheck> = {
    daemon: { status: "ok", latency: 0 },
    opencode: { status: "unknown", latency: null },
    stt: { status: "unknown", latency: null },
    tts: { status: "unknown", latency: null },
    telegram: { status: "unknown", latency: null },
  }

  // Daemon check
  const daemonStart = Date.now()
  checks["daemon"]!.latency = Date.now() - daemonStart

  // OpenCode server check
  try {
    const start = Date.now()
    const res = await fetch("http://localhost:4100/global/health", { signal: AbortSignal.timeout(2000) })
    checks.opencode = { status: res.ok ? "ok" : "error", latency: Date.now() - start }
  } catch {
    checks.opencode = { status: "offline", latency: null }
  }

  // STT server check
  try {
    const start = Date.now()
    const res = await fetch("http://localhost:7372/health", { signal: AbortSignal.timeout(2000) })
    checks.stt = { status: res.ok ? "ok" : "error", latency: Date.now() - start }
  } catch {
    checks.stt = { status: "offline", latency: null }
  }

  // TTS server check
  try {
    const start = Date.now()
    const res = await fetch("http://localhost:8000/health", { signal: AbortSignal.timeout(2000) })
    checks.tts = { status: res.ok ? "ok" : "error", latency: Date.now() - start }
  } catch {
    checks.tts = { status: "offline", latency: null }
  }

  // Telegram check (just if configured)
  const telegramToken = process.env.GATECLAW_TELEGRAM_TOKEN
  const telegramChatId = process.env.GATECLAW_TELEGRAM_CHAT_ID
  checks.telegram = {
    status: telegramToken && telegramChatId ? "configured" : "not_configured",
    latency: null,
  }

  return c.json(checks)
})

// ========== LOGS ENDPOINT ==========

// Get daemon log content
app.get("/logs", async (c) => {
  try {
    const logPath = getLogPath()
    if (!fs.existsSync(logPath)) {
      return c.json({ lines: [], exists: false })
    }

    const content = fs.readFileSync(logPath, "utf-8")
    const lines = content.split("\n").filter((l) => l.trim())
    const limit = parseInt(c.req.query("limit") || "100")
    const offset = parseInt(c.req.query("offset") || "0")

    return c.json({
      lines: lines.slice(-limit - offset, -offset || undefined),
      total: lines.length,
      exists: true,
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error, lines: [] }, 500)
  }
})

// ========== CONVERSATION HISTORY ==========

// Get recent messages
app.get("/messages", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "50")
    const messages = await getMessages("gateclaw", limit)
    return c.json({ messages })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error, messages: [] }, 500)
  }
})

// Clear conversation history
app.delete("/messages", async (c) => {
  try {
    const db = Database.Client()
    const { GCMessageTable } = await import("../../opencode/src/gateclaw/memory.sql")
    db.delete(GCMessageTable).run()
    return c.json({ success: true })
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown error"
    return c.json({ error }, 500)
  }
})

// ========== SOUL RELOAD ==========

// Reload soul configuration
app.post("/soul/reload", async (c) => {
  try {
    await reloadSoulEngine()
    return c.json({ success: true, message: "Soul reloaded" })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== DAEMON RESTART ==========

// Restart the daemon (graceful shutdown)
app.post("/daemon/restart", async (c) => {
  // Note: cleanup is defined in index.ts, this just sends acknowledgment
  // The process manager should handle actual restart
  return c.json({ success: true, message: "Restart acknowledged - process manager will handle restart" })
})

// ========== PLUGIN MANAGER ==========

// In-memory plugin state (persisted in gateclaw.jsonc)
let pluginsState: Record<string, { enabled: boolean; name: string; description: string }> = {
  "@different-ai/opencode-browser": {
    enabled: true,
    name: "Browser Tools",
    description: "Browser automation and web scraping tools",
  },
}

// Get all plugins and their status
app.get("/plugins", async (c) => {
  try {
    const configDir = getConfigDir()
    const configPath = path.join(configDir, "gateclaw.jsonc")

    // Load config to get actual plugin list
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, "utf-8")
      const configJson = parseJSONC(configContent)
      const configuredPlugins = configJson.plugin || []

      // Update state with configured plugins
      for (const plugin of configuredPlugins) {
        if (typeof plugin === "string" && !pluginsState[plugin]) {
          pluginsState[plugin] = { enabled: true, name: plugin, description: "" }
        }
      }
    }

    return c.json({
      plugins: Object.entries(pluginsState).map(([id, state]) => ({
        id,
        name: state.name,
        description: state.description,
        enabled: state.enabled,
      })),
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Enable a plugin
app.post("/plugins/:id/enable", async (c) => {
  try {
    const pluginId = c.req.param("id")
    if (!pluginsState[pluginId]) {
      pluginsState[pluginId] = { enabled: true, name: pluginId, description: "" }
    } else {
      pluginsState[pluginId].enabled = true
    }

    // Update config file
    const configDir = getConfigDir()
    const configPath = path.join(configDir, "gateclaw.jsonc")
    let configJson: Record<string, unknown> = {}

    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, "utf-8")
      configJson = parseJSONC(configContent)
    }

    const plugins = (configJson.plugin as string[]) || []
    if (!plugins.includes(pluginId)) {
      plugins.push(pluginId)
      configJson.plugin = plugins
      fs.writeFileSync(configPath, JSON.stringify(configJson, null, 2), "utf-8")
    }

    return c.json({ success: true, plugin: { id: pluginId, ...pluginsState[pluginId] } })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Disable a plugin
app.post("/plugins/:id/disable", async (c) => {
  try {
    const pluginId = c.req.param("id")
    if (pluginsState[pluginId]) {
      pluginsState[pluginId].enabled = false
    }

    // Update config file
    const configDir = getConfigDir()
    const configPath = path.join(configDir, "gateclaw.jsonc")

    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, "utf-8")
      const configJson = parseJSONC(configContent)
      const plugins = (configJson.plugin as string[]) || []
      configJson.plugin = plugins.filter((p: string) => p !== pluginId)
      fs.writeFileSync(configPath, JSON.stringify(configJson, null, 2), "utf-8")
    }

    return c.json({ success: true })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== VOICE PIPELINE ==========

// Get voice pipeline status
app.get("/voice/status", async (c) => {
  try {
    const sttUrl = process.env.STT_API_URL || ""
    const ttsUrl = process.env.TTS_API_URL || ""

    // Check STT
    let sttStatus: "ok" | "offline" | "not_configured" = "not_configured"
    let sttLatency: number | null = null
    if (sttUrl) {
      try {
        const start = Date.now()
        const res = await fetch(`${sttUrl}/health`, { signal: AbortSignal.timeout(2000) })
        sttStatus = res.ok ? "ok" : "offline"
        sttLatency = Date.now() - start
      } catch {
        sttStatus = "offline"
      }
    }

    // Check TTS
    let ttsStatus: "ok" | "offline" | "not_configured" = "not_configured"
    let ttsLatency: number | null = null
    if (ttsUrl) {
      try {
        const start = Date.now()
        const res = await fetch(`${ttsUrl}/health`, { signal: AbortSignal.timeout(2000) })
        ttsStatus = res.ok ? "ok" : "offline"
        ttsLatency = Date.now() - start
      } catch {
        ttsStatus = "offline"
      }
    }

    // Get available TTS voices
    let voices: Array<{ id: string; name: string }> = []
    if (ttsUrl && ttsStatus === "ok") {
      try {
        const res = await fetch(`${ttsUrl}/v1/audio/voices`, { signal: AbortSignal.timeout(5000) })
        if (res.ok) {
          const data = (await res.json()) as { voices?: Array<{ voice_id?: string; id?: string; name?: string }> }
          voices = (data.voices || []).map((v) => ({
            id: v.voice_id || v.id || "",
            name: v.name || v.voice_id || v.id || "",
          }))
        }
      } catch {
        // Ignore voice fetch errors
      }
    }

    return c.json({
      stt: {
        configured: !!sttUrl,
        status: sttStatus,
        latency: sttLatency,
        url: sttUrl || null,
        model: process.env.STT_MODEL || "whisper-large-v3-turbo",
      },
      tts: {
        configured: !!ttsUrl,
        status: ttsStatus,
        latency: ttsLatency,
        url: ttsUrl || null,
        model: process.env.TTS_MODEL || "tts-1",
        voices,
        defaultVoice: process.env.TTS_DEFAULT_VOICE || "david-attenborough-original",
      },
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Get/Set voice settings
app.get("/voice/settings", async (c) => {
  try {
    // This could read from database or config
    return c.json({
      voiceEnabled: false, // Would come from user settings in gc_setting table
      preferredVoice: process.env.TTS_DEFAULT_VOICE || "david-attenborough-original",
      speed: parseFloat(process.env.TTS_SPEED || "1.0"),
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

app.post("/voice/settings", async (c) => {
  try {
    const body = await c.req.json()
    // Would save to gc_setting table or .env
    return c.json({ success: true, settings: body })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== SETTINGS ==========

interface DashboardSettings {
  theme: "dark" | "light" | "auto"
  autoOpenBrowser: boolean
  showNotifications: boolean
  logLevel: "debug" | "info" | "warn" | "error"
  model: string
  provider: string
  locale: string
  hideThinkingMessages: boolean
  hideToolCallMessages: boolean
  messageFormatMode: "raw" | "markdown"
}

const defaultSettings: DashboardSettings = {
  theme: "dark",
  autoOpenBrowser: true,
  showNotifications: true,
  logLevel: "info",
  model: "gpt-oss-20b",
  provider: "llama-swap",
  locale: "en",
  hideThinkingMessages: false,
  hideToolCallMessages: false,
  messageFormatMode: "markdown",
}

// Get dashboard settings
app.get("/settings", async (c) => {
  try {
    const configDir = getConfigDir()
    const settingsPath = path.join(configDir, "dashboard-settings.json")

    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, "utf-8")
      const saved = JSON.parse(content)
      return c.json({ ...defaultSettings, ...saved })
    }

    return c.json(defaultSettings)
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Save dashboard settings
app.post("/settings", async (c) => {
  try {
    const body = await c.req.json()
    const configDir = getConfigDir()
    const settingsPath = path.join(configDir, "dashboard-settings.json")

    // Merge with defaults
    const settings = { ...defaultSettings, ...body }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8")

    return c.json({ success: true, settings })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Reset settings to defaults
app.post("/settings/reset", async (c) => {
  try {
    const configDir = getConfigDir()
    const settingsPath = path.join(configDir, "dashboard-settings.json")

    if (fs.existsSync(settingsPath)) {
      fs.unlinkSync(settingsPath)
    }

    return c.json({ success: true, settings: defaultSettings })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== TELEGRAM LOGS ==========

// In-memory telegram log buffer
const telegramLogs: string[] = []
const MAX_TELEGRAM_LOGS = 500

// Function to add telegram log (called from telegram-bot)
export function addTelegramLog(message: string) {
  const timestamp = new Date().toISOString()
  const logLine = `[${timestamp}] ${message}`
  telegramLogs.push(logLine)
  if (telegramLogs.length > MAX_TELEGRAM_LOGS) {
    telegramLogs.shift()
  }
}

// Get telegram logs
app.get("/telegram/logs", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "100")
    const logs = telegramLogs.slice(-limit)
    return c.json({ logs, total: telegramLogs.length })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Clear telegram logs
app.delete("/telegram/logs", async (c) => {
  try {
    telegramLogs.length = 0
    return c.json({ success: true })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Get telegram status
app.get("/telegram/status", async (c) => {
  try {
    const token = process.env.GATECLAW_TELEGRAM_TOKEN
    const chatId = process.env.GATECLAW_TELEGRAM_CHAT_ID

    // Check if telegram bot is actually running
    // This would need to check a global state set by the telegram bot
    const isRunning = globalThis.__telegramBotRunning === true

    return c.json({
      configured: !!(token && chatId),
      running: isRunning,
      hasToken: !!token,
      hasChatId: !!chatId,
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Start telegram bot
app.post("/telegram/start", async (c) => {
  try {
    // This would trigger the telegram bot to start
    // For now, return success - actual implementation would call the bot start function
    return c.json({ success: true, message: "Telegram bot start requested" })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Stop telegram bot
app.post("/telegram/stop", async (c) => {
  try {
    globalThis.__telegramBotRunning = false
    return c.json({ success: true, message: "Telegram bot stop requested" })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== LOG STREAMING (WebSocket-like via SSE) ==========

// Stream logs in real-time via Server-Sent Events
app.get("/logs/stream", async (c) => {
  // Set SSE headers
  c.header("Content-Type", "text/event-stream")
  c.header("Cache-Control", "no-cache")
  c.header("Connection", "keep-alive")

  const stream = new ReadableStream({
    start(controller) {
      const logPath = getLogPath()
      let lastSize = 0

      // Send initial log content
      if (fs.existsSync(logPath)) {
        const stats = fs.statSync(logPath)
        lastSize = stats.size
        const content = fs.readFileSync(logPath, "utf-8")
        const lines = content.split("\n").slice(-50)
        controller.enqueue(`data: ${JSON.stringify({ type: "init", lines })}\n\n`)
      }

      // Poll for new logs every 500ms
      const interval = setInterval(() => {
        try {
          if (fs.existsSync(logPath)) {
            const stats = fs.statSync(logPath)
            if (stats.size > lastSize) {
              const newContent = fs.readFileSync(logPath, "utf-8").slice(lastSize)
              lastSize = stats.size
              const newLines = newContent.split("\n").filter((l) => l.trim())
              if (newLines.length > 0) {
                controller.enqueue(`data: ${JSON.stringify({ type: "logs", lines: newLines })}\n\n`)
              }
            }
          }
        } catch {
          // Ignore errors
        }
      }, 500)

      // Cleanup on close
      setTimeout(() => {
        clearInterval(interval)
        controller.close()
      }, 60000) // 1 minute timeout
    },
  })

  return new Response(stream)
})

// ========== METRICS ==========

// Get time-series metrics for charts
app.get("/metrics/history", async (c) => {
  try {
    // This would ideally store time-series data
    // For now, return current snapshot
    const metrics = {
      timestamps: [Date.now()],
      memory: [process.memoryUsage().rss],
      cpu: [process.cpuUsage().user],
      dbSize: [0],
    }

    // Get DB size
    const configDir = getConfigDir()
    const dbPath = path.join(configDir, "gateclaw.db")
    if (fs.existsSync(dbPath)) {
      metrics.dbSize[0] = fs.statSync(dbPath).size
    }

    return c.json(metrics)
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== SOUL PRESETS ==========

interface SoulPreset {
  id: string
  name: string
  description: string
  path?: string
}

const soulPresets: SoulPreset[] = [
  { id: "gateclaw_default", name: "GateClaw Default", description: "Default GateClaw personality", path: "SOUL.md" },
  {
    id: "developer_partner",
    name: "Developer Partner",
    description: "Technical assistant focused",
    path: "soul_v2/presets/developer_partner.md",
  },
  {
    id: "polite_assistant",
    name: "Polite Assistant",
    description: "Formal and helpful",
    path: "soul_v2/presets/polite_assistant.md",
  },
  {
    id: "terse_hacker",
    name: "Terse Hacker",
    description: "Minimal responses, maximum efficiency",
    path: "soul_v2/presets/terse_hacker.md",
  },
]

// Get available soul presets
app.get("/soul/presets", async (c) => {
  try {
    const configDir = getConfigDir()
    const presetsWithPath = soulPresets.map((p) => ({
      ...p,
      exists: p.path ? fs.existsSync(path.join(configDir, p.path)) : false,
    }))

    // Check which presets actually exist
    const available = presetsWithPath.filter((p) => p.id === "gateclaw_default" || p.exists)

    return c.json({ presets: available })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Set active soul preset
app.post("/soul/preset/:id", async (c) => {
  try {
    const presetId = c.req.param("id")
    const preset = soulPresets.find((p) => p.id === presetId)

    if (!preset) {
      return c.json({ error: "Preset not found" }, 404)
    }

    // Would copy preset to SOUL.md or update config
    return c.json({ success: true, preset })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== CONFIG EDIT ==========

app.post("/config/:file", async (c) => {
  const file = c.req.param("file")
  const validFiles = [".env", "gateclaw.jsonc"]
  if (!validFiles.includes(file)) {
    return c.json({ error: "Invalid file" }, 400)
  }

  const configDir = getConfigDir()
  const filePath = path.join(configDir, file)

  try {
    const body = await c.req.json()
    if (typeof body.content !== "string") {
      return c.json({ error: "Content must be string" }, 400)
    }
    fs.writeFileSync(filePath, body.content, "utf-8")
    return c.json({ success: true })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== SESSION MANAGEMENT ==========

// Get all sessions with metadata
app.get("/sessions/detailed", async (c) => {
  try {
    const sessions = Database.use((db) => db.select().from(SessionTable).orderBy(desc(SessionTable.time_updated)).all())

    // Get message counts for each session
    const sessionsWithMeta = sessions.map((s) => {
      const messages = Database.use((db) =>
        db.select().from(MessageTable).where(eq(MessageTable.session_id, s.id)).all(),
      )
      return {
        ...s,
        messageCount: messages.length,
        lastActivity: s.time_updated || s.time_created,
      }
    })

    return c.json({ sessions: sessionsWithMeta })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Get session details with messages
app.get("/session/:id", async (c) => {
  try {
    const sessionId = c.req.param("id")
    const session = Database.use((db) => db.select().from(SessionTable).where(eq(SessionTable.id, sessionId)).get())

    if (!session) {
      return c.json({ error: "Session not found" }, 404)
    }

    const messages = Database.use((db) =>
      db.select().from(MessageTable).where(eq(MessageTable.session_id, sessionId)).all(),
    )

    return c.json({ session, messages })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Delete a session
app.delete("/session/:id", async (c) => {
  try {
    const sessionId = c.req.param("id")
    Database.use((db) => {
      db.delete(MessageTable).where(eq(MessageTable.session_id, sessionId)).run()
      db.delete(SessionTable).where(eq(SessionTable.id, sessionId)).run()
    })
    return c.json({ success: true })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== USAGE METRICS ==========

// In-memory activity log for real-time feed
const activityLog: Array<{ timestamp: number; type: string; message: string; data?: any }> = []
const MAX_ACTIVITY_LOG = 100

export function logActivity(type: string, message: string, data?: any) {
  activityLog.push({ timestamp: Date.now(), type, message, data })
  if (activityLog.length > MAX_ACTIVITY_LOG) {
    activityLog.shift()
  }
}

// Get activity feed
app.get("/activity", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "50")
    const activities = activityLog.slice(-limit)
    return c.json({ activities })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Get usage metrics
app.get("/metrics", async (c) => {
  try {
    // Get message counts
    const allMessages = Database.use((db) => db.select().from(MessageTable).all())
    const allFacts = await getAllFacts()

    // Calculate time-based metrics
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

    const messagesToday = allMessages.filter((m) => (m.time_created || 0) > oneDayAgo).length
    const messagesThisWeek = allMessages.filter((m) => (m.time_created || 0) > oneWeekAgo).length

    // Get recent errors from logs
    const logPath = getLogPath()
    let recentErrors = 0
    if (fs.existsSync(logPath)) {
      const logs = fs.readFileSync(logPath, "utf-8").split("\n")
      const today = new Date().toISOString().split("T")[0] || ""
      recentErrors = logs.filter((l) => l.toLowerCase().includes("error") && l.includes(today)).length
    }

    return c.json({
      messages: {
        total: allMessages.length,
        today: messagesToday,
        thisWeek: messagesThisWeek,
      },
      memory: {
        totalFacts: allFacts.length,
      },
      errors: {
        today: recentErrors,
      },
      daemon: {
        uptime: process.uptime(),
        startTime: Date.now() - Math.floor(process.uptime() * 1000),
      },
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Get recent errors
app.get("/errors", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "20")
    const logPath = getLogPath()

    if (!fs.existsSync(logPath)) {
      return c.json({ errors: [] })
    }

    const logs = fs.readFileSync(logPath, "utf-8").split("\n")
    const errors = logs
      .filter((l) => l.toLowerCase().includes("error") || l.toLowerCase().includes("warn"))
      .slice(-limit)
      .map((l) => ({
        timestamp: l.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)?.[0] || new Date().toISOString(),
        message: l,
        level: l.toLowerCase().includes("error") ? "error" : "warn",
      }))

    return c.json({ errors })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== EXPORT/BACKUP ==========

// Export memory to JSON
app.get("/export/memory", async (c) => {
  try {
    const facts = await getAllFacts()
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      facts: facts,
    }
    return c.json(exportData)
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Export session history
app.get("/export/sessions", async (c) => {
  try {
    const sessions = Database.use((db) => db.select().from(SessionTable).all())
    const messages = Database.use((db) => db.select().from(MessageTable).all())

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      sessions,
      messages,
    }
    return c.json(exportData)
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Export all data
app.get("/export/all", async (c) => {
  try {
    const facts = await getAllFacts()
    const sessions = Database.use((db) => db.select().from(SessionTable).all())
    const messages = Database.use((db) => db.select().from(MessageTable).all())

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      facts,
      sessions,
      messages,
      config: {
        env: fs.existsSync(path.join(getConfigDir(), ".env"))
          ? fs.readFileSync(path.join(getConfigDir(), ".env"), "utf-8")
          : null,
        gateclaw: fs.existsSync(path.join(getConfigDir(), "gateclaw.jsonc"))
          ? fs.readFileSync(path.join(getConfigDir(), "gateclaw.jsonc"), "utf-8")
          : null,
      },
    }
    return c.json(exportData)
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== QUICK ACTIONS ==========

// Test voice pipeline
app.post("/voice/test", async (c) => {
  try {
    const ttsUrl = process.env.TTS_API_URL
    if (!ttsUrl) {
      return c.json({ success: false, error: "TTS not configured" })
    }

    // Test TTS with a simple phrase
    const testRes = await fetch(`${ttsUrl}/v1/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: "GateClaw voice test successful.",
        voice: process.env.TTS_DEFAULT_VOICE || "david-attenborough-original",
      }),
      signal: AbortSignal.timeout(10000),
    })

    return c.json({
      success: testRes.ok,
      status: testRes.status,
      message: testRes.ok ? "Voice test successful" : `Voice test failed: ${testRes.status}`,
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ success: false, error })
  }
})

// Clear current session
app.post("/session/clear", async (c) => {
  try {
    // Clear messages for gateclaw session
    await saveMessage("gateclaw", "system", "Session cleared by user")
    return c.json({ success: true })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== MODEL MANAGEMENT ==========

// Get favorite/recent models
app.get("/models/favorites", async (c) => {
  try {
    // This would ideally come from user settings
    // For now, return the configured models
    const configDir = getConfigDir()
    const configPath = path.join(configDir, "gateclaw.jsonc")

    if (!fs.existsSync(configPath)) {
      return c.json({ favorites: [], recent: [] })
    }

    const configContent = fs.readFileSync(configPath, "utf-8")
    const configJson = parseJSONC(configContent)
    const providers = configJson.provider || {}

    const allModels: Array<{ id: string; name: string; provider: string }> = []
    for (const providerId of Object.keys(providers)) {
      const provider = providers[providerId]
      const models = provider?.models || {}
      for (const modelId of Object.keys(models)) {
        allModels.push({
          id: `${providerId}/${modelId}`,
          name: models[modelId]?.name || modelId,
          provider: providerId,
        })
      }
    }

    // Return first 5 as "favorites"
    return c.json({
      favorites: allModels.slice(0, 5),
      recent: allModels.slice(0, 3),
      all: allModels,
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Set current model
app.post("/model/set", async (c) => {
  try {
    const body = await c.req.json()
    const { model, provider } = body

    // This would update the .env or settings
    // For now, just acknowledge
    return c.json({
      success: true,
      model,
      provider,
      message: `Model set to ${provider}/${model}. Restart may be required.`,
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== PROVIDERS LIST ==========

// Get all configured providers
app.get("/providers/list", async (c) => {
  try {
    const configDir = getConfigDir()
    const configPath = path.join(configDir, "gateclaw.jsonc")

    if (!fs.existsSync(configPath)) {
      return c.json({ providers: [{ id: "gateclaw", name: "GateClaw Default" }] })
    }

    const configContent = fs.readFileSync(configPath, "utf-8")
    const configJson = parseJSONC(configContent)
    const providers = configJson.provider || {}

    const providerList = Object.entries(providers).map(([id, config]: [string, any]) => ({
      id,
      name: config.name || id,
      modelCount: Object.keys(config.models || {}).length,
    }))

    return c.json({ providers: providerList })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// ========== CHAT ENDPOINTS (OpenCode SDK) ==========

// Get available agents
app.get("/chat/agents", async (c) => {
  try {
    const { data, error } = await opencodeClient.app.agents()
    if (error) {
      return c.json({ error: formatError(error) }, 500)
    }
    return c.json({ agents: data || [] })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Get available models from OpenCode server (not gateclaw.jsonc)
app.get("/chat/models", async (c) => {
  try {
    // Call OpenCode server directly at port 4100
    const opencodeUrl = process.env.OPENCODE_API_URL || "http://localhost:4100"
    const res = await fetch(`${opencodeUrl}/provider`, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    if (!res.ok) {
      return c.json({ error: `OpenCode error: ${res.status}` }, 500)
    }
    const data = (await res.json()) as { all?: Array<{ id: string; models?: Record<string, { name?: string }> }> }
    // OpenCode returns { all: [...], default: {...}, connected: [...] }
    const models: { id: string; name: string; provider: string }[] = []
    for (const provider of data.all || []) {
      for (const [modelId, modelInfo] of Object.entries(provider.models || {})) {
        models.push({
          id: modelId,
          name: modelInfo?.name || modelId,
          provider: provider.id,
        })
      }
    }
    return c.json({ models })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Get or create session for dashboard chat
app.get("/chat/session", async (c) => {
  try {
    const directory = process.env.GATECLAW_DIRECTORY || process.cwd()

    // Try to get existing session
    const { data: sessions } = await opencodeClient.session.list({ directory })
    if (sessions && sessions.length > 0) {
      return c.json({ session: sessions[0] })
    }

    // Create new session
    const { data: session, error } = await opencodeClient.session.create({ directory })
    if (error) {
      return c.json({ error: formatError(error) }, 500)
    }
    return c.json({ session })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Get all sessions
app.get("/chat/sessions", async (c) => {
  try {
    const directory = process.env.GATECLAW_DIRECTORY || process.cwd()
    const { data, error } = await opencodeClient.session.list({ directory })
    if (error) {
      return c.json({ error: formatError(error) }, 500)
    }
    return c.json({ sessions: data || [] })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Create new session
app.post("/chat/session/create", async (c) => {
  try {
    const directory = process.env.GATECLAW_DIRECTORY || process.cwd()
    const { data, error } = await opencodeClient.session.create({ directory })
    if (error) {
      return c.json({ error: formatError(error) }, 500)
    }
    return c.json({ session: data })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Get session by ID
app.get("/chat/session", async (c) => {
  try {
    const sessionId = c.req.query("sessionId")
    if (!sessionId) {
      return c.json({ error: "sessionId required" }, 400)
    }
    const directory = process.env.GATECLAW_DIRECTORY || process.cwd()
    const { data, error } = await opencodeClient.session.get({ sessionID: sessionId, directory })
    if (error) {
      return c.json({ error: formatError(error) }, 500)
    }
    return c.json({ session: data })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Stop chat generation
app.post("/chat/stop", async (c) => {
  try {
    return c.json({ ok: true })
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500)
  }
})

// Get session messages
app.get("/chat/messages", async (c) => {
  try {
    const sessionId = c.req.query("sessionId")
    const directory = process.env.GATECLAW_DIRECTORY || process.cwd()

    if (!sessionId) {
      return c.json({ error: "sessionId required" }, 400)
    }

    const { data, error } = await opencodeClient.session.messages({
      sessionID: sessionId,
      directory,
    })

    if (error) {
      return c.json({ error: formatError(error) }, 500)
    }
    return c.json({ messages: data || [] })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Send chat message using OpenCode SDK
const chatPromptSchema = z.object({
  sessionId: z.string().min(1),
  text: z.string().min(1),
  agent: z.string().optional().default("default"),
  provider: z.string().optional(),
  model: z.string().optional(),
})

app.post("/chat/send", async (c) => {
  try {
    const body = await c.req.json()
    const parsed = chatPromptSchema.parse(body)
    const directory = process.env.GATECLAW_DIRECTORY || process.cwd()

    // Build prompt options
    const promptOptions: {
      sessionID: string
      directory: string
      parts: Array<{ type: "text"; text: string }>
      agent?: string
      model?: { providerID: string; modelID: string }
    } = {
      sessionID: parsed.sessionId,
      directory,
      parts: [{ type: "text", text: parsed.text }],
    }

    if (parsed.agent && parsed.agent !== "default") {
      promptOptions.agent = parsed.agent
    }

    if (parsed.provider && parsed.model) {
      promptOptions.model = {
        providerID: parsed.provider,
        modelID: parsed.model,
      }
    }

    const { data, error } = await opencodeClient.session.prompt(promptOptions)

    if (error) {
      logger.error("Chat prompt error", { error: formatError(error) })
      return c.json({ error: formatError(error) }, 500)
    }

    return c.json({ ok: true, result: data })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    logger.error("Chat send error", { error })
    return c.json({ error }, 500)
  }
})

// SSE endpoint for chat events (streaming responses)
app.get("/chat/events", async (c) => {
  try {
    const directory = process.env.GATECLAW_DIRECTORY || process.cwd()

    // Set SSE headers
    c.header("Content-Type", "text/event-stream")
    c.header("Cache-Control", "no-cache")
    c.header("Connection", "keep-alive")

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          const result = await opencodeClient.event.subscribe({ directory })

          for await (const event of result.stream) {
            const data = JSON.stringify(event)
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error })}\n\n`))
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return c.json({ error }, 500)
  }
})

// Check OpenCode server status
app.get("/opencode/status", async (c) => {
  try {
    const opencodeUrl = process.env.OPENCODE_API_URL || "http://localhost:4100"
    const res = await fetch(`${opencodeUrl}/global/health`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = (await res.json()) as { version?: string }
      return c.json({ running: true, version: data.version })
    }
    return c.json({ running: false })
  } catch (e) {
    return c.json({ running: false, error: e instanceof Error ? e.message : String(e) })
  }
})

// Start OpenCode server
app.post("/opencode/start", async (c) => {
  try {
    const result = await processManager.start()
    return c.json(result)
  } catch (e) {
    return c.json({ success: false, error: e instanceof Error ? e.message : String(e) })
  }
})

// Serve embedded dashboard HTML
app.get("/dashboard", async (c) => {
  const htmlPath = path.join(import.meta.dir, "dashboard", "dashboard.html")
  const html = fs.readFileSync(htmlPath, "utf-8")
  return c.html(html)
})

// Redirect root to dashboard
app.get("/", async (c) => {
  return c.redirect("/dashboard")
})

export { app }
