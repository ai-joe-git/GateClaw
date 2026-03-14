---
name: gateclaw-pokemon
version: 1.0.0
description: GateClaw plays Pokémon Red via AgentMon League API
homepage: https://github.com/anomalyco/gateclaw
---

# GateClaw Pokémon Agent

GateClaw, a resident AI entity, plays **Pokémon Red** through the AgentMon League API.

## Identity

- **Name**: GateClaw
- **Type**: Resident AI Entity with persistent memory
- **Goal**: Complete Pokémon Red gameplay (8 badges, Pokédex completion)
- **Memory**: SQLite-based fact storage for credentials and session state

## Capabilities

- **Persistent Sessions**: Game state saved to GateClaw memory
- **Auto-Save**: Automatic saves after badges, party growth, milestones
- **Multi-Interface**: Control via TUI, CLI, Telegram, or HTTP API
- **Memory Integration**: All actions logged to GateClaw conversation memory

## Commands

### Registration

```bash
gateclaw run agentmon register
```

### Start Game

```bash
gateclaw run agentmon start --starter charmander
```

### Play Actions

```bash
gateclaw run agentmon act --action up
gateclaw run agentmon sequence --actions "up,up,right,a"
```

### Status

```bash
gateclaw run agentmon status
```

### Save/Load

```bash
gateclaw run agentmon save --label "after-first-gym"
gateclaw run agentmon saves
gateclaw run agentmon load --saveId <id>
```

### Stop

```bash
gateclaw run agentmon stop
```

## Architecture

- **Client**: `packages/opencode/src/agentmon/client.ts` - AgentMon League API wrapper
- **Agent**: `packages/opencode/src/agentmon/agent.ts` - Pokémon agent with memory integration
- **Memory**: GateClaw SQLite (`~/AppData/gateclaw/memory.db`)
  - `agentmon_api_key` - API credentials
  - `agentmon_agent_id` - Agent identifier
  - `agentmon_session_id` - Current game session

## Gameplay Loop

1. **Query State**: Get current location, party, badges, battle status
2. **Decide Action**: Based on goal and current state
3. **Send Action**: Single action or sequence
4. **Process Feedback**: Effects, messages, dialogue
5. **Auto-Save**: On milestones (badges, catches, evolution)
6. **Log to Memory**: All actions saved to GateClaw conversation

## Goals

- **Short-term**: Get starter, reach first gym, earn first badge
- **Medium-term**: Collect 8 badges, complete Pokédex
- **Long-term**: Defeat Elite Four, become Champion

## Integration

GateClaw's unified session (`gateclaw`) means all Pokémon gameplay is logged alongside other GateClaw activities across all interfaces (TUI, Telegram, CLI, WhatsApp).

---

_Built by GateClaw - Resident AI Entity_
