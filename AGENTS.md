# AGENTS.md - Development Guidelines for GateClaw

> **Monorepo**: Bun workspaces | **Package manager**: `bun@1.3.10` | **Default branch**: `dev`

## Identity & Purpose

GateClaw is **not a chatbot**. It is a **resident AI entity** that lives on the user's machine with:

- **Persistent memory** - SQLite facts & message history survive restarts
- **Soul identity** - Personality defined in `SOUL.md` (YAML frontmatter + prompt)
- **System access** - Shell, filesystem, HTTP, memory operations
- **Multi-interface** - Telegram (primary), TUI, CLI, HTTP API (all equal)

**Development mindset:** GateClaw acts like a resident, not a service. It has initiative, memory, and consistent personality across sessions.

---

## Build / Lint / Test Commands

### Root Level

```bash
bun dev                # Opencode CLI dev mode
bun dev:desktop        # Desktop app dev
bun dev:web            # Web app dev
bun typecheck          # TypeScript check all packages
bun prepare            # Pre-commit hooks setup
```

### packages/opencode (Core Orchestrator)

```bash
bun run typecheck      # tsg --noEmit (TypeScript 5.8+)
bun test               # All tests (30s timeout)
bun test path.test.ts  # Single test file
bun test -t "name"     # Run test by name pattern
bun run build          # Build via script/build.ts
bun run lint           # Tests with coverage
bun run db generate --name <slug>  # Drizzle migration
```

### packages/app (Web/Desktop UI)

```bash
bun test:unit              # Unit tests (HappyDOM preload)
bun test -- src/foo.test.ts    # Single unit test
bun test:e2e               # E2E tests (Playwright)
bun test:e2e -- app/home.spec.ts   # Single E2E file
bun test:e2e -- -g "pattern"       # E2E by title pattern
bun test:e2e:ui            # Playwright UI mode
bun test:e2e:report        # Generate HTML report
```

### packages/desktop (Tauri App)

```bash
bun run typecheck
bun run build
bun run tauri              # Dev mode
```

### packages/desktop-electron (Electron App)

```bash
bun run typecheck
bun run build
bun run package            # Package for distribution
```

### Running Single Tests - Quick Reference

| Package              | Command                                              |
| -------------------- | ---------------------------------------------------- |
| **Opencode**         | `bun test <file>.test.ts` or `bun test -t "pattern"` |
| **App units**        | `bun test -- <path>.test.ts` (note the `--`)         |
| **E2E**              | `bun test:e2e -- <file>.spec.ts` or `-g "title"`     |
| **Never from root!** | Always `cd` into package directory first             |

---

## Code Style Guidelines

### Naming Conventions

- **Single-word vars**: `pid`, `cfg`, `err`, `opts`, `dir`, `root`, `child`, `state`
- **camelCase**: variables, functions
- **SCREAMING_SNAKE_CASE**: constants
- **PascalCase**: types, classes, interfaces
- **File/dir names**: snake_case (e.g., `gateclaw.sql.ts`, `user_store.ts`)

### Variables & Control Flow

- **Prefer `const`** over `let` (immutability default)
- **Avoid destructuring**; use dot notation: `obj.prop` not `{prop} = obj`
- **Use ternaries** or early returns; avoid `else` after `return`
- **Inline single-use values**: `const x = await Bun.file(path).json()`

### Imports

- **Absolute paths**: `@/*` maps to `packages/opencode/src/`
- **Cross-package**: `@opencode-ai/*` for imports between packages
- **Order**: Std lib → External → Internal absolute → Relative → Alphabetical within groups
- **E2E tests**: Import from `../fixtures`, never from `@playwright/test` directly
- **No circular dependencies**: Structure imports carefully

### Formatting

- **Prettier**: `semi: false`, `printWidth: 120`, single quotes
- **Editorconfig**: 2 spaces, LF line endings, final newline, max 80 chars per line
- **Pre-commit**: Husky runs `bun prepare` script automatically

### Types

- **No explicit return types** on functions (inferred), unless exporting public API
- **No `any` ever**: Use `unknown` + type guards for narrowing
- **Zod**: Runtime validation for external inputs, configs, API responses
- **Effect**: Error handling with Result types instead of exceptions
- **SolidJS**: Use `createStore` over `createSignal` for complex state

### Error Handling

- **No try/catch blocks**: Prefer Result types (Effect), early returns, functional patterns
- **No mocks in tests**: Test real logic when possible
- **Functional patterns**: `.map()`, `.filter()`, `.flatMap()` over imperative loops
- **User-facing errors**: Friendly, actionable messages
- **Dev errors**: Detailed stack traces with context

---

## Database (Drizzle ORM)

- **Schema files**: `src/**/*.sql.ts` (co-locate with code)
- **Column naming**: snake_case (`user_id`, `created_at`)
- **Join columns**: `<entity>_id` pattern (e.g., `project_id`, `session_id`)
- **Index naming**: `<table>_<column>_idx` (e.g., `sessions_user_idx`)
- **Migrations**: `bun run db generate --name <slug>` from package dir
- **Migration tests**: Read per-folder layout from `migration/<timestamp>_<slug>/`

```ts
// Example schema
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

export const session = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})
```

---

## Type Checking

- **Command**: `bun typecheck` from individual package directories
- **Implementation**: `tsg` (TypeScript 5.8+ with get inferred types)
- **Never use `tsc`**: Only `tsg` for type checking
- **CI enforcement**: Type check fails the build

---

## Git Workflow

- **Default branch**: `dev` (not `main`!)
- **Diffs**: Compare against `dev` or `origin/dev`
- **Commits**: Only when explicitly requested by user
- **Verification**: Run `bun typecheck` + relevant tests BEFORE committing
- **Commit messages**: Present tense, concise, explain WHY not what
- **Never commit secrets**: Check `.env`, credentials.json, API keys, etc.

---

## Package-Specific Notes

### packages/gateclaw-orchestrator (Core Daemon)

- **Telegram config**: `GATECLAW_TELEGRAM_TOKEN` + `GATECLAW_TELEGRAM_CHAT_ID`
- **Memory DB**: SQLite at `~/.local/share/gateclaw/gateclaw.db`
- **Daemon**: HTTP API on `localhost:7371`, PID at `~/.config/gateclaw/daemon.pid`
- **Soul**: Identity in `~/.config/gateclaw/SOUL.md`
- **CLI commands**: `gateclaw {start|stop|restart|status|logs|tui|run}`
- **Soul commands**: `gateclaw soul {init|edit|show|reset}`
- **Facts management**: `gateclaw fact {store|delete|get}`
- **Provider detection**: Auto-detects llama-swap (:8888), Ollama (:11434), LM Studio (:1234)

### packages/desktop-electron

- **Renderer process**: Use `window.api` from `src/preload` only (IPC bridge)
- **Main process**: IPC handlers in `src/main/ipc.ts`
- **Security**: Context isolation enabled, no direct Node in renderer

### packages/app (SolidJS Frontend)

- **Test environment**: HappyDOM via `happydom.ts` preload file
- **Selectors**: Use `data-*` attributes or ARIA roles, never fragile CSS selectors
- **State management**: `createStore` for complex state, `createSignal` for primitives
- **NEVER restart app/server** during debugging (breaks test isolation)
- **E2E helpers**: Use `withSession()` / `withProject()` for cleanup between tests

---

## Testing Guidelines

- **Timeouts**: Opencode 30s default, E2E 60s/test, 10s per assertion
- **Watch mode**: `bun test:unit:watch` (App), `bun test` (Opencode supports auto-watch)
- **Coverage**: `bun run lint` runs tests with coverage (Opencode only)
- **HappyDOM**: All App unit tests use HappyDOM preload for DOM emulation
- **Parallel tests**: Bun runs tests in parallel by default (design for isolation)
- **Always from package dirs**: Never run tests from repository root

---

## Environment & Configuration

- **Config directory**: `.gateclaw/` (legacy: `.opencode/`)
- **Agent definitions**: `.gateclaw/agent/*.md` (legacy: `.opencode/agent/*.md`)
- **Env module**: Use `env/` module for environment variable access
- **Flags module**: Feature flags via `flag/` module
- **Global envs**: `CI`, `OPENCODE_DISABLE_SHARE` (via `turbo.json` globalEnv)
- **.env files**: Never commit, always in `.gitignore`

---

## Agent Behavior Expectations

- **Ask clarifying questions**: Don't assume ambiguous requirements
- **Propose multiple options**: When there are trade-offs, present them
- **Run verification**: Always run `bun typecheck` and relevant tests after changes
- **Don't modify source unless asked**: Especially configs, don't touch without permission
- **Prefer automation**: Script repetitive tasks, don't do manual steps
- **Never commit** unless explicitly requested by user
- **ALWAYS use parallel tools**: Batch multiple `read`, `bash`, `grep` calls in single message
- **Type-safe code**: Proper TypeScript inference, no `any`, use `unknown` with narrowing
- **Respect imports**: Cross-package `@opencode-ai/*`, internal `@/*`
- **Agentic initiative**: GateClaw can self-correct, explore filesystems autonomously, make aesthetic decisions

---

## Libraries & Patterns

- **Zod**: Runtime validation for all external inputs
- **Effect-ts**: Error handling with Result/Either types
- **SolidJS**: Signals/stores for reactive UI state
- **Drizzle ORM**: Type-safe SQL with snake_case conventions
- **Husky**: Pre-commit hooks for formatting/linting
- **Prettier**: Code formatting (see config above)
- **TypeScript**: `tsg` for type checking (TypeScript 5.8+)

---

## Voice Integration (pocket-tts-server)

GateClaw can speak via cloned voices from pocket-tts-server companion project.

**Demo assets:**

- `demo/who_am_i.mp4` - Essay narration with static logo (David Attenborough voice)
- Audio generated autonomously based on SOUL.md personality matching

**For TTS features:** Consider integrating as optional module for voice output in daemon.

---

## Critical Reminders (Read Before Every Task)

✅ **ALWAYS run `bun typecheck`** before suggesting any commit

✅ **Tests from package directories ONLY** - never from repo root

✅ **Use parallel tool calls** - batch reads/writes/bash commands together

✅ **Never commit secrets** - verify no .env, credentials, API keys staged

✅ **Commit messages**: Present tense, explain WHY not WHAT, keep concise

✅ **Default branch is `dev`** - not main, not master

---

_Last updated: March 2026 | Version: 0.1.0-beta_
