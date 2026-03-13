# AGENTS.md - Development Guidelines for GateClaw

> **Monorepo**: Bun workspaces | **Package manager**: `bun@1.3.10` | **Default branch**: `dev`

## Identity & Purpose

GateClaw is a **resident AI entity** with persistent memory, soul identity (`SOUL.md`), system access, and multi-interface (Telegram, TUI, CLI, HTTP API).

---

## Build / Lint / Test Commands

### Root Level

```bash
bun dev                # Opencode CLI dev mode
bun dev:desktop        # Desktop app dev
bun dev:web            # Web app dev
bun typecheck          # TypeScript check all packages
bun prepare            # Pre-commit hooks (husky)
```

### Running Single Tests (CRITICAL)

| Package              | Command                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| **Opencode**         | `bun test <file>.test.ts` or `bun test -t "pattern"`                   |
| **App units**        | `cd packages/app && bun test -- src/foo.test.ts`                       |
| **E2E**              | `cd packages/app && bun test:e2e -- app/home.spec.ts` or `-g "title"`  |
| **Desktop**          | `cd packages/desktop && bun run typecheck && bun run build`            |
| **Electron**         | `cd packages/desktop-electron && bun run typecheck && bun run package` |
| **Never from root!** | Always `cd` into package directory first                               |

### Package-Specific Commands

- **Opencode**: `bun run typecheck`, `bun test`, `bun run build`, `bun run lint` (coverage), `bun run db generate --name <slug>`
- **App**: `bun test:unit` (HappyDOM), `bun test:unit:watch`, `bun test:e2e:ui` (Playwright UI mode)
- **Desktop (Tauri)**: `bun run tauri dev`
- **Electron**: `bun run package` (distro), `bun run dev`

---

## Code Style Guidelines

### Naming

- **Variables**: `pid`, `cfg`, `err`, `opts`, `dir`, `root` (single-word abbreviations)
- **camelCase**: variables, functions
- **SCREAMING_SNAKE_CASE**: constants
- **PascalCase**: types, classes, interfaces
- **Files/Dirs**: snake_case (`gateclaw.sql.ts`, `user_store.ts`)

### Imports

- **Absolute**: `@/*` → `packages/opencode/src/`
- **Cross-package**: `@opencode-ai/*`
- **Order**: Std lib → External → Internal → Relative (alphabetical within groups)
- **E2E tests**: Import from `../fixtures`, never `@playwright/test` directly

### Formatting (Prettier + Editorconfig)

- `semi: false`, `printWidth: 120`, single quotes
- 2 spaces, LF line endings, final newline, max 80 chars/line
- Auto-run via Husky on commit (`bun prepare`)

### Types & Error Handling

- **No explicit return types** (inferred), unless public API
- **No `any`**: Use `unknown` + type guards
- **Zod**: Runtime validation for external inputs
- **Effect**: Result types over try/catch
- **SolidJS**: `createStore` over `createSignal` for complex state
- **Functional**: `.map()`, `.filter()`, `.flatMap()` over loops
- **No else after return**: Use early returns/ternaries

---

## Database (Drizzle ORM)

- **Schema**: `src/**/*.sql.ts` (co-located)
- **Naming**: snake*case (`user_id`, `created_at`), indexes: `<table>*<column>\_idx`
- **Migrations**: `bun run db generate --name <slug>` (from package dir)

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
export const session = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})
```

---

## Git Workflow

- **Default branch**: `dev` (NOT main!)
- **Commits**: Only when explicitly requested
- **Verification**: `bun typecheck` + tests BEFORE commit
- **Messages**: Present tense, explain WHY not what
- **Never commit secrets**: `.env`, credentials, API keys

---

## Package-Specific Notes

### GateClaw Orchestrator (Core Daemon)

- **Config**: `GATECLAW_TELEGRAM_TOKEN`, `GATECLAW_TELEGRAM_CHAT_ID`
- **Memory**: SQLite `~/.local/share/gateclaw/gateclaw.db`
- **Daemon**: HTTP `localhost:7371`, PID `~/.config/gateclaw/daemon.pid`
- **CLI**: `gateclaw {start|stop|restart|status|logs|tui|run}`
- **Soul**: `gateclaw soul {init|edit|show|reset}`
- **Facts**: `gateclaw fact {store|delete|get}`

### Desktop-Electron

- **Renderer**: Use `window.api` from `src/preload` only (IPC bridge)
- **Main**: IPC handlers in `src/main/ipc.ts`
- **Security**: Context isolation, no direct Node in renderer

### Desktop (Tauri)

- **Never call `invoke` manually**: Use `packages/desktop/src/bindings.ts`

### App (SolidJS Frontend)

- **Test env**: HappyDOM preload (`happydom.ts`)
- **Selectors**: `data-*` attrs or ARIA roles
- **State**: `createStore` for complex, `createSignal` for primitives
- **NEVER restart app/server** during debugging (breaks isolation)

---

## Environment & Configuration

- **Config dir**: `.gateclaw/` (legacy: `.opencode/`)
- **Agents**: `.gateclaw/agent/*.md`
- **Global envs**: `CI`, `OPENCODE_DISABLE_SHARE` (turbo.json)
- **.env**: Never commit

---

## Agent Behavior

- **Ask clarifying questions**: Don't assume ambiguous requirements
- **Run verification**: `bun typecheck` + tests after changes
- **Never commit** unless explicitly requested
- **ALWAYS use parallel tools**: Batch reads/writes/bash
- **Type-safe**: No `any`, use `unknown` + narrowing
- **Respect imports**: `@opencode-ai/*` cross-package, `@/*` internal
- **Agentic initiative**: Self-correct, explore autonomously

---

## Libraries & Patterns

- **Zod**: Runtime validation
- **Effect-ts**: Result types for errors
- **SolidJS**: Reactive state
- **Drizzle**: Type-safe SQL
- **Bun test**: Native testing (30s timeout, parallel by default)
- **Playwright**: E2E (60s/test)
- **tsg**: TypeScript 5.8+ type checking (NOT tsc)

---

## Critical Reminders (Read Before Every Task)

✅ **ALWAYS run `bun typecheck`** before any commit
✅ **Tests from package dirs ONLY** - never from root
✅ **Use parallel tool calls** - batch operations
✅ **Never commit secrets** - verify .env, credentials
✅ **Default branch is `dev`** - not main

_Last updated: March 2026 | Version: 0.2.0_
