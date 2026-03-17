import { Database as BunDB } from "bun:sqlite"
import { join } from "path"
import { logger } from "../utils/logger.js"
import { isTtsConfigured, getAvailableVoices, type TtsVoice } from "../tts/client.js"

const VOICE_SETTING_KEY = "voice_enabled"
const VOICE_PREF_KEY = "voice_preference"

// Database path - use LOCALAPPDATA on Windows, XDG on Linux/macOS
const DB_PATH =
  process.platform === "win32" && process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "gateclaw", "gateclaw.db")
    : join(process.env.HOME || process.env.USERPROFILE || "", ".local", "share", "gateclaw", "gateclaw.db")

// Module-level singleton
let _db: BunDB | null = null

function getDB(): BunDB {
  if (!_db) {
    try {
      _db = new BunDB(DB_PATH, { create: true })
      // Ensure table exists
      _db.run(`
        CREATE TABLE IF NOT EXISTS gc_setting (
          user_id INTEGER,
          key TEXT,
          value TEXT,
          time_created INTEGER,
          time_updated INTEGER,
          PRIMARY KEY (user_id, key)
        )
      `)
      logger.debug("[Voice] Database initialized", { path: DB_PATH })
    } catch (err) {
      logger.error("[Voice] Failed to open database", err)
      throw err
    }
  }
  return _db
}

export interface VoiceUserSettings {
  enabled: boolean
  voice: string
}

/**
 * Gets user's voice settings from database.
 */
export function getUserVoiceSettings(userId: number): VoiceUserSettings {
  try {
    const db = getDB()
    const rows = db
      .query(`SELECT key, value FROM gc_setting WHERE user_id = ? AND key IN (?, ?)`)
      .all(userId, VOICE_SETTING_KEY, VOICE_PREF_KEY) as Array<{ key: string; value: string }>

    if (!rows || rows.length === 0) {
      return { enabled: false, voice: "david-attenborough-original" }
    }

    const enabledRow = rows.find((r) => r.key === VOICE_SETTING_KEY)
    const voiceRow = rows.find((r) => r.key === VOICE_PREF_KEY)

    const enabled = enabledRow?.value === "true"
    const voice = voiceRow?.value || "david-attenborough-original"

    return { enabled, voice }
  } catch (err) {
    logger.warn("[Voice] Failed to get user voice settings, using defaults", err)
    return { enabled: false, voice: "david-attenborough-original" }
  }
}

/**
 * Sets user's voice settings in database.
 */
export function setUserVoiceSettings(userId: number, settings: VoiceUserSettings): void {
  try {
    const db = getDB()
    const now = Date.now()

    // Save enabled setting
    db.run(
      `
      INSERT OR REPLACE INTO gc_setting (user_id, key, value, time_created, time_updated)
      VALUES (?, ?, ?, ?, ?)
    `,
      [userId, VOICE_SETTING_KEY, settings.enabled ? "true" : "false", now, now],
    )

    // Save voice preference
    db.run(
      `
      INSERT OR REPLACE INTO gc_setting (user_id, key, value, time_created, time_updated)
      VALUES (?, ?, ?, ?, ?)
    `,
      [userId, VOICE_PREF_KEY, settings.voice, now, now],
    )

    logger.info(`[Voice] Saved voice settings for user ${userId}: enabled=${settings.enabled}, voice=${settings.voice}`)
  } catch (err) {
    logger.error("[Voice] Failed to save user voice settings", err)
  }
}

/**
 * Gets available TTS voices (cached from server).
 */
export async function getVoiceList(): Promise<TtsVoice[]> {
  if (!isTtsConfigured()) {
    return []
  }

  try {
    return await getAvailableVoices()
  } catch (err) {
    logger.warn("[Voice] Failed to fetch voice list", err)
    return []
  }
}

/**
 * Checks if TTS is enabled for a user.
 */
export function isVoiceEnabled(userId: number): boolean {
  const settings = getUserVoiceSettings(userId)
  return settings.enabled && isTtsConfigured()
}
