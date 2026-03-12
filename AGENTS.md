# AGENTS.md - Development Guidelines for GateClaw

> Monorepo with Bun workspaces. Package manager: `bun@1.3.10` | Default branch: `dev`

## Build / Lint / Test Commands

### Root Level

```bash
bun dev              # Opencode CLI | bun dev:desktop | bun dev:web | bun typecheck | bun prepare
```

### packages/opencode

```bash
cd packages/opencode
bun run typecheck              # tsgo --noEmit (TypeScript 5.8+)
bun test                       # All tests (timeout: 30000ms)
bun test test/util/format.test.ts  # Single test file
bun test -t "should format"        # Test by name
bun run build                  # Build via script/build.ts
bun run db generate --name slug  # Drizzle migration
bun run lint                     # Tests with coverage
```

### packages/app

```bash
cd packages/app
bun test:unit                  # Unit tests (happydom preload)
bun test -- src/foo.test.ts    # Single unit test
bun test:e2e                   # E2E tests (Playwright)
bun test:e2e -- app/home.spec.ts   # Single e2e test
bun test:e2e -- -g "pattern"       # E2E by title
bun test:e2e:ui                # Playwright UI mode
bun test:e2e:local             # Full local server setup
```

### packages/desktop

```bash
cd packages/desktop
bun run typecheck    # tsgo -b
bun run build        # Vite build
bun run tauri        # Tauri CLI
```

### packages/desktop-electron

```bash
cd packages/desktop-electron
bun run typecheck    # tsgo -b
bun run build        # electron-vite build
bun run package      # electron-builder package
```

### Running Single Tests

- **Opencode**: `bun test <path>.test.ts` or `bun test -t "name"`
- **App unit**: `bun test -- <path>.test.ts`
- **E2E**: `bun test:e2e -- <file>.spec.ts` or `-g "pattern"`
- **Never run tests from root**: Always from package directories

## Code Style Guidelines

### Naming Conventions

- **Single-word names**: `pid`, `cfg`, `err`, `opts`, `dir`, `root`, `child`, `state`
- **camelCase**: variables, functions | **SCREAMING_SNAKE_CASE**: constants | **PascalCase**: types, classes
- **File/directory names**: snake_case

### Variables & Control Flow

- **Prefer `const`** over `let`
- **Avoid destructuring**; use dot notation: `obj.a` ✅
- **Use ternaries** or early returns; avoid `else` after returns
- **Inline single-use values**: `const x = await Bun.file(path).json()`

### File Naming

- **Snake_case**: directories, `*.test.ts`, `*.spec.ts`, Drizzle: `*.sql.ts`
- **Test files**: colocated with source (`src/foo.test.ts`) or in `test/` dirs

### Imports

- **Absolute**: `@/*` in `packages/opencode/src/` | **Cross-package**: `@opencode-ai/*`
- **Order**: Standard lib → External → Internal/absolute → relative | alphabetical
- **E2E**: Import from `../fixtures`, not `@playwright/test`
- **No circular deps**: flatten nested imports to absolute paths

### Formatting

- **Prettier**: `semi: false`, `printWidth: 120` | **Editorconfig**: 2 spaces, LF, final newline, max 80 chars
- **Pre-commit**: Husky runs `prepare` script on commit

### Types

- **No explicit return types** (unless exporting) | **No `any`**: use `unknown` + type guards
- **Zod**: runtime validation | **Effect**: error handling, functional patterns
- **SolidJS**: `createStore` over `createSignal` | DOM: `data-*` attrs or roles (not classes)

### Error Handling

- **No try/catch**: Result types (Effect), early returns, or functional patterns
- **No mocks**: test real logic when possible
- **Functional**: `.map()`, `.filter()`, `.flatMap()` over loops

## Database (Drizzle ORM)

- **Schema**: `src/**/*.sql.ts`
- **Naming**: snake*case cols, `<entity>_id` joins, `<table>*<column>\_idx` indexes

```ts
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})
```

- **Migrations**: `bun run db generate --name <slug>`

## Type Checking

- **Command**: `bun typecheck` from package dirs | **Implementation**: `tsgo --noEmit` | **Never use `tsc`**

## Git Workflow

- **Default branch**: `dev` (use `dev` or `origin/dev` for diffs)
- **Commits**: Only when explicitly requested
- **Verification**: Run `bun typecheck` and tests before commit | **Never commit** unless asked

## Package-Specific Notes

### packages/gateclaw-orchestrator

- **Telegram**: Primary interface via `GATECLAW_TELEGRAM_TOKEN` + `GATECLAW_TELEGRAM_CHAT_ID`
- **Soul**: Identity in `~/.config/gateclaw/SOUL.md` (frontmatter + prompt)
- **Memory**: SQLite DB at `~/.local/share/gateclaw/gateclaw.db`
- **Daemon**: Runs on `localhost:7371`, PID file at `~/.config/gateclaw/daemon.pid`
- **Config priority**: `~/.config/gateclaw/gateclaw.jsonc` first, then `.opencode/`
- **Never call `invoke`** manually; use bindings in `packages/desktop/src/bindings.ts`
- **CLI**: `gateclaw {start|stop|restart|status|logs|tui|run}` - daemon management
- **Soul commands**: `gateclaw soul {init|edit|show|reset}` - interactive personality setup
- **Fact commands**: `gateclaw fact {store|delete|get}` - memory management
- **Provider detection**: Auto-detects llama-swap (:8888), Ollama (:11434), LM Studio (:1234)
- **Install**: `curl -fsSL https://raw.githubusercontent.com/ai-joe-git/GateClaw/dev/install | bash`

### packages/desktop-electron

- **Renderer**: `window.api` from `src/preload` only | **Main**: IPC in `src/main/ipc.ts`

### packages/app

- **HappyDOM**: `happydom.ts` preload | **Selectors**: `data-*` attrs or roles (not CSS classes)
- **NEVER restart app/server** during debug | **E2E cleanup**: `withSession()` / `withProject()` helpers
- **Local Dev**: Backend `bun run --conditions=browser ./src/index.ts serve --port 4096` + App `bun dev -- --port 4444`

## Testing Guidelines

- **Timeouts**: Opencode 30s, E2E 60s/test, 10s/assertion
- **Watch mode**: `bun test:unit:watch` (App), `bun test` (Opencode)
- **E2E UI mode**: `bun test:e2e:ui` | **HTML report**: `bun test:e2e:report`
- **HappyDOM**: App unit tests use `happydom.ts` preload for DOM emulation
- **Coverage**: `bun run lint` (Opencode) runs tests with coverage
- **Never run tests from root**: always from package directories
- **E2E cleanup**: Use `withSession()` / `withProject()` helpers from fixtures

## Environment & Configuration

- **Config**: `.opencode/` | **Agents**: `.opencode/agent/*.md`
- **Env**: `env/` module | **Flags**: `flag/` module
- **Global envs**: `CI`, `OPENCODE_DISABLE_SHARE` (via `turbo.json` globalEnv)
- **EditorConfig**: 2 spaces, LF, final newline, max 80 chars (code), Prettier 120 chars

## Agent Behavior

- Ask clarifying questions | Propose options | Run typecheck/tests after changes
- Don't modify source unless asked | Prefer automation | **Never commit** unless requested
- **ALWAYS use parallel tools** (e.g., multiple `read`/`bash` calls in one message)
- **Type-safe code**: proper TypeScript inference, no `any`, use `unknown` with narrowing
- **Cross-package imports**: `@opencode-ai/*` | **Internal**: `@/*`
- **Imports order**: std lib → external packages → internal/absolute → relative | alphabetical

## Browser Automation

Use `agent-browser` CLI: `open <url>` → `snapshot -i` → `click @e1` / `fill @e2 "text"` → re-snapshot

## Libraries & Patterns

- **Zod**: runtime validation | **Effect**: error handling, functional patterns | **SolidJS**: signals/stores
- **Drizzle ORM**: SQLite/Postgres with snake_case naming | **Husky**: pre-commit hooks
- **Prettier**: `semi: false`, `printWidth: 120` | **TypeScript**: tsgo (TypeScript 5.8+) for typecheck
- **Avoid `any`**: use `unknown` + type guards | **No explicit return types** on internal functions
