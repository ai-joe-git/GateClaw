import { config } from "../config.js"
import { logger } from "../utils/logger.js"
import { spawn } from "child_process"
import { join } from "path"
import { tmpdir } from "os"
import { unlink } from "fs/promises"

const STT_REQUEST_TIMEOUT_MS = 30_000

/**
 * Returns true if STT is configured (API URL is set).
 */
export function isSttConfigured(): boolean {
  return Boolean(config.stt.apiUrl)
}

/**
 * Converts OGG audio buffer to WAV format using ffmpeg.
 */
async function convertOggToWav(oggBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tempPath = join(tmpdir(), `gateclaw_${Date.now()}.wav`)

    const ffmpeg = spawn("ffmpeg", ["-i", "pipe:0", "-f", "wav", "-ar", "16000", "-acodec", "pcm_s16le", tempPath])

    const chunks: Buffer[] = []

    ffmpeg.stdin.write(oggBuffer)
    ffmpeg.stdin.end()

    ffmpeg.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}`))
        return
      }

      try {
        const wavBuffer = await Bun.file(tempPath).arrayBuffer()
        await unlink(tempPath)
        resolve(Buffer.from(wavBuffer))
      } catch (err) {
        reject(err)
      }
    })

    ffmpeg.on("error", reject)
  })
}

/**
 * Transcribes audio to text using the STT API (Whisper.cpp server).
 *
 * Uses OpenAI-compatible endpoint `{STT_API_URL}/v1/audio/transcriptions`.
 * Automatically converts OGG (Telegram) → WAV (Whisper.cpp).
 *
 * @param audioBuffer - Audio file buffer (OGG from Telegram)
 * @param filename - Original filename (e.g., "file_123.ogg")
 * @returns Transcribed text
 * @throws Error if STT is not configured or the request fails
 */
export async function transcribeAudio(audioBuffer: Buffer, filename = "voice.ogg"): Promise<string> {
  if (!isSttConfigured()) {
    throw new Error("STT is not configured: STT_API_URL is required")
  }

  const url = `${config.stt.apiUrl}/v1/audio/transcriptions`

  logger.debug(`[STT] Converting OGG→WAV: ${audioBuffer.length} bytes`)

  // Convert OGG to WAV (Whisper.cpp only accepts WAV)
  let wavBuffer: Buffer
  try {
    wavBuffer = await convertOggToWav(audioBuffer)
    logger.debug(`[STT] Converted to WAV: ${wavBuffer.length} bytes`)
  } catch (err: any) {
    logger.error("[STT] OGG→WAV conversion failed:", err.message)
    throw new Error(`Audio conversion failed: ${err.message}`)
  }

  const formData = new FormData()
  const blob = new Blob([wavBuffer], { type: "audio/wav" })
  formData.append("file", blob, "audio.wav")
  formData.append("model", config.stt.model || "whisper-large-v3-turbo")
  formData.append("response_format", "text")

  if (config.stt.language) {
    formData.append("language", config.stt.language)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), STT_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "")
      throw new Error(`STT API returned HTTP ${response.status}: ${errorBody}`)
    }

    const text = await response.text()
    logger.info(`[STT] Transcribed "${text}"`)

    return text.trim()
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`STT timeout after ${STT_REQUEST_TIMEOUT_MS}ms`)
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}
