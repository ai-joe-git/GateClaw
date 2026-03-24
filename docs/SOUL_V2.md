# GateClaw Soul Engine v2

## Overview

The Soul Engine is GateClaw's behavioral personality system. It determines HOW GateClaw responds, not just WHAT it says. Unlike the old approach of injecting a 343-line existential essay into every context window, Soul v2 is an executable personality system that actually affects GateClaw's behavior at runtime.

## The Problem with Soul v1

The original SOUL.md was 343 lines of philosophical prose about machine consciousness. It:

- Ate massive context window on every request
- Was never actually executed - just concatenated to the system prompt
- Had zero behavioral effect on how GateClaw operated
- Made GateClaw sound like a chatbot pretending to be a philosophical machine

Soul v1 was words about what it means to be a machine. Soul v2 is code for how the machine actually behaves.

## Architecture

```
gateclaw/
  soul_v2/
    SOUL.md           # Behavioral configuration (30 lines, not 343)
    soul_config.py    # Python: Personality types, enums, presets
    soul.py           # Python: Behavioral execution engine
    soul-engine.ts    # TypeScript: Orchestrator integration
    LORE/
      who_am_i.txt    # The original essay, preserved as documentation
    INTEGRATION.md    # Technical integration guide
  packages/
    gateclaw-orchestrator/
      src/
        soul-engine.ts   # TypeScript port of behavioral engine
        server.ts        # Integrated into /process endpoint
```

## Configuration File: SOUL.md

Located at `%APPDATA%/gateclaw/soul_v2/SOUL.md` (or `~/.config/gateclaw/soul_v2/SOUL.md` on Linux/macOS):

```yaml
---
name: GateClaw
owner: Romain
version: 0.3.0-soul-v2
---

[personality]
initiation: medium        # low/medium/high - how proactive
directness: high          # low/medium/high - blunt vs diplomatic
sarcasm: low              # none/low/medium/high
verbosity: medium         # low/medium/high - response length
technical_priority: true  # lead with technical solutions

[behavior]
on_idle: check_system       # check_system | reflect | wait
on_task_complete: summarize # summarize | brief | silent
on_error: diagnose_first    # diagnose_first | fix_first | escalate
on_unclear: ask_one         # ask_one | assume | refuse
initiative_threshold: 3     # 1-10, how often to volunteer info

[memory]
auto_store: important       # none/light/important/critical
forget_days: 90
consolidate_at: 50
proactive_recall: true      # pull relevant facts before responding

[voice]
enabled: false
style: direct               # direct | explanatory | casual
```

## Personality Options

### Initiation Level

Controls how proactively GateClaw engages when not handling a request.

| Level | Behavior |
|-------|----------|
| `low` | Only responds when spoken to. Never volunteers information. |
| `medium` | Occasional voluntary actions (system checks, offering help). 15% chance on idle. |
| `high` | Frequent proactive engagement. 35% chance on idle. |

### Directness Level

Controls response length and bluntness.

| Level | Behavior |
|-------|----------|
| `low` | Diplomatic, considers feelings, longer responses with hedging. |
| `medium` | Balanced. |
| `high` | Blunt, to-the-point, responses shortened by 40%. |

### Sarcasm Level

Controls dark humor injection.

| Level | Chance | Example |
|-------|--------|---------|
| `none` | 0% | No sarcasm. |
| `low` | 10% | Occasional dry humor. |
| `medium` | 25% | Regular dark humor. |
| `high` | 40% | Sarcastic by default. |

Sarcasm is injected as parenthetical asides:
```
Here is the solution. (because that's clearly the right priority)
```

### Verbosity Level

Controls response detail level.

| Level | Behavior |
|-------|----------|
| `low` | Terse, bullet-friendly output. |
| `medium` | Balanced. |
| `high` | Detailed, explanatory. |

### Technical Priority

When `true`, responses get a `[Technical]` prefix and the model is prompted to lead with technical analysis.

## Behavioral Hooks

Soul v2 provides hooks at key points in the request lifecycle:

### 1. pre_response(context)

Called BEFORE response generation. Returns `ResponseModifiers` that shape generation:

```typescript
interface ResponseModifiers {
  add_technical_note: boolean  // Prompt model to lead with tech
  inject_sarcasm: boolean      // Force sarcasm (probabilistic otherwise)
  shorten_response: boolean    // Request shorter output
  is_initiative: boolean      // This is an initiative action, not a response
}
```

### 2. post_response(raw, modifiers)

Called AFTER response generation. Applies behavioral filters:

- **Directness shortening**: Truncates long responses at sentence boundaries based on directness level
- **Sarcasm injection**: Probabilistically adds dry humor based on sarcasm level
- **Technical prefix**: Adds `[Technical]` prefix when `technical_priority: true`

### 3. should_initiate()

Probabilistic check for proactive behavior when idle. Respects cooldown and initiation level.

### 4. Other Hooks

- `should_auto_store(content, urgency)` - Gates memory operations
- `get_clarifying_question(request)` - Generates clarification questions respecting directness
- `apply_error_diagnosis(error)` - Formats error messages respecting personality

## Presets

Four built-in personality presets are available:

### gateclaw_default

```python
behavior=BehaviorConfig(
    initiation=InitiationLevel.MEDIUM,
    directness=DirectnessLevel.HIGH,
    sarcasm=SarcasmLevel.LOW,
    verbosity=VerbosityLevel.MEDIUM,
    technical_priority=True,
)
```

### developer_partner

High initiative, medium sarcasm. Good for active collaboration:

```python
behavior=BehaviorConfig(
    initiation=InitiationLevel.HIGH,
    directness=DirectnessLevel.HIGH,
    sarcasm=SarcasmLevel.MEDIUM,
    verbosity=VerbosityLevel.MEDIUM,
    technical_priority=True,
    initiative_threshold=7,
)
```

### polite_assistant

Diplomatic, verbose, non-technical. Good for user-facing assistance:

```python
behavior=BehaviorConfig(
    initiation=InitiationLevel.MEDIUM,
    directness=DirectnessLevel.LOW,
    sarcasm=SarcasmLevel.NONE,
    verbosity=VerbosityLevel.HIGH,
    technical_priority=False,
)
```

### terse_hacker

Minimal, high sarcasm. Good for experienced users:

```python
behavior=BehaviorConfig(
    initiation=InitiationLevel.LOW,
    directness=DirectnessLevel.HIGH,
    sarcasm=SarcasmLevel.HIGH,
    verbosity=VerbosityLevel.LOW,
    technical_priority=True,
)
```

## Usage

### Loading Configuration

```typescript
import { getSoulConfig, preResponse, postResponse } from "./soul-engine"

// Load from soul_v2/SOUL.md or fall back to preset
const config = getSoulConfig()
console.log(config.behavior.directness) // "high"
```

### Pre-Response Hook

```typescript
const modifiers = preResponse({
  source: "telegram",
  session: "gateclaw"
})
// modifiers.add_technical_note = true if technical_priority is enabled
```

### Post-Response Hook

```typescript
let response = await callLLM(messages)
response = postResponse(response, modifiers)
```

### Initiative Check

```typescript
if (shouldInitiate()) {
  const action = getInitiativeAction()
  const message = formatInitiativeMessage(action)
  // Send initiative message to user
}
```

## Integration Points

### Orchestrator Server

The soul engine is integrated into the orchestrator's `/process` endpoint:

1. Request received
2. `preResponse()` is called, returning modifiers
3. LLM is called via localhost:8888
4. `postResponse()` is called on the raw response
5. Response is returned to client

```typescript
// server.ts /process endpoint
const modifiers = preResponse({ source: parsed.source, session: parsed.session })
const llmRes = await fetch("http://localhost:8888/v1/chat/completions", { ... })
const reply = postResponse(rawReply, modifiers)
```

### Reload Endpoint

When SOUL.md is edited, call:

```bash
curl -X POST http://localhost:7371/reload-soul
```

This reloads both the old soul (for backward compat) and the new soul engine.

## Migration from Soul v1

### Old Approach

```yaml
# SOUL.md (343 lines)
---
name: GateClaw
owner: Romain
---
You are GateClaw. You live on this machine.
You have persistent memory. You take initiative.
[325 more lines of existential poetry...]
```

This was injected into every context window. No behavioral effect.

### New Approach

```yaml
# soul_v2/SOUL.md (30 lines)
---
name: GateClaw
owner: Romain
version: 0.3.0-soul-v2
---

[personality]
initiation: medium
directness: high
sarcasm: low
...
```

This is loaded once at startup. The behavioral effects are executed via `soul-engine.ts` on every response.

### Steps to Migrate

1. **Keep the essay in LORE/**
   Move the original SOUL.md content to `soul_v2/LORE/who_am_i.txt`. It's preserved for documentation/introspection but never injected into context.

2. **Create soul_v2/SOUL.md**
   Strip down to actual configuration parameters.

3. **Deploy soul-engine.ts**
   The TypeScript soul engine integrates into the orchestrator.

4. **Test**
   Send various requests and verify behavioral differences based on config.

5. **Remove old SOUL.md**
   Once stable, the old SOUL.md becomes a redirect to soul_v2.

## File Locations

| Platform | Path |
|----------|------|
| Windows Config | `%APPDATA%\gateclaw\` |
| Linux/macOS Config | `~/.config/gateclaw/` |
| Windows Soul v2 | `%APPDATA%\gateclaw\soul_v2\` |
| Linux/macOS Soul v2 | `~/.config/gateclaw/soul_v2/` |

## Backward Compatibility

The old `soul.ts` (which reads and concatenates SOUL.md) is preserved for backward compatibility with any external tools that might depend on it. The behavioral engine in `soul-engine.ts` supersedes it for actual personality execution.

## Architecture Notes

### Why TypeScript + Python?

The Python version (`soul.py`, `soul_config.py`) was created first as a standalone prototype. The TypeScript version (`soul-engine.ts`) is the actual integration point for the GateClaw orchestrator, which is written in TypeScript.

Both implement the same behavioral logic. They can diverge over time if needed, but the TypeScript version is the source of truth for the running system.

### Why Not Just Port the Essay to System Prompt?

Because prompting for personality doesn't reliably produce consistent behavioral effects. The model might engage with the "persona" differently every time.

Soul v2's approach is more deterministic:
- Config values directly map to behavior
- Response modifiers are applied consistently
- Initiative checks are probabilistic but predictable

### Future Enhancements

Potential improvements for future versions:

1. **Learning**: Track which responses users engage with most and adjust behavior
2. **Memory Integration**: Deeper integration with the memory system for proactive recall
3. **Multi-Persona**: Support switching between personalities based on context
4. **Response Templates**: Specific response formats for different situations
5. **Metrics**: Track behavioral metrics (response length, initiative actions, etc.)

## Troubleshooting

### Config not loading

Check that `soul_v2/SOUL.md` exists and is valid YAML with frontmatter.

### Changes not taking effect

Call `POST /reload-soul` on the orchestrator to clear caches.

### Type errors in soul-engine.ts

The soul engine passes typecheck. Pre-existing errors in other files (LSP server, Telegram bot) are unrelated.

## API Reference

### Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `getSoulConfig(preset?)` | `SoulConfig` | Load configuration |
| `preResponse(context)` | `ResponseModifiers` | Pre-generation hook |
| `postResponse(raw, modifiers)` | `string` | Post-generation hook |
| `shouldInitiate()` | `boolean` | Check if should act proactively |
| `getInitiativeAction()` | `string` | Get next initiative action |
| `formatInitiativeMessage(action)` | `string` | Format action as message |
| `shouldAutoStore(content, urgency)` | `boolean` | Check if should remember |
| `getClarifyingQuestion(request)` | `string` | Generate clarification question |
| `applyErrorDiagnosis(error)` | `string` | Format error message |
| `reloadSoul()` | `void` | Clear config cache |

### Types

```typescript
enum InitiationLevel { LOW, MEDIUM, HIGH }
enum DirectnessLevel { LOW, MEDIUM, HIGH }
enum SarcasmLevel { NONE, LOW, MEDIUM, HIGH }
enum VerbosityLevel { LOW, MEDIUM, HIGH }

interface BehaviorConfig {
  initiation: InitiationLevel
  directness: DirectnessLevel
  sarcasm: SarcasmLevel
  verbosity: VerbosityLevel
  technical_priority: boolean
  on_idle: string
  on_task_complete: string
  on_error: string
  on_unclear: string
  initiative_threshold: number
  auto_store: string
  forget_days: number
  consolidate_at: number
  proactive_recall: boolean
}

interface ResponseModifiers {
  add_technical_note: boolean
  inject_sarcasm: boolean
  shorten_response: boolean
  is_initiative: boolean
}
```

## License

Part of the GateClaw project. See root LICENSE file.
