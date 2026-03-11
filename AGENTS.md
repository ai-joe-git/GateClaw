# AGENTS.md - Development Guidelines for GateClaw

> Monorepo managed with Bun workspaces. Package manager: `bun@1.3.10`

## Build / Lint / Test Commands

### Root Level

```bash
bun dev              # Opencode CLI dev mode
bun dev:desktop      # Tauri desktop dev
bun dev:web          # Web app dev
bun dev:storybook    # Storybook dev
bun typecheck        # TypeScript typecheck (turbo)
bun prepare          # Install husky hooks
```

### packages/opencode

```bash
cd packages/opencode
bun run typecheck              # tsgo --noEmit (TypeScript 5.8+)
bun test                       # All tests (timeout: 30000ms)
bun test test/util/format.test.ts          # Single test file
bun test -t "should format"                # Test by name pattern
bun run build                  # Build via script/build.ts
bun run db generate --name slug # Drizzle migration
bun run format                 # Format with Prettier
bun run lint                   # Tests with coverage
```

### packages/app

```bash
cd packages/app
bun test:unit                  # Unit tests (happydom preload)
bun test:unit:watch            # Watch mode
bun test -- src/foo.test.ts                # Single unit test
bun test:e2e                   # E2E tests (Playwright)
bun test:e2e -- app/home.spec.ts           # Single e2e test
bun test:e2e -- -g "pattern"               # E2E by title
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

### Naming Conventions (MANDATORY)

- **Single-word names**: `pid`, `cfg`, `err`, `opts`, `dir`, `root`, `child`, `state`
- **Avoid verbose**: `inputPID` ❌ → `pid` ✅
- **camelCase**: variables, functions, methods
- **SCREAMING_SNAKE_CASE**: constants
- **PascalCase**: types, interfaces, classes

### Variables & Control Flow

- **Prefer `const`** over `let`
- **Avoid destructuring**; use dot notation: `obj.a` ✅ vs `const { a } = obj` ❌
- **Use ternaries** or early returns; avoid `else` after early returns
- **Inline single-use values**: `const x = await Bun.file(path).json()`

### File Naming

- **Snake_case**: `src/` directories
- **Test files**: `*.test.ts`
- **E2E tests**: `*.spec.ts`
- **Drizzle schemas**: `*.sql.ts` (e.g., `session.sql.ts`)

### Imports

- **Absolute paths**: `@/*` within `packages/opencode/src/`
- **Package exports**: `@opencode-ai/*` for cross-package
- **Ordering**: Standard lib → External → Internal; alphabetical
- **E2E tests**: Import from `../fixtures`, not `@playwright/test`

### Formatting

- **Prettier config** in root `package.json`: `semi: false`, `printWidth: 120`
- **Editorconfig**: 2 spaces, LF endings, final newline

### Types

- **No explicit return types**: Let TypeScript infer (unless exporting)
- **No `any`**: Use `unknown` with narrowing
- **Zod**: Runtime validation schemas
- **Effect library**: Functional error handling
- **SolidJS**: Prefer `createStore` over `createSignal`

### Error Handling

- **No try/catch**: Use Result types or early returns
- **No mocks**: Test real logic
- **Functional methods**: `.map()`, `.filter()`, `.flatMap()` over loops

## Database (Drizzle ORM)

- **Schema**: `src/**/*.sql.ts`
- **Naming**: snake*case columns, `<entity>_id` joins, `<table>*<column>\_idx` indexes

```ts
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})
```

- **Migrations**: `bun run db generate --name <slug>`

## Type Checking

- **Command**: `bun typecheck` from package directories
- **Implementation**: `tsgo --noEmit` (TypeScript 5.8+ Go)
- **Never run `tsc` directly**

## Git Workflow

- **Default branch**: `dev` (use `dev` or `origin/dev` for diffs)
- **Commits**: Only when explicitly requested
- **Verification**: Run `bun typecheck` and tests before commit
- **Never commit** unless user asks

## Package-Specific Notes

### packages/desktop

- **Never call `invoke`** manually; use bindings in `packages/desktop/src/bindings.ts`

### packages/desktop-electron

- **Renderer**: Only call `window.api` from `src/preload`
- **Main**: IPC handlers in `src/main/ipc.ts`

### packages/app

- **HappyDOM**: Tests use `happydom.ts` preload
- **SolidJS**: Use `createStore` over `createSignal`
- **Selectors**: Use `data-component`, `data-action`, or roles (not CSS classes)
- **NEVER restart app/server** during debugging
- **E2E cleanup**: Use `withSession()` / `withProject()` helpers; call `trackSession()` / `trackDirectory()` for teardown
- **Local UI**: Use separate backend + app dev servers for local testing

### Local Dev (Backend + App)

- Backend: `bun run --conditions=browser ./src/index.ts serve --port 4096` (from packages/opencode)
- App: `bun dev -- --port 4444` (from packages/app)
- Open `http://localhost:4444` to verify UI changes

## Testing Guidelines

- **Timeouts**: Opencode 30s, E2E default 60s/test, 10s/assertion
- **Watch mode**: Use during development
- **UI mode**: `bun test:e2e:ui` for Playwright debugging

## Environment & Configuration

- **Config**: `.opencode/` directory
- **Agents**: Defined in `.opencode/agent/*.md`
- **Env vars**: Use `env/` module
- **Flags**: `flag/` module (e.g., `OPENCODE_DISABLE_SHARE`)
- **Global env**: `CI`, `OPENCODE_DISABLE_SHARE` (from turbo.json)

## Agent Behavior

- Ask clarifying questions when ambiguous
- Propose options when multiple approaches exist
- Run typecheck and tests after code changes
- Do not modify source unless explicitly asked
- Prefer automation over manual confirmation
- **Never commit** unless explicitly requested
- **ALWAYS use parallel tools** when applicable
- **Type-safe code**: Implement with proper TypeScript inference

## Browser Automation

Use `agent-browser` CLI for web automation:

1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes
