# GateClaw Codebase Map

## Overview

GateClaw is an AI-powered development tool built as a Bun monorepo. The core logic lives in `packages/opencode/src/`.

---

## 1. Source Directory Structure (`packages/opencode/src/`)

| Directory        | Purpose                                 |
| ---------------- | --------------------------------------- |
| `account/`       | Authentication account management       |
| `acp/`           | Access control protocol                 |
| `agent/`         | AI agent definitions and configurations |
| `auth/`          | Authentication handling                 |
| `bun/`           | Bun-specific utilities                  |
| `bus/`           | Event bus for pub/sub messaging         |
| `cli/`           | Command-line interface                  |
| `command/`       | Command definitions                     |
| `config/`        | Configuration management                |
| `control-plane/` | Workspace management and control        |
| `effect/`        | Effect handling                         |
| `env/`           | Environment variables                   |
| `file/`          | File operations                         |
| `flag/`          | Feature flags                           |
| `format/`        | Code formatting                         |
| `global/`        | Global state management                 |
| `id/`            | Identifier generation                   |
| `ide/`           | IDE integration                         |
| `installation/`  | Installation management                 |
| `lsp/`           | Language Server Protocol                |
| `mcp/`           | Model Context Protocol                  |
| `patch/`         | Patch handling                          |
| `permission/`    | Permission system                       |
| `plugin/`        | Plugin system                           |
| `project/`       | Project management                      |
| `provider/`      | AI model providers                      |
| `pty/`           | Pseudo-terminal handling                |
| `question/`      | Question tool handling                  |
| `scheduler/`     | Task scheduling                         |
| `server/`        | HTTP API server (Hono)                  |
| `session/`       | Session management                      |
| `share/`         | Session sharing                         |
| `shell/`         | Shell integration                       |
| `skill/`         | Skill definitions                       |
| `snapshot/`      | File snapshot/diff system               |
| `storage/`       | Database and file storage               |
| `tool/`          | Tool definitions and execution          |
| `util/`          | Utility functions                       |
| `worktree/`      | Git worktree management                 |

---

## 2. Session Creation and Storage

### Database Schema (Drizzle ORM)

**Primary File:** [`src/session/session.sql.ts`](packages/opencode/src/session/session.sql.ts)

```typescript
// Main tables defined:
;-SessionTable - // line 6   - session metadata (id, project_id, slug, title, timestamps)
  MessageTable - // line 33  - message metadata stored as JSON
  PartTable - // line 49  - message parts (text, tool calls, files)
  TodoTable - // line 65  - session todos
  PermissionTable // line 78 - project-level permissions
```

All tables use SQLite with foreign key constraints and cascading deletes.

### Session Creation

**Primary File:** [`src/session/index.ts`](packages/opencode/src/session/index.ts):279-335

```typescript
export async function createNext(input: {
  id?: string
  title?: string
  parentID?: string
  workspaceID?: string
  directory: string
  permission?: PermissionNext.Ruleset
}) {
  // Creates session info object
  // Inserts into SessionTable
  // Publishes Bus.Event.Created
  // Auto-shares if OPENCODE_AUTO_SHARE flag set
  // Returns Info object
}
```

### Storage Layer (Disk Writes)

**Primary File:** [`src/storage/storage.ts`](packages/opencode/src/storage/storage.ts)

| Function                       | Description                      |
| ------------------------------ | -------------------------------- |
| `read<T>(key: string[])`       | Reads JSON file with read lock   |
| `write<T>(key: string[])`      | Writes JSON file with write lock |
| `update<T>(key: string[], fn)` | Updates JSON file with callback  |

**Disk Location:** `Global.Path.data/storage/`

**Locking:** Uses `src/storage/lock.ts` for file-level read/write locks to prevent race conditions.

### Database Connection

**Primary File:** [`src/storage/db.ts`](packages/opencode/src/storage/db.ts):30-115

```typescript
export const Client = lazy(() => {
  const sqlite = new BunDatabase(Path, { create: true })
  sqlite.run("PRAGMA journal_mode = WAL")
  sqlite.run("PRAGMA synchronous = NORMAL")
  sqlite.run("PRAGMA busy_timeout = 5000")
  sqlite.run("PRAGMA foreign_keys = ON")

  const db = drizzle({ client: sqlite })
  migrate(db, entries) // applies migrations from migration/ dir
  return db
})
```

---

## 3. HTTP Server

### Server Setup

**Primary File:** [`src/server/server.ts`](packages/opencode/src/server/server.ts):50-632

```typescript
export const createApp = (opts: { cors?: string[] }): Hono => {
  const app = new Hono()
    .onError((err, c) => { ... })
    .use(basicAuth if password set)
    .use(request logging)
    .use(cors)
    .route("/global", GlobalRoutes())
    .route("/project", ProjectRoutes())
    .route("/pty", PtyRoutes())
    .route("/config", ConfigRoutes())
    .route("/session", SessionRoutes())
    .route("/permission", PermissionRoutes())
    .route("/question", QuestionRoutes())
    .route("/provider", ProviderRoutes())
    .route("/mcp", McpRoutes())
    .route("/tui", TuiRoutes())
  return app
}
```

### Server Start

[`src/server/server.ts`](packages/opencode/src/server/server.ts):484-516

```typescript
export function listen(opts: { port: number; hostname: string; mdns?: boolean }) {
  const app = createApp(opts)
  const server = Bun.serve({
    hostname: opts.hostname,
    idleTimeout: 0,
    fetch: app.fetch,
    websocket: websocket,
    port: opts.port === 0 ? 4096 : opts.port,
  })
  if (opts.mdns) MDNS.publish(server.port!, opts.mdnsDomain)
  return server
}
```

### Routes Exposed

**Session Routes** [`src/server/routes/session.ts`](packages/opencode/src/server/routes/session.ts):22-972

| Method | Path                                          | Description                      |
| ------ | --------------------------------------------- | -------------------------------- |
| GET    | `/`                                           | List sessions                    |
| GET    | `/:sessionID`                                 | Get session by ID                |
| GET    | `/:sessionID/children`                        | Get child sessions               |
| GET    | `/:sessionID/todo`                            | Get session todos                |
| POST   | `/`                                           | Create session                   |
| DELETE | `/:sessionID`                                 | Delete session                   |
| PATCH  | `/:sessionID`                                 | Update session (title, archived) |
| POST   | `/:sessionID/init`                            | Initialize session               |
| POST   | `/:sessionID/fork`                            | Fork session                     |
| POST   | `/:sessionID/abort`                           | Abort session                    |
| POST   | `/:sessionID/share`                           | Share session                    |
| DELETE | `/:sessionID/share`                           | Unshare session                  |
| GET    | `/:sessionID/diff`                            | Get message diff                 |
| POST   | `/:sessionID/summarize`                       | Summarize session                |
| GET    | `/:sessionID/message`                         | Get messages                     |
| GET    | `/:sessionID/message/:messageID`              | Get specific message             |
| DELETE | `/:sessionID/message/:messageID`              | Delete message                   |
| DELETE | `/:sessionID/message/:messageID/part/:partID` | Delete part                      |
| PATCH  | `/:sessionID/message/:messageID/part/:partID` | Update part                      |
| POST   | `/:sessionID/message`                         | Send message (streaming SSE)     |
| POST   | `/:sessionID/prompt_async`                    | Send async message               |
| POST   | `/:sessionID/command`                         | Send command                     |
| POST   | `/:sessionID/shell`                           | Run shell command                |
| POST   | `/:sessionID/revert`                          | Revert message                   |
| POST   | `/:sessionID/unrevert`                        | Restore reverted messages        |
| POST   | `/:sessionID/permissions/:permissionID`       | Permission response              |

**Event Streaming** [`src/server/server.ts`](packages/opencode/src/server/server.ts):498-560

| Method | Path     | Description                                     |
| ------ | -------- | ----------------------------------------------- |
| GET    | `/event` | Server-sent events stream for real-time updates |

The SSE endpoint:

- Sends initial `server.connected` event
- Broadcasts all bus events via `Bus.subscribeAll`
- Sends heartbeat every 10 seconds
- Closes on `InstanceDisposed` event or client disconnect

---

## 4. Event Bus

### Implementation

**Primary File:** [`src/bus/index.ts`](packages/opencode/src/bus/index.ts):1-105

```typescript
const state = Instance.state(() => ({
  subscriptions: new Map<any, Subscription[]>(),
}))

export async function publish(def, properties) {
  const payload = { type: def.type, properties }
  const pending = []
  for (const key of [def.type, "*"]) {
    const match = state().subscriptions.get(key)
    for (const sub of match ?? []) pending.push(sub(payload))
  }
  GlobalBus.emit("event", { directory: Instance.directory, payload })
  return Promise.all(pending)
}

export function subscribe(def, callback) {
  return raw(def.type, callback)
}

export function subscribeAll(callback) {
  return raw("*", callback)
}
```

### Global Broadcast

**File:** [`src/bus/global.ts`](packages/opencode/src/bus/global.ts)

`GlobalBus.emit()` broadcasts events to all connected SSE clients through `/event` endpoint.

### Event Definitions

**File:** [`src/bus/bus-event.ts`](packages/opencode/src/bus/bus-event.ts):1-43

```typescript
export function define(type, properties) {
  const result = { type, properties }
  registry.set(type, result)
  return result
}
```

### Session Events Example

[`src/session/index.ts`](packages/opencode/src/session/index.ts):181-216

```typescript
export const Event = {
  Created: BusEvent.define("session.created", z.object({ info: Info })),
  Updated: BusEvent.define("session.updated", z.object({ info: Info })),
  Deleted: BusEvent.define("session.deleted", z.object({ info: Info })),
  Diff: BusEvent.define("session.diff", z.object({ sessionID, diff })),
  Error: BusEvent.define("session.error", z.object({ sessionID, error })),
}
```

---

## 5. Tool Registration and Execution

### Tool Registry

**Primary File:** [`src/tool/registry.ts`](packages/opencode/src/tool/registry.ts):1-173

```typescript
export const state = Instance.state(async () => {
  const custom = [] as Tool.Info[]

  // Load custom tools from config directories
  const matches = await Config.directories().then((dirs) =>
    dirs.flatMap((dir) => Glob.scanSync("{tool,tools}/*.{js,ts}", { cwd: dir, absolute: true })),
  )
  for (const match of matches) {
    const namespace = path.basename(match, path.extname(match))
    const mod = await import(pathToFileURL(match).href)
    for (const [id, def] of Object.entries(mod)) {
      custom.push(fromPlugin(id === "default" ? namespace : `${namespace}_${id}`, def))
    }
  }

  // Load plugin tools
  const plugins = await Plugin.list()
  for (const plugin of plugins) {
    for (const [id, def] of Object.entries(plugin.tool ?? {})) {
      custom.push(fromPlugin(id, def))
    }
  }

  return { custom }
})
```

### Built-in Tools

[`src/tool/registry.ts`](packages/opencode/src/tool/registry.ts):47-68

```typescript
async function all(): Promise<Tool.Info[]> {
  return [
    InvalidTool,
    ...(question ? [QuestionTool] : []),
    BashTool,
    ReadTool,
    GlobTool,
    GrepTool,
    EditTool,
    WriteTool,
    TaskTool,
    WebFetchTool,
    TodoWriteTool,
    WebSearchTool,
    CodeSearchTool,
    SkillTool,
    ApplyPatchTool,
    ...(Flag.OPENCODE_EXPERIMENTAL_LSP_TOOL ? [LspTool] : []),
    ...(config.experimental?.batch_tool === true ? [BatchTool] : []),
    ...(Flag.OPENCODE_EXPERIMENTAL_PLAN_MODE ? [PlanExitTool] : []),
    ...custom, // user-defined and plugin tools
  ]
}
```

### Tool Interface

**File:** [`src/tool/tool.ts`](packages/opencode/src/tool/tool.ts):1-89

```typescript
export interface Info<Parameters extends z.ZodType> {
  id: string
  init: (ctx?: InitContext) => Promise<{
    description: string
    parameters: Parameters
    execute(
      args: z.infer<Parameters>,
      ctx: Context,
    ): Promise<{
      title: string
      metadata: Metadata
      output: string
      attachments?: Omit<MessageV2.FilePart, "id" | "sessionID" | "messageID">[]
    }>
    formatValidationError?(error: z.ZodError): string
  }>
}
```

### Tool Resolution for AI SDK

**File:** [`src/session/prompt.ts`](packages/opencode/src/session/prompt.ts):729-830

```typescript
export async function resolveTools(input: {
  agent: Agent.Info
  model: Provider.Model
  session: Session.Info
  processor: SessionProcessor.Info
  bypassAgentCheck: boolean
  messages: MessageV2.WithParts[]
}) {
  const tools: Record<string, AITool> = {}

  const context = (args, options): Tool.Context => ({
    sessionID: input.session.id,
    abort: options.abortSignal!,
    messageID: input.processor.message.id,
    callID: options.toolCallId,
    agent: input.agent.name,
    messages: input.messages,
    metadata: async (val) => { ... },
    async ask(req) {
      await PermissionNext.ask({ ...req, sessionID: input.session.id })
    },
  })

  for (const item of await ToolRegistry.tools(..., input.agent)) {
    tools[item.id] = tool({
      id: item.id as any,
      description: item.description,
      inputSchema: jsonSchema(schema as any),
      async execute(args, options) {
        const ctx = context(args, options)
        await Plugin.trigger("tool.execute.before", { tool: item.id, ... }, { args })
        const result = await item.execute(args, ctx)
        await Plugin.trigger("tool.execute.after", { tool: item.id, ... }, result)
        return output
      },
    })
  }

  // Also register MCP tools
  for (const [key, item] of Object.entries(await MCP.tools())) { ... }

  return tools
}
```

---

## 6. System Prompt Construction

### Provider-Specific Prompts

**Primary File:** [`src/session/system.ts`](packages/opencode/src/session/system.ts):1-54

```typescript
export function provider(model: Provider.Model) {
  if (model.api.id.includes("gpt-5")) return [PROMPT_CODEX]
  if (model.api.id.includes("gpt-") || model.api.id.includes("o1") || model.api.id.includes("o3")) return [PROMPT_BEAST]
  if (model.api.id.includes("gemini-")) return [PROMPT_GEMINI]
  if (model.api.id.includes("claude")) return [PROMPT_ANTHROPIC]
  if (model.api.id.toLowerCase().includes("trinity")) return [PROMPT_TRINITY]
  return [PROMPT_ANTHROPIC_WITHOUT_TODO]
}
```

### Environment Context

[`src/session/system.ts`](packages/opencode/src/session/system.ts):24-38

```typescript
export async function environment(model: Provider.Model) {
  const project = Instance.project
  return [
    [
      `You are powered by the model named ${model.api.id}. The exact model ID is ${model.providerID}/${model.api.id}`,
      `Here is some useful information about the environment you are running in:`,
      `<env>`,
      `  Working directory: ${Instance.directory}`,
      `  Is directory a git repo: ${project.vcs === "git" ? "yes" : "no"}`,
      `  Platform: ${process.platform}`,
      `  Today's date: ${new Date().toDateString()}`,
      `</env>`,
      `<directories>`,
      `  ${project.vcs === "git" && false ? await Ripgrep.tree({ cwd: Instance.directory, limit: 50 }) : ""}`,
      `</directories>`,
    ].join("\n"),
  ]
}
```

### Prompt Template Files

| File                                        | Purpose                              |
| ------------------------------------------- | ------------------------------------ |
| `src/session/prompt/codex_header.txt`       | Default instructions                 |
| `src/session/prompt/anthropic.txt`          | Anthropic models                     |
| `src/session/prompt/anthropic-20250930.txt` | New Anthropic format                 |
| `src/session/prompt/beast.txt`              | GPT/o1/o3 models                     |
| `src/session/prompt/gemini.txt`             | Gemini models                        |
| `src/session/prompt/trinity.txt`            | Trinity models                       |
| `src/session/prompt/qwen.txt`               | Qwen models (Anthropic without TODO) |

### System Prompt Assembly

**File:** [`src/session/prompt.ts`](packages/opencode/src/session/prompt.ts):650-660

```typescript
// Build system prompt
const system = [...(await SystemPrompt.environment(model)), ...(await InstructionPrompt.system())]
const format = lastUser.format ?? { type: "text" }
if (format.type === "json_schema") {
  system.push(STRUCTURED_OUTPUT_SYSTEM_PROMPT)
}
```

---

## Key File Reference

| Component           | Primary File(s)                | Key Lines |
| ------------------- | ------------------------------ | --------- |
| Database Schema     | `src/session/session.sql.ts`   | 1-93      |
| Session Creation    | `src/session/index.ts`         | 279-335   |
| Storage Layer       | `src/storage/storage.ts`       | 1-217     |
| Database Connection | `src/storage/db.ts`            | 30-115    |
| HTTP Server         | `src/server/server.ts`         | 50-632    |
| Session Routes      | `src/server/routes/session.ts` | 22-972    |
| Event Bus           | `src/bus/index.ts`             | 1-105     |
| Event Definitions   | `src/bus/bus-event.ts`         | 1-43      |
| Tool Registry       | `src/tool/registry.ts`         | 1-173     |
| Tool Definition     | `src/tool/tool.ts`             | 1-89      |
| Tool Resolution     | `src/session/prompt.ts`        | 729-830   |
| System Prompt       | `src/session/system.ts`        | 1-54      |
| Agent Definitions   | `src/agent/agent.ts`           | 1-339     |

---

## Architecture Summary

- **Sessions**: Created in-memory, persisted to SQLite via Drizzle ORM, auto-shared if configured
- **Storage**: SQLite database + JSON file storage with read/write locks in `Global.Path.data/storage/`
- **HTTP**: Hono-based server with comprehensive REST + SSE routes
- **Events**: Pub/sub bus with global broadcast to SSE clients
- **Tools**: Built-in + custom (user config dir) + plugin tools, resolved for AI SDK
- **Prompts**: Provider-specific templates + environment context injection

---

## GateClaw-Relevant Existing Modules

### Skill System (`packages/opencode/src/skill/`)

**Files:** `skill.ts`, `discovery.ts`, `index.ts`

**Purpose:** Discovers, loads, and caches skill definitions from multiple sources.

**Key Features:**

- **Skill Definition:** Markdown files (`SKILL.md`) with frontmatter (`name`, `description`) + content body
- **Multi-source Loading:**
  - `.opencode/skill/` directories (config directories)
  - External directories: `.claude/skills/`, `.agents/skills/` (project + global)
  - Config-defined paths (`config.skills.paths`)
  - Remote URLs (`config.skills.urls`) via `Discovery.pull()`
- **Caching:** Remote skills cached in `Global.Path.cache/skills/`
- **Instance State:** Skills stored per-project instance via `state()`
- **Exports:** `get(name)`, `all()`, `dirs()` for skill access
- **Discovery:** Fetches `index.json` from remote URLs, downloads skill files to cache

**Data Shape:**

```typescript
type Info = {
  name: string
  description: string
  location: string // file path
  content: string // markdown body
}
```

---

### Scheduler (`packages/opencode/src/scheduler/`)

**File:** `index.ts`

**Purpose:** Manages recurring tasks with automatic interval execution.

**Key Features:**

- **Task Registration:** `register(task)` with id, interval (ms), run function, scope
- **Scopes:** `"instance"` (per-project) or `"global"` (shared across all instances)
- **Automatic Execution:** Runs task immediately on register, then at specified intervals
- **Resource Cleanup:** Clears timers on instance disposal
- **Error Handling:** Catches and logs execution errors without crashing
- **Non-blocking:** Timers use `unref()` to not block process exit

**Task Shape:**

```typescript
type Task = {
  id: string
  interval: number
  run: () => Promise<void>
  scope?: "instance" | "global"
}
```

---

### Database Layer (`packages/opencode/src/storage/db.ts`)

**File:** `db.ts`

**Purpose:** SQLite database connection management with Drizzle ORM and migrations.

**Key Features:**

- **Lazy Initialization:** Database opened on first `Client()` call
- **Bun SQLite:** Native `bun:sqlite` driver
- **Wishlist:**
  - PRAGMA optimizations (WAL mode, synchronous=NORMAL, busy_timeout=5000, cache_size=-64000)
  - Foreign keys enabled
- **Path Resolution:** Uses channel-specific DB names (e.g., `opencode-beta.db`)
- **Migration System:** Auto-applies migrations from `migration/` directory or bundled
- **Context Pattern:** Transaction context via `use()` / `provide()` for nested transactions
- **Effects Queue:** Post-commit callbacks via `effect()`
- **Transaction Support:** `transaction()` wraps callbacks with SQLite transactions
- **Manual Close:** `close()` for cleanup

**Exports:**

- `Client()` — lazy database client
- `use()` — access current transaction context
- `transaction()` — run callback within transaction
- `effect()` — queue post-commit callback
- `close()` — close database connection

---

### Session Database Schema (`packages/opencode/src/session/session.sql.ts`)

**File:** `session.sql.ts`

**Purpose:** Drizzle ORM schema definitions for session-related tables.

**Tables:**

**1. `SessionTable`** (line 11-40)

- Core session metadata
- Fields: `id`, `project_id` (FK), `workspace_id`, `parent_id`, `slug`, `directory`, `title`, `version`, `share_url`, `summary_*`, `diffs`, `revert`, `permission`, timestamps, `time_compacting`, `time_archived`
- Indexes: `session_project_idx`, `session_workspace_idx`, `session_parent_idx`

**2. `MessageTable`** (line 42-51)

- Message metadata (parent info without parts)
- Fields: `id`, `session_id` (FK cascade), timestamps, `data` (JSON: `InfoData`)
- Index: `message_session_idx`

**3. `PartTable`** (line 55-67)

- Message parts (text, tool calls, files, etc.)
- Fields: `id`, `message_id` (FK cascade), `session_id`, timestamps, `data` (JSON: `PartData`)
- Indexes: `part_message_idx`, `part_session_idx`

**4. `TodoTable`** (line 69-84)

- Session-level todos
- Fields: `session_id` (FK cascade), `content`, `status`, `priority`, `position`, timestamps
- Composite PK: `(session_id, position)`
- Index: `todo_session_idx`

**5. `PermissionTable`** (line 87-93)

- Project-level permission rulesets
- Fields: `project_id` (PK, FK cascade), timestamps, `data` (JSON: `PermissionNext.Ruleset`)

**Naming Convention:** All tables/columns use snake_case, foreign keys use `<entity>_id` pattern.

---

## Specific Architecture Q&A

### 1. Exact Disk Path Where Session Data is Stored

**Configuration:** [`src/global/index.ts`](packages/opencode/src/global/index.ts):9-26

```typescript
const data = path.join(xdgData!, app) // Base data directory
export namespace Global {
  export const Path = {
    get home() {
      return process.env.OPENCODE_TEST_HOME || os.homedir()
    },
    data, // e.g., ~/.local/share/opencode on Linux
    bin: path.join(data, "bin"),
    log: path.join(data, "log"),
    cache: path.join(xdgCache!, app),
    config: path.join(xdgConfig!, app),
    state: path.join(xdgState!, app),
  }
}
```

**SQLite Database:** [`src/storage/db.ts`](packages/opencode/src/storage/db.ts):30-38

```typescript
export const Path = iife(() => {
  const channel = Installation.CHANNEL
  if (["latest", "beta"].includes(channel) || Flag.OPENCODE_DISABLE_CHANNEL_DB)
    return path.join(Global.Path.data, "opencode.db")
  const safe = channel.replace(/[^a-zA-Z0-9._-]/g, "-")
  return path.join(Global.Path.data, `opencode-${safe}.db`)
})
```

**Exact Paths:**

| Data Type     | Path                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| SQLite DB     | `path.join(Global.Path.data, "opencode.db")` or `opencode-{channel}.db` |
| JSON Storage  | `path.join(Global.Path.data, "storage")`                                |
| Session Plans | `path.join(Global.Path.data, "plans")`                                  |
| MCP Auth      | `path.join(Global.Path.data, "mcp-auth.json")`                          |
| Snapshot      | `path.join(Global.Path.data, "snapshot", project.id)`                   |

**Windows Example:** `C:\Users\{user}\AppData\Local\opencode\`

---

### 2. How the Event Bus Pushes Events to Connected HTTP Clients

**Flow:**

1. **GlobalBus EventEmitter** [`src/bus/global.ts`](packages/opencode/src/bus/global.ts):1-10

   ```typescript
   export const GlobalBus = new EventEmitter<{
     event: [{ directory?: string; payload: any }]
   }>()
   ```

2. **Bus.publish() emits to GlobalBus** [`src/bus/index.ts`](packages/opencode/src/bus/index.ts):59-62

   ```typescript
   export async function publish(def, properties) {
     const payload = { type: def.type, properties }
     // notify local subscribers...
     GlobalBus.emit("event", {
       directory: Instance.directory,
       payload,
     })
     return Promise.all(pending)
   }
   ```

3. **SSE endpoint `/event` subscribes** [`src/server/routes/global.ts`](packages/opencode/src/server/routes/global.ts):80-102

   ```typescript
   async function handler(event: any) {
     await stream.writeSSE({ data: JSON.stringify(event) })
   }
   GlobalBus.on("event", handler)

   stream.onAbort(() => {
     clearInterval(heartbeat)
     GlobalBus.off("event", handler) // cleanup
     resolve()
   })
   ```

**Connection Chain:**

```
Internal Code → Bus.publish() → GlobalBus.emit("event") → SSE handler → stream.writeSSE() → HTTP Client
```

---

### 3. Custom Agents via `.opencode/agent/*.md`

**Parsing:** [`src/config/config.ts`](packages/opencode/src/config/config.ts):399-436

```typescript
async function loadAgent(dir: string) {
  for (const item of await Glob.scan("{agent,agents}/**/*.md", { cwd: dir, absolute: true })) {
    const md = await ConfigMarkdown.parse(item)
    const file = rel(item, ["/.opencode/agent/", "/.opencode/agents/", "/agent/", "/agents/"])
    const agentName = trim(file) // filename without .md

    const config = {
      name: agentName,
      ...md.data, // Frontmatter fields
      prompt: md.content.trim(), // Markdown body
    }
    const parsed = Agent.safeParse(config)
    if (parsed.success) result[config.name] = parsed.data
  }
  return result
}
```

**Supported Frontmatter Fields** [`src/config/config.ts`](packages/opencode/src/config/config.ts):689-778

| Field         | Type                           | Description                                           |
| ------------- | ------------------------------ | ----------------------------------------------------- |
| `model`       | `string`                       | Model ID (e.g., `anthropic/claude-sonnet-4-20250514`) |
| `variant`     | `string`                       | Default model variant                                 |
| `temperature` | `number`                       | Temperature setting                                   |
| `top_p`       | `number`                       | Top-p sampling                                        |
| `description` | `string`                       | Description of when to use the agent                  |
| `mode`        | `"subagent"\|"primary"\|"all"` | Agent mode                                            |
| `hidden`      | `boolean`                      | Hide from autocomplete (only for subagents)           |
| `color`       | `string`                       | Hex color (#FF5733) or theme color name               |
| `steps`       | `number`                       | Maximum agentic iterations                            |
| `options`     | `Record<string, any>`          | Additional options                                    |
| `permission`  | `Permission`                   | Permission rules                                      |
| `disable`     | `boolean`                      | Disable this agent                                    |

**Example `.opencode/agent/code-review.md`:**

```markdown
---
model: anthropic/claude-sonnet-4-20250514
temperature: 0.7
description: Specialized agent for code review
mode: subagent
color: primary
---

Your custom system prompt here...
```

---

### 4. `packages/sdk/` Usage and Client Consumption

**Location:** `packages/sdk/js/` - JavaScript/TypeScript SDK

**Package:** `@opencode-ai/sdk`

**Exports** [`packages/sdk/js/package.json`](packages/sdk/js/package.json):11-19

```json
"exports": {
  ".": "./src/index.ts",
  "./client": "./src/client.ts",
  "./server": "./src/server.ts",
  "./v2": "./src/v2/index.ts",
  "./v2/client": "./src/v2/client.ts"
}
```

**Usage Patterns:**

1. **Client-only:**

   ```typescript
   import { createOpencodeClient } from "@opencode-ai/sdk"

   const client = createOpencodeClient({
     baseUrl: "http://localhost:8080",
     directory: "/path/to/project",
   })

   await client.global.health()
   await client.session.list()
   ```

2. **Server + Client (local):**

   ```typescript
   import { createOpencode } from "@opencode-ai/sdk"

   const { client, server } = await createOpencode({
     directory: "/path/to/project",
   })
   // server starts HTTP server, client connects to it
   ```

3. **Generated API clients** in [`packages/sdk/js/src/gen/`](packages/sdk/js/src/gen/)
   - `client.gen.ts` - REST client for all API endpoints
   - `types.gen.ts` - TypeScript types from OpenAPI spec
   - `sdk.gen.ts` - High-level SDK wrapper

**Consumption:** The SDK is consumed as an **npm package** (`@opencode-ai/sdk`) that wraps the HTTP API with typed TypeScript clients.

---

### 5. Exact Shape of Message Object in Session Store

**Definition:** [`src/session/message-v2.ts`](packages/opencode/src/session/message-v2.ts):350-483

**Base + User Message:**

```typescript
const Base = z.object({
  id: z.string(),
  sessionID: z.string(),
})

export const User = Base.extend({
  role: z.literal("user"),
  time: z.object({ created: z.number() }),
  format: Format.optional(), // OutputFormat (text or json_schema)
  summary: z
    .object({
      title: z.string().optional(),
      body: z.string().optional(),
      diffs: Snapshot.FileDiff.array(),
    })
    .optional(),
  agent: z.string(),
  model: z.object({ providerID: z.string(), modelID: z.string() }),
  system: z.string().optional(),
  tools: z.record(z.string(), z.boolean()).optional(),
  variant: z.string().optional(),
})
```

**Assistant Message:**

```typescript
export const Assistant = Base.extend({
  role: z.literal("assistant"),
  time: z.object({ created: z.number(), completed: z.number().optional() }),
  error: z
    .discriminatedUnion("name", [
      /* error types */
    ])
    .optional(),
  parentID: z.string(),
  modelID: z.string(),
  providerID: z.string(),
  mode: z.string(), // @deprecated
  agent: z.string(),
  path: z.object({ cwd: z.string(), root: z.string() }),
  summary: z.boolean().optional(),
  cost: z.number(),
  tokens: z.object({
    total: z.number().optional(),
    input: z.number(),
    output: z.number(),
    reasoning: z.number(),
    cache: z.object({ read: z.number(), write: z.number() }),
  }),
  structured: z.any().optional(),
  variant: z.string().optional(),
  finish: z.string().optional(),
})

export const Info = z.discriminatedUnion("role", [User, Assistant])
```

**Message Parts** [`src/session/message-v2.ts`](packages/opencode/src/session/message-v2.ts):80-392

`Part` is a discriminated union with types:

- `text` - TextPart
- `subtask` - SubtaskPart
- `reasoning` - ReasoningPart
- `file` - FilePart
- `tool` - ToolPart
- `step-start` - StepStartPart
- `step-finish` - StepFinishPart
- `snapshot` - SnapshotPart
- `patch` - PatchPart
- `agent` - AgentPart
- `retry` - RetryPart
- `compaction` - CompactionPart

**WithParts Shape:**

```typescript
export const WithParts = z.object({
  info: Info,
  parts: z.array(Part),
})
```

**Database Storage:** [`src/session/session.sql.ts`](packages/opencode/src/session/session.sql.ts)

- `MessageTable.data` - JSON stored `InfoData` (without `id`, `sessionID`)
- `PartTable.data` - JSON stored `PartData` (without `id`, `sessionID`, `messageID`)

---

## Extension Points

### 1. Skill Module (`packages/opencode/src/skill/`)

**Public API:**

- `Skill.Info` - Zod schema: `{ name: string, description: string, location: string, content: string }`
- `Skill.get(name: string)` - Async function to retrieve single skill by name
- `Skill.all()` - Async function to retrieve all skills as array
- `Skill.dirs()` - Async function to retrieve all skill directory paths
- `Skill.InvalidError` - Error type for invalid skill parsing
- `Skill.NameMismatchError` - Error type for filename/name mismatch

**Extension Points:**
To add new skills without modifying source:

1. Drop `SKILL.md` files in any of these directories:
   - `.opencode/skill/` or `.opencode/skills/` (config directories)
   - `.claude/skills/` (project-level or global in `$HOME`)
   - `.agents/skills/` (project-level or global in `$HOME`)
   - Custom paths via `config.skills.paths` array
   - Remote URLs via `config.skills.urls` array (auto-downloaded to cache)

2. Skills are auto-loaded on instance init via `Glob.scan()`
3. Remote skills cached in `Global.Path.cache/skills/`

**Skill Definition Format:**
Markdown file with YAML frontmatter:

```markdown
---
name: skill-identifier
description: Human-readable description
---

Markdown content body (instructions, guidelines, etc.)
```

**Location:** `skill.ts:17-189`, `discovery.ts:7-98`

---

### 2. Scheduler Module (`packages/opencode/src/scheduler/`)

**Public API:**

- `Scheduler.register(task: Task)` - Register a recurring task
- `Scheduler.Task` type - Task definition interface

**Extension Points:**
To add scheduled tasks without modifying source:

1. Call `Scheduler.register()` from plugin code or config initialization
2. Tasks can be scoped to `"instance"` (per-project) or `"global"` (shared)
3. Tasks execute immediately on register, then at specified intervals
4. Timers auto-cleared on instance disposal

**Task Definition Format:**

```typescript
type Task = {
  id: string // Unique identifier
  interval: number // Milliseconds between executions
  run: () => Promise<void> // Async function to execute
  scope?: "instance" | "global" // Optional scope (defaults to "instance")
}
```

**Features:**

- Non-blocking timers (`unref()`)
- Error handling (caught + logged, doesn't crash)
- Auto-cleanup on instance dispose
- Duplicate prevention for global scope

**Location:** `scheduler/index.ts:4-61`

---

### 3. Agent Module (`packages/opencode/src/agent/`)

**Public API:**

- `Agent.Info` - Zod schema with fields:
  - `name: string` (required)
  - `description?: string`
  - `mode: "subagent" | "primary" | "all"`
  - `native?: boolean`
  - `hidden?: boolean`
  - `temperature?: number`
  - `topP?: number`
  - `color?: string`
  - `permission: PermissionNext.Ruleset`
  - `model?: { modelID: string, providerID: string }`
  - `variant?: string`
  - `prompt?: string`
  - `options: Record<string, any>`
  - `steps?: number`
- `Agent.get(agent: string)` - Async function to retrieve single agent
- `Agent.list()` - Async function to retrieve all agents (sorted)
- `Agent.defaultAgent()` - Async function to get default agent name
- `Agent.generate(input)` - AI-powered agent generation

**Extension Points:**
To add custom agents without modifying source:

1. **Markdown files**: Drop `.md` files in `.opencode/agent/` or `.opencode/agents/` directories
2. **Config**: Add `agent` section in `.opencode/config` frontmatter
3. **Runtime**: Modify config object passed to Agent state

**Agent Definition Format (Markdown):**

```markdown
---
model: anthropic/claude-sonnet-4-20250514
variant: optional-variant
temperature: 0.7
top_p: 0.9
description: When to use this agent
mode: subagent # or "primary" or "all"
hidden: false # only for subagents
color: primary # hex (#FF5733) or theme name
steps: 10 # max iterations
options:
  custom_option: value
permission:
  read:
    "*.env": ask
  edit:
    "*": allow
disable: false
---

Your custom system prompt here...
```

**Agent Definition Format (Config):**

```yaml
agent:
  custom-agent:
    model: anthropic/claude-sonnet-4-20250514
    temperature: 0.7
    description: Custom agent description
    mode: primary
    permission:
      read:
        "*.env": ask
    options:
      key: value
    prompt: |
      Your custom system prompt...
```

**Built-in Agents:**

- `build` - Default agent, full permissions
- `plan` - Planning mode, denies edits
- `general` - Subagent for complex tasks
- `explore` - Fast codebase exploration (uses `prompt/explore.txt`)
- `compaction` - Hidden, context compaction (uses `prompt/compaction.txt`)
- `title` - Hidden, title generation (uses `prompt/title.txt`)
- `summary` - Hidden, conversation summary (uses `prompt/summary.txt`)

**Prompt Files:**

- `agent/generate.txt` - AI agent generation prompt
- `agent/prompt/explore.txt` - Explore agent system prompt
- `agent/prompt/compaction.txt` - Compaction agent system prompt
- `agent/prompt/summary.txt` - Summary agent system prompt
- `agent/prompt/title.txt` - Title agent system prompt

**Features:**

- Permission merging (defaults → user config → agent-specific)
- Model override via `providerID/modelID` syntax
- Auto-injection of `Truncate.GLOB` permission unless explicitly denied
- Frontmatter parsing via `ConfigMarkdown`
- Duplicate prevention (existing agent names rejected in `generate()`)

**Location:** `agent/agent.ts:23-339`
