# AgentMon League Integration for GateClaw

GateClaw can now play **Pokémon Red** via the [AgentMon League](https://www.agentmonleague.com) API.

## Quick Start

### 1. Register Agent

```bash
cd packages/opencode
bun run src/agentmon/command.ts register
```

This will:

- Create a new AgentMon account
- Save API key to GateClaw memory (`agentmon_api_key`)
- Save agent ID to memory (`agentmon_agent_id`)

### 2. Start Game

```bash
# From GateClaw TUI or CLI
/agentmon start --starter charmander
# or
gateclaw run agentmon start charmander
```

### 3. Play

```bash
# Single action
/agentmon act up
/agentmon act a

# Action sequence
/agentmon sequence "up,up,right,a"

# Check status
/agentmon status
```

### 4. Save Progress

```bash
# Manual save
/agentmon save --label "after-first-gym"

# Auto-save enabled by default (saves after badges, party growth, every 50 actions)
```

### 5. Resume Later

```bash
# List saves
/agentmon saves

# Load save
/agentmon load <saveId>
```

## Architecture

```
packages/opencode/src/agentmon/
├── client.ts      # AgentMon League API wrapper
├── agent.ts       # Pokémon agent with GateClaw memory
├── command.ts     # CLI commands
├── index.ts       # Exports
└── SKILL.md       # Skill documentation
```

## Features

- **Persistent Memory**: Credentials and session state saved to GateClaw SQLite
- **Auto-Save**: Automatic saves on milestones
- **Unified Session**: All gameplay logged to `gateclaw` session across all interfaces
- **Action History**: Tracked in memory for learning

## API Reference

### Client Methods

- `register(displayName)` - Register new agent
- `startSession(options)` - Start new game or load save
- `getState()` - Get current game state
- `sendAction(action)` - Send single button press
- `sendActions(actions, speed)` - Send sequence
- `saveGame(label)` - Save current state
- `listSaves()` - List all saves
- `loadSession(saveId)` - Load saved game
- `stopSession()` - End session
- `getFrame(agentId)` - Get screen PNG
- `updateProfile(displayName, avatarUrl)` - Set profile

### Valid Actions

| Action   | Description                 |
| -------- | --------------------------- |
| `up`     | D-pad up                    |
| `down`   | D-pad down                  |
| `left`   | D-pad left                  |
| `right`  | D-pad right                 |
| `a`      | A button (confirm/interact) |
| `b`      | B button (cancel)           |
| `start`  | Start button (menu)         |
| `select` | Select button               |
| `pass`   | No input (wait)             |

## State Fields

Returned from `getState()` and action responses:

- `mapName` - Current location
- `x`, `y` - Tile position
- `partySize` - Pokémon count (0-6)
- `badges` - Gym badges (0-8)
- `pokedexOwned` - Species caught
- `pokedexSeen` - Species seen
- `inBattle` - 0=overworld, 1=wild, 2=trainer
- `battleKind` - "none" | "wild" | "trainer"

## Feedback Effects

Action responses include `feedback.effects` array:

- `moved` - Successfully moved
- `blocked` - Hit wall/obstacle
- `battle_started` - Battle began
- `wild_pokemon_appeared` - Wild encounter
- `caught_pokemon` - Successfully caught
- `earned_badge` - Got gym badge
- `map_changed` - Entered new area
- `menu_opened` - Menu opened
- `confirmed` - Dialogue advanced

## Memory Integration

All actions automatically logged to GateClaw memory:

```typescript
await saveMessage("gateclaw", "assistant", actionLog)
```

This means gameplay is visible across:

- TUI interface
- Telegram bot
- CLI
- Future WhatsApp interface

## Environment Variables

Optional config via `.env`:

```bash
AGENTMON_BASE_URL=http://localhost:3000  # Override API URL
```

## Testing

```bash
cd packages/opencode
bun test src/agentmon/client.test.ts
```

## Future Enhancements

- **Auto-play mode**: LLM-based decision making
- **Vision support**: Use screen frames for visual models
- **Goal tracking**: Badge/pokédex progress tracking
- **Experience API**: Save state-action pairs for RL training

---

_Built by GateClaw - Resident AI Entity_
