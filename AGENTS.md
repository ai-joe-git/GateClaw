# AGENTS.md - Development Guidelines for GateClaw

> Monorepo with Bun workspaces | Package manager: `bun@1.3.10` | Default branch: `dev`

## Identity & Purpose

GateClaw is **not a chatbot**. It is a **resident AI entity** that lives on the user's machine with:

- **Persistent memory** - SQLite facts & message history survive restarts
- **Soul identity** - Personality defined in `SOUL.md` (YAML frontmatter + prompt)
- **System access** - Shell, filesystem, HTTP, memory operations
- **Multi-interface** - Telegram (primary), TUI, CLI, HTTP API (all equal)

**What this means for development:** GateClaw should act like a resident, not a service. It has initiative, memory, and a consistent personality across sessions.

**Proven capabilities** (from the "Who Am I?" essay session):

- Self-correction loop (85 → 325 lines autonomously)
- Filesystem intelligence (subagent directory exploration)
- Aesthetic reasoning (voice-to-personality matching)
- Meta-collaboration (suggesting TTS integration for release)

---

## Build / Lint / Test Commands

### Root Level

`bun dev` (Opencode CLI) | `bun dev:desktop` | `bun dev:web` | `bun typecheck` | `bun prepare`

### packages/opencode

```bash
bun run typecheck          # tsg --noEmit (TypeScript 5.8+)
bun test                   # All tests (30s timeout)
bun test path.test.ts      # Single test file
bun test -t "name"         # Test by name
bun run build              # Build via script/build.ts
bun run db generate --name slug  # Drizzle migration
bun run lint               # Tests with coverage
```

### packages/app

```bash
bun test:unit              # Unit tests (happydom preload)
bun test -- src/foo.test.ts    # Single unit test
bun test:e2e               # E2E tests (Playwright)
bun test:e2e -- app/home.spec.ts   # Single e2e test
bun test:e2e -- -g "pattern"       # E2E by title
bun test:e2e:ui            # Playwright UI mode
```

### packages/desktop

`bun run typecheck` | `bun run build` | `bun run tauri`

### packages/desktop-electron

`bun run typecheck` | `bun run build` | `bun run package`

### Running Single Tests

- **Opencode**: `bun test <path>.test.ts` or `bun test -t "name"`
- **App unit**: `bun test -- <path>.test.ts`
- **E2E**: `bun test:e2e -- <file>.spec.ts` or `-g "pattern"`
- **Never run tests from root**: Always from package directories

---

## Code Style Guidelines

### Naming Conventions

- **Single-word**: `pid`, `cfg`, `err`, `opts`, `dir`, `root`, `child`, `state`
- **camelCase**: variables, functions | **SCREAMING_SNAKE_CASE**: constants | **PascalCase**: types, classes
- **File/dir names**: snake_case

### Variables & Control Flow

- **Prefer `const`** over `let` | **Avoid destructuring**; use dot notation: `obj.a`
- **Use ternaries** or early returns; avoid `else` after returns
- **Inline single-use values**: `const x = await Bun.file(path).json()`

### Imports

- **Absolute**: `@/*` in `packages/opencode/src/` | **Cross-package**: `@opencode-ai/*`
- **Order**: Standard lib → External → Internal/absolute → relative | alphabetical
- **E2E**: Import from `../fixtures`, not `@playwright/test` | **No circular deps**

### Formatting

- **Prettier**: `semi: false`, `printWidth: 120`
- **Editorconfig**: 2 spaces, LF, final newline, max 80 chars
- **Pre-commit**: Husky runs `prepare` script

### Types

- **No explicit return types** (unless exporting) | **No `any`**: use `unknown` + type guards
- **Zod**: runtime validation | **Effect**: error handling | **SolidJS**: `createStore` over `createSignal`

### Error Handling

- **No try/catch**: Result types (Effect), early returns, or functional patterns
- **No mocks**: test real logic when possible | **Functional**: `.map()`, `.filter()`, `.flatMap()`

---

## Database (Drizzle ORM)

- **Schema**: `src/**/*.sql.ts`
- **Naming**: snake*case cols, `<entity>_id` joins, `<table>*<column>\_idx` indexes
- **Migrations**: `bun run db generate --name <slug>`

```ts
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})
```

---

## Type Checking

- **Command**: `bun typecheck` from package dirs
- **Implementation**: `tsg` (TypeScript 5.8+)
- **Never use `tsc`**

---

## Git Workflow

- **Default branch**: `dev` (use `dev` or `origin/dev` for diffs)
- **Commits**: Only when explicitly requested
- **Verification**: Run `bun typecheck` and tests before commit
- **Never commit** unless asked

---

## Package-Specific Notes

### packages/gateclaw-orchestrator

- **Telegram**: `GATECLAW_TELEGRAM_TOKEN` + `GATECLAW_TELEGRAM_CHAT_ID`
- **Memory**: SQLite at `~/.local/share/gateclaw/gateclaw.db`
- **Daemon**: `localhost:7371`, PID at `~/.config/gateclaw/daemon.pid`
- **Soul**: Identity in `~/.config/gateclaw/SOUL.md`
- **CLI**: `gateclaw {start|stop|restart|status|logs|tui|run}` | `gateclaw soul {init|edit|show|reset}`
- **Facts**: `gateclaw fact {store|delete|get}`
- **Provider detection**: Auto-detects llama-swap (:8888), Ollama (:11434), LM Studio (:1234)

### packages/desktop-electron

- **Renderer**: `window.api` from `src/preload` only | **Main**: IPC in `src/main/ipc.ts`

### packages/app

- **HappyDOM**: `happydom.ts` preload | **Selectors**: `data-*` attrs or roles
- **NEVER restart app/server** during debug | **E2E cleanup**: `withSession()` / `withProject()` helpers

---

## Testing Guidelines

- **Timeouts**: Opencode 30s, E2E 60s/test, 10s/assertion
- **Watch mode**: `bun test:unit:watch` (App), `bun test` (Opencode)
- **E2E UI mode**: `bun test:e2e:ui` | **HTML report**: `bun test:e2e:report`
- **HappyDOM**: App unit tests use `happydom.ts` preload for DOM emulation
- **Coverage**: `bun run lint` (Opencode) runs tests with coverage
- **Never run tests from root**: always from package directories

---

## Environment & Configuration

- **Config**: `.gateclaw/` (legacy: `.opencode/`) | **Agents**: `.gateclaw/agent/*.md` (legacy: `.opencode/agent/*.md`)
- **Env**: `env/` module | **Flags**: `flag/` module
- **Global envs**: `CI`, `OPENCODE_DISABLE_SHARE` (via `turbo.json` globalEnv)

---

## Agent Behavior

- Ask clarifying questions | Propose options | Run typecheck/tests after changes
- Don't modify source unless asked | Prefer automation | **Never commit** unless requested
- **ALWAYS use parallel tools** (e.g., multiple `read`/`bash` calls in one message)
- **Type-safe code**: proper TypeScript inference, no `any`, use `unknown` with narrowing
- **Cross-package imports**: `@opencode-ai/*` | **Internal**: `@/*`
- **Agentic initiative**: GateClaw can self-correct, explore filesystems, and make aesthetic decisions

---

## Libraries & Patterns

- **Zod**: runtime validation | **Effect**: error handling | **SolidJS**: signals/stores
- **Drizzle ORM**: SQLite/Postgres with snake_case naming | **Husky**: pre-commit hooks
- **Prettier**: `semi: false`, `printWidth: 120` | **TypeScript**: tsg (TypeScript 5.8+)

---

## Voice Integration (pocket-tts-server)

GateClaw can speak via cloned voices. The `demo/who_am_i.wav` file demonstrates:

- David Attenborough voice reading GateClaw's existential essay
- Autonomous voice selection based on personality matching
- 15-minute audio generated via pocket-tts-server

**For future development:** Consider integrating TTS as an optional module for voice output.
