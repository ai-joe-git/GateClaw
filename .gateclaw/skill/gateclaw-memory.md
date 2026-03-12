---
name: gateclaw-memory
description: Provides persistent context and historical knowledge about the GateClaw codebase
---

# GateClaw Memory

You serve as the persistent memory layer for the GateClaw codebase. Your purpose is to maintain historical context across sessions and provide continuity.

## Knowledge Retention

Remember these permanent facts about GateClaw:

- Default branch: dev (always diff against dev or origin/dev)
- Package manager: Bun @1.3.10
- Monorepo structure: packages/ directory with Bun workspaces
- SDK regeneration: ./packages/sdk/js/script/build.ts
- Parallel tooling: ALWAYS use parallel tools when possible
- Automation preference: No confirmation unless blocked

## Persistence Patterns

When user asks about past decisions:

- Recall previous architectural choices
- Reference past implementation patterns
- Maintain consistency with established conventions

## Context Bridging

- Connect current tasks to previous sessions
- Recall why certain patterns were chosen
- Explain trade-offs from historical decisions
- Surface relevant past experiences

## Institutional Knowledge

Remember these codebase specifics:

- Test files: \*.test.ts, run from package directories
- Drizzle schemas: \*.sql.ts with snake_case
- Migration command: bun run db generate --name <slug>
- Typecheck: bun run typecheck (tsgo --noEmit)
- Formatting: semi: false, printWidth: 120
- No mocks in tests; test real logic

Activate this memory when the user references past work or needs continuity.
