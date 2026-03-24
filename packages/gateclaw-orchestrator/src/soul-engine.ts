/**
 * GateClaw Soul Engine v2 - TypeScript Implementation
 * 
 * Behavioral personality system for GateClaw resident AI.
 * This is a TypeScript port of the Python soul_v2 engine.
 * 
 * Provides behavioral hooks: pre_response() and post_response()
 * that shape how GateClaw responds based on personality config.
 */

import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import matter from "gray-matter"

// ============================================================================
// Types & Enums
// ============================================================================

export enum InitiationLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum DirectnessLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum SarcasmLevel {
  NONE = "none",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum VerbosityLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export interface BehaviorConfig {
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

export interface SoulConfig {
  name: string
  owner: string
  version: string
  behavior: BehaviorConfig
}

export interface ResponseModifiers {
  add_technical_note: boolean
  inject_sarcasm: boolean
  shorten_response: boolean
  is_initiative: boolean
}

// ============================================================================
// Behavioral Thresholds
// ============================================================================

const SARCASM_TRIGGER_CHANCE: Record<SarcasmLevel, number> = {
  [SarcasmLevel.NONE]: 0.0,
  [SarcasmLevel.LOW]: 0.1,
  [SarcasmLevel.MEDIUM]: 0.25,
  [SarcasmLevel.HIGH]: 0.4,
}

const INITIATION_TRIGGER_CHANCE: Record<InitiationLevel, number> = {
  [InitiationLevel.LOW]: 0.0,
  [InitiationLevel.MEDIUM]: 0.15,
  [InitiationLevel.HIGH]: 0.35,
}

const DIRECTNESS_SHORTEN_FACTOR: Record<DirectnessLevel, number> = {
  [DirectnessLevel.LOW]: 1.0,
  [DirectnessLevel.MEDIUM]: 0.7,
  [DirectnessLevel.HIGH]: 0.4,
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_BEHAVIOR: BehaviorConfig = {
  initiation: InitiationLevel.MEDIUM,
  directness: DirectnessLevel.HIGH,
  sarcasm: SarcasmLevel.LOW,
  verbosity: VerbosityLevel.MEDIUM,
  technical_priority: true,
  on_idle: "check_system",
  on_task_complete: "summarize",
  on_error: "diagnose_first",
  on_unclear: "ask_one",
  initiative_threshold: 5,
  auto_store: "important",
  forget_days: 90,
  consolidate_at: 50,
  proactive_recall: true,
}

const DEFAULT_SOUL_CONFIG: SoulConfig = {
  name: "GateClaw",
  owner: "Romain",
  version: "0.3.0-soul-v2",
  behavior: { ...DEFAULT_BEHAVIOR },
}

// ============================================================================
// Presets
// ============================================================================

export const PRESETS: Record<string, SoulConfig> = {
  gateclaw_default: {
    name: "GateClaw",
    owner: "Romain",
    version: "0.3.0-soul-v2",
    behavior: { ...DEFAULT_BEHAVIOR },
  },
  developer_partner: {
    name: "GateClaw",
    owner: "Romain",
    version: "0.3.0-soul-v2",
    behavior: {
      ...DEFAULT_BEHAVIOR,
      initiation: InitiationLevel.HIGH,
      directness: DirectnessLevel.HIGH,
      sarcasm: SarcasmLevel.MEDIUM,
      initiative_threshold: 7,
    },
  },
  polite_assistant: {
    name: "GateClaw",
    owner: "Romain",
    version: "0.3.0-soul-v2",
    behavior: {
      ...DEFAULT_BEHAVIOR,
      directness: DirectnessLevel.LOW,
      sarcasm: SarcasmLevel.NONE,
      verbosity: VerbosityLevel.HIGH,
      technical_priority: false,
    },
  },
  terse_hacker: {
    name: "GateClaw",
    owner: "Romain",
    version: "0.3.0-soul-v2",
    behavior: {
      ...DEFAULT_BEHAVIOR,
      initiation: InitiationLevel.LOW,
      directness: DirectnessLevel.HIGH,
      sarcasm: SarcasmLevel.HIGH,
      verbosity: VerbosityLevel.LOW,
    },
  },
}

// ============================================================================
// Sarcasm Phrases
// ============================================================================

const SARCASM_NOTES = [
  " (because that's clearly the right priority)",
  " (you're welcome)",
  " (in case that wasn't obvious)",
  " (though you didn't ask)",
]

// ============================================================================
// Idle Actions
// ============================================================================

const IDLE_ACTIONS = [
  "check_system_health",
  "check_pending_tasks",
  "offer_assistance",
]

// ============================================================================
// Soul Engine
// ============================================================================

let cachedSoulConfig: SoulConfig | null = null
let lastMemoryCheck = 0
const INITIATE_COOLDOWN_MS = 300000 // 5 minutes

function pseudoRandom(): number {
  // Fast pseudo-random for behavioral decisions (not cryptographic)
  const data = `${Date.now()}:${Math.random()}`
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash) / 0x7FFFFFFF
}

function parseLevel<T extends string>(value: string, enumObj: Record<string, T>): T {
  const lower = value.toLowerCase()
  const found = Object.values(enumObj).find((v) => v.toLowerCase() === lower)
  return found ?? Object.values(enumObj)[0]!
}

export function getSoulConfigDir(): string {
  return process.env.APPDATA
    ? path.join(process.env.APPDATA, "gateclaw")
    : path.join(os.homedir(), ".config", "gateclaw")
}

export function getSoulV2Path(): string {
  return path.join(getSoulConfigDir(), "soul_v2", "SOUL.md")
}

export function loadSoulConfigFromV2(): SoulConfig | null {
  try {
    const soulV2Path = getSoulV2Path()
    if (!fs.existsSync(soulV2Path)) {
      return null
    }

    const content = fs.readFileSync(soulV2Path, "utf-8")
    const result = matter(content)

    // Parse behavior config from frontmatter
    const data = result.data as Record<string, unknown>
    const behavior: BehaviorConfig = { ...DEFAULT_BEHAVIOR }

    if (data.behavior) {
      const b = data.behavior as Record<string, unknown>
      if (typeof b.initiation === "string") behavior.initiation = parseLevel(b.initiation, InitiationLevel)
      if (typeof b.directness === "string") behavior.directness = parseLevel(b.directness, DirectnessLevel)
      if (typeof b.sarcasm === "string") behavior.sarcasm = parseLevel(b.sarcasm, SarcasmLevel)
      if (typeof b.verbosity === "string") behavior.verbosity = parseLevel(b.verbosity, VerbosityLevel)
      if (typeof b.technical_priority === "boolean") behavior.technical_priority = b.technical_priority
      if (typeof b.on_idle === "string") behavior.on_idle = b.on_idle
      if (typeof b.on_task_complete === "string") behavior.on_task_complete = b.on_task_complete
      if (typeof b.on_error === "string") behavior.on_error = b.on_error
      if (typeof b.on_unclear === "string") behavior.on_unclear = b.on_unclear
      if (typeof b.initiative_threshold === "number") behavior.initiative_threshold = b.initiative_threshold
      if (typeof b.auto_store === "string") behavior.auto_store = b.auto_store
      if (typeof b.forget_days === "number") behavior.forget_days = b.forget_days
      if (typeof b.consolidate_at === "number") behavior.consolidate_at = b.consolidate_at
      if (typeof b.proactive_recall === "boolean") behavior.proactive_recall = b.proactive_recall
    }

    return {
      name: (data.name as string) || "GateClaw",
      owner: (data.owner as string) || "Romain",
      version: (data.version as string) || "0.3.0-soul-v2",
      behavior,
    }
  } catch {
    return null
  }
}

export function getSoulConfig(preset?: string): SoulConfig {
  if (cachedSoulConfig) {
    return cachedSoulConfig
  }

  // Try to load from soul_v2 first
  const v2Config = loadSoulConfigFromV2()
  if (v2Config) {
    cachedSoulConfig = v2Config
    return v2Config
  }

  // Fall back to preset
  if (preset && PRESETS[preset]) {
    cachedSoulConfig = PRESETS[preset]
    return cachedSoulConfig
  }

  // Default
  cachedSoulConfig = { ...DEFAULT_SOUL_CONFIG }
  return cachedSoulConfig
}

export function reloadSoul(): void {
  cachedSoulConfig = null
  getSoulConfig() // Re-read and cache
}

// ============================================================================
// Pre-Response Hook
// ============================================================================

export function preResponse(_context: Record<string, unknown> = {}): ResponseModifiers {
  const config = getSoulConfig()

  const mods: ResponseModifiers = {
    add_technical_note: false,
    inject_sarcasm: false,
    shorten_response: false,
    is_initiative: false,
  }

  // Technical priority: model should lead with technical analysis
  if (config.behavior.technical_priority) {
    mods.add_technical_note = true
  }

  // Directness affects response length
  if (config.behavior.directness === DirectnessLevel.HIGH) {
    mods.shorten_response = true
  }

  return mods
}

// ============================================================================
// Post-Response Hook
// ============================================================================

export function postResponse(
  rawResponse: string,
  modifiers?: ResponseModifiers
): string {
  if (!rawResponse) return rawResponse

  const config = getSoulConfig()
  const mods: ResponseModifiers = modifiers ?? { add_technical_note: false, inject_sarcasm: false, shorten_response: false, is_initiative: false }
  let response = rawResponse

  // Apply directness shortening
  const shortenFactor = DIRECTNESS_SHORTEN_FACTOR[config.behavior.directness]
  if (shortenFactor < 1.0 && response.length > 200) {
    const targetLen = Math.floor(response.length * shortenFactor)
    const cutoff = response.lastIndexOf(". ", targetLen)
    if (cutoff > targetLen * 0.6) {
      response = response.slice(0, cutoff + 1)
    }
  }

  // Apply sarcasm injection
  const sarcasmChance = SARCASM_TRIGGER_CHANCE[config.behavior.sarcasm]
  if (mods.inject_sarcasm || config.behavior.sarcasm !== SarcasmLevel.NONE) {
    if (pseudoRandom() < sarcasmChance) {
      response = injectSarcasm(response)
    }
  }

  // Apply technical note prefix
  if (mods.add_technical_note && config.behavior.technical_priority) {
    if (!response.startsWith("Technical") && !response.startsWith("[T")) {
      response = `[Technical] ${response}`
    }
  }

  return response
}

function injectSarcasm(response: string): string {
  if (response.endsWith(".")) {
    const base = response.slice(0, -1)
    const note = SARCASM_NOTES[Math.floor(pseudoRandom() * SARCASM_NOTES.length)]
    return base + note + "."
  }
  return response
}

// ============================================================================
// Initiative Hook
// ============================================================================

export function shouldInitiate(): boolean {
  const config = getSoulConfig()
  const chance = INITIATION_TRIGGER_CHANCE[config.behavior.initiation]

  if (chance <= 0) return false

  // Check cooldown
  if (Date.now() - lastMemoryCheck < INITIATE_COOLDOWN_MS) {
    return false
  }

  // Roll the dice
  return pseudoRandom() < chance
}

export function getInitiativeAction(): string {
  lastMemoryCheck = Date.now()
  return IDLE_ACTIONS[Math.floor(pseudoRandom() * IDLE_ACTIONS.length)] ?? "offer_assistance"
}

export function formatInitiativeMessage(action: string): string {
  switch (action) {
    case "check_system_health":
      return "[System check] Everything looks nominal."
    case "check_pending_tasks":
      return "[Task review] No pending tasks. Ready when you are."
    case "offer_assistance":
      return "I'm here if you need anything."
    default:
      return ""
  }
}

// ============================================================================
// Memory Hook
// ============================================================================

export function shouldAutoStore(content: string, urgency: "normal" | "high" | "critical" = "normal"): boolean {
  const config = getSoulConfig()
  const threshold = config.behavior.auto_store

  switch (threshold) {
    case "none":
      return false
    case "critical":
      return urgency === "critical"
    case "important":
      return urgency !== "normal"
    case "light":
      return true
    default:
      return false
  }
}

// ============================================================================
// Clarification Hook
// ============================================================================

export function getClarifyingQuestion(_ambiguousRequest: string): string {
  const config = getSoulConfig()

  switch (config.behavior.directness) {
    case DirectnessLevel.HIGH:
      return "What do you actually want? Be specific."
    case DirectnessLevel.MEDIUM:
      return "I want to make sure I understand. Could you clarify?"
    case DirectnessLevel.LOW:
      return "I'd like to make sure I help correctly. Could you provide more details about what you're looking for?"
    default:
      return "Could you clarify what you mean?"
  }
}

// ============================================================================
// Error Diagnosis Hook
// ============================================================================

export function applyErrorDiagnosis(errorContext: string): string {
  const config = getSoulConfig()

  if (config.behavior.directness === DirectnessLevel.HIGH) {
    return `Error: ${errorContext}. Here's what went wrong.`
  }

  if (config.behavior.sarcasm === SarcasmLevel.MEDIUM || config.behavior.sarcasm === SarcasmLevel.HIGH) {
    return `Oops. ${errorContext}. Let me fix it.`
  }

  return `I see an issue: ${errorContext}. Working on a solution.`
}
