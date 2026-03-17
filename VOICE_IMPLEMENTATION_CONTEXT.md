# GateClaw Voice Implementation - Context for Claude Sonnet

## Project Context

**GateClaw** is a resident AI entity built as a fork of OpenCode, running as a daemon with:

- HTTP API on `localhost:7371`
- Telegram bot interface
- TUI (Terminal UI)
- Persistent memory in SQLite
- Soul identity defined in `SOUL.md`

## Current Task: Voice In/Out Implementation

### What Was Implemented

I implemented full voice support for GateClaw with:

1. **TTS Client** (`packages/gateclaw-orchestrator/src/telegram-bot/tts/client.ts`)
   - `synthesizeSpeech(text, voice)` - calls TTS API at `localhost:8000`
   - `getAvailableVoices()` - fetches voice list
   - 60s timeout, error handling

2. **Voice Manager** (`packages/gateclaw-orchestrator/src/telegram-bot/voice/manager.ts`)
   - `getUserVoiceSettings(userId)` - gets user preferences from DB
   - `setUserVoiceSettings(userId, settings)` - saves preferences
   - `isVoiceEnabled(userId)` - checks if TTS enabled

3. **Server Endpoints** (`packages/gateclaw-orchestrator/src/server.ts`)
   - `GET /voice/voices` - list voices
   - `POST /voice/synthesize` - synthesize speech
   - `GET /voice/status/:user_id` - get user settings
   - `POST /voice/settings` - save settings

4. **Telegram Integration**
   - `/voice` command - inline keyboard menu
   - Voice toggle (enable/disable)
   - Voice selection from available voices
   - Auto-speak LLM responses when enabled

5. **Daemon Integration** (`packages/gateclaw-orchestrator/src/index.ts`)
   - Auto-spawn TTS server on port 8000
   - Auto-spawn STT server on port 7372

### Configuration

```
TTS_API_URL=http://localhost:8000
TTS_DEFAULT_VOICE=david-attenborough-original
TTS_MODEL=tts-1
```

## THE PROBLEM

### Voice settings aren't persisting to database

**Symptoms:**

- User clicks "✅ Enable Voice" in Telegram
- Logs show: `[INFO] [Voice] User 7638575659 enabled voice output`
- But immediately followed by: `[WARN] [Voice] SQLite not available`
- Menu still shows "Enabled: No" after clicking enable
- Database table `gc_setting` remains empty

**Root Cause:**
The `Database` wrapper from `@opencode-ai/storage/db` uses lazy initialization:

```typescript
export const Client = lazy(() => {
  const sqlite = new BunDatabase(Path)
  state.sqlite = sqlite
  // ... migrations
  return db
})
```

When I call `Database.Client` in voice/manager.ts, it should initialize, but the state remains undefined:

```typescript
Database.Client // Should trigger lazy init
const sqlite = (Database as any).state?.sqlite // Still undefined!
```

**Database path:** `C:/Users/uscha/.local/share/gateclaw/opencode-local.db`
**Table exists:** `gc_setting` table created manually
**Issue:** Database wrapper's `state.sqlite` is never populated when accessed from voice manager

## What I've Tried

1. **Direct SQLite access** - tried `new Database(dbPath)` but got "bindings file not found" error
2. **Database.use()** - tried wrapping but `db.prepare()` not available on Drizzle wrapper
3. **Database.state?.sqlite** - accessing internal state but it's undefined
4. **Forcing init with Database.Client** - calling it but state still undefined
5. **Different import paths** - tried `../../`, `../../../`, `@opencode-ai/` - all have issues

## Current Code (voice/manager.ts)

```typescript
import { Database } from "../../../../opencode/src/storage/db"

export function getUserVoiceSettings(userId: number): VoiceUserSettings {
  try {
    Database.Client // Force initialization
    const sqlite = (Database as any).state?.sqlite
    if (!sqlite) {
      logger.warn("[Voice] SQLite not available")
      return { enabled: false, voice: "david-attenborough-original" }
    }
    const rows = sqlite
      .query(`SELECT key, value FROM gc_setting WHERE user_id = ? AND key IN (?, ?)`)
      .all(userId, VOICE_SETTING_KEY, VOICE_PREF_KEY)
    // ... process rows
  } catch (err) {
    // handle error
  }
}
```

## What Works

- TTS server running on port 8000 ✅
- STT server running on port 7372 ✅
- `/voice` menu displays in Telegram ✅
- Button clicks are handled ✅
- Log shows "User enabled voice output" ✅

## What Doesn't Work

- Settings don't persist to DB ❌
- Menu doesn't update to show "Enabled: Yes" ❌
- Voice output never triggers because `isVoiceEnabled()` returns false ❌

## Database Location

- **Path:** `C:/Users/uscha/.local/share/gateclaw/opencode-local.db`
- **Table:** `gc_setting (user_id INTEGER, key TEXT, value TEXT, time_created INTEGER, time_updated INTEGER)`
- **Table exists:** Yes (created manually with bun:sqlite)

## Request for Claude Sonnet

**Question:** How do I properly access the SQLite database from the voice manager module?

The Database wrapper uses lazy initialization but `Database.state?.sqlite` is undefined even after calling `Database.Client`.

**Options:**

1. How to force Database initialization properly?
2. Should I use a different pattern (Database.use() with proper API)?
3. Should I create a separate Database instance for voice settings?
4. Is there a race condition where voice manager loads before Database init?

**Goal:** Make voice settings persist so when user clicks "Enable Voice", it actually saves to DB and the menu updates to show "Enabled: Yes", then TTS audio is sent after LLM responses.

## Files Modified

- `packages/gateclaw-orchestrator/src/telegram-bot/tts/client.ts` (created)
- `packages/gateclaw-orchestrator/src/telegram-bot/voice/manager.ts` (created)
- `packages/gateclaw-orchestrator/src/telegram-bot/bot/commands/voice.ts` (created)
- `packages/gateclaw-orchestrator/src/telegram-bot/bot/index.ts` (edited - added voice handlers)
- `packages/gateclaw-orchestrator/src/telegram-bot/config.ts` (edited - added tts section)
- `packages/gateclaw-orchestrator/src/server.ts` (edited - added /voice endpoints)
- `packages/gateclaw-orchestrator/src/index.ts` (edited - spawn TTS/STT servers)
- `packages/gateclaw-orchestrator/src/telegram-bot/i18n/*.ts` (edited - added voice translations)
