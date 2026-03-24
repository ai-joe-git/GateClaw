import { config } from "../config.js"
import { logger } from "../utils/logger.js"

const TTS_REQUEST_TIMEOUT_MS = 2_400_000 // 40 minutes for long GateClaw responses

export interface TtsResult {
  audio: Buffer
  contentType: string
}

export interface TtsVoice {
  id: string
  name: string
  description?: string
}

/**
 * Returns true if TTS is configured (API URL is set).
 */
export function isTtsConfigured(): boolean {
  return Boolean(config.tts.apiUrl)
}

/**
 * Fetches available voices from the TTS server.
 *
 * GETs from `{TTS_API_URL}/v1/audio/voices` (Pocket TTS API).
 *
 * @returns Array of available voices
 */
export async function getAvailableVoices(): Promise<TtsVoice[]> {
  if (!isTtsConfigured()) {
    logger.warn("[TTS] Cannot fetch voices: TTS API URL not configured")
    return []
  }

  try {
    const voicesUrl = `${config.tts.apiUrl}/v1/audio/voices`
    const response = await fetch(voicesUrl, {
      method: "GET",
      signal: AbortSignal.timeout(TTS_REQUEST_TIMEOUT_MS),
    })

    if (response.ok) {
      const rawData = await response.text()
      logger.info("[TTS] Raw voices response:", rawData.substring(0, 200))

      const parsed = JSON.parse(rawData) as any

      // Pocket TTS returns {voices: [{voice_id, name}, ...]}
      const voices = Array.isArray(parsed) ? parsed : parsed.voices || parsed.data || []
      logger.info(`[TTS] Parsed voices count: ${voices.length}, first few:`, voices.slice(0, 3))

      if (Array.isArray(voices) && voices.length > 0) {
        return voices.map((v) => {
          const id = v.voice_id || v.id || v.name || String(v)
          const name =
            v.name ||
            id
              .split("-")
              .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
              .join(" ")
          return {
            id,
            name,
            description: v.name ? undefined : "Pocket TTS voice",
          }
        })
      }
    } else {
      logger.warn(`[TTS] Voices endpoint returned HTTP ${response.status}`)
    }
  } catch (err) {
    logger.warn("[TTS] Failed to fetch voices from server", err)
  }

  // Fallback: return just the configured default voice
  const defaultVoices: TtsVoice[] = [
    {
      id: config.tts.voice || "david-attenborough-original",
      name: config.tts.voice || "David Attenborough",
      description: "Default voice",
    },
  ]

  logger.debug(`[TTS] Using ${defaultVoices.length} default voice(s)`)
  return defaultVoices
}

/**
 * Synthesizes speech from text using the TTS API.
 *
 * Sends a JSON POST to `{TTS_API_URL}/v1/audio/speech`.
 *
 * @param text - Text to synthesize
 * @param voice - Voice ID to use (defaults to configured default voice)
 * @returns Audio buffer and content type
 */
export async function synthesizeSpeech(text: string, voice?: string): Promise<TtsResult> {
  if (!isTtsConfigured()) {
    throw new Error("TTS is not configured: TTS_API_URL is required")
  }

  const url = `${config.tts.apiUrl}/v1/audio/speech`
  let selectedVoice = voice || config.tts.voice || "david-attenborough-original"
  if (!selectedVoice.match(/\.\w+$/)) {
    selectedVoice += ".wav"
  }

  const body = {
    model: config.tts.model || "tts-1",
    input: text,
    voice: selectedVoice,
    response_format: "wav",
    speed: config.tts.speed || 1.0,
  }

  logger.debug(`[TTS] Sending speech synthesis request: url=${url}, voice=${selectedVoice}, text=${text.length} chars`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TTS_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "")
      throw new Error(`TTS API returned HTTP ${response.status}: ${errorBody || response.statusText}`)
    }

    const contentType = response.headers.get("content-type") || "audio/wav"
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    logger.debug(`[TTS] Synthesized audio: ${audioBuffer.length} bytes, type=${contentType}`)

    return { audio: audioBuffer, contentType }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`TTS request timed out after ${TTS_REQUEST_TIMEOUT_MS}ms`)
    }

    throw err
  } finally {
    clearTimeout(timeout)
  }
}
