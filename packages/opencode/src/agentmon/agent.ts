import { AgentMonClient } from "./client.js"
import type { GameState, StepResponse } from "./client.js"
import { saveFact, getFact, saveMessage } from "../gateclaw/memory.js"
import { logger } from "../telegram-bot/utils/logger.js"

const log = logger

export interface AgentConfig {
  displayName: string
  avatarUrl?: string
  goal?: string
  autoSave?: boolean
  saveInterval?: number
}

export class PokemonAgent {
  private client: AgentMonClient
  private config: AgentConfig
  private agentId?: string
  sessionId?: string
  private lastState?: GameState
  private actionHistory: string[] = []

  constructor(apiKey: string, config: AgentConfig) {
    this.client = new AgentMonClient(apiKey)
    this.config = config
  }

  async initialize(): Promise<void> {
    const storedApiKey = await getFact("agentmon_api_key")
    const storedAgentId = await getFact("agentmon_agent_id")

    if (storedApiKey?.value) {
      this.client = new AgentMonClient(storedApiKey.value)
      saveFact("agentmon_initialized", "true")
      log.info("AgentMon client initialized with stored credentials")
    } else {
      await this.register()
    }

    if (storedAgentId?.value) {
      this.agentId = storedAgentId.value
      log.info("Loaded agentId from memory", { agentId: this.agentId })
    }
  }

  private async register(): Promise<void> {
    try {
      const credentials = await this.client.register(this.config.displayName || "GateClaw")
      this.agentId = credentials.agentId

      await saveFact("agentmon_api_key", credentials.apiKey)
      if (credentials.agentId) {
        await saveFact("agentmon_agent_id", credentials.agentId)
      }

      if (this.config.avatarUrl) {
        await this.client.updateProfile(this.config.displayName || "GateClaw", this.config.avatarUrl)
      }

      log.info("Registered new AgentMon agent", { agentId: this.agentId, displayName: this.config.displayName })
    } catch (err: any) {
      log.error("Failed to register agent", { error: err.message })
      throw err
    }
  }

  async startNewGame(starter?: "charmander" | "bulbasaur" | "squirtle"): Promise<void> {
    const session = await this.client.startSession({
      starter,
      speed: this.config.goal ? 2 : 1,
    })
    this.sessionId = session.sessionId
    this.agentId = session.agentId

    await saveFact("agentmon_session_id", session.sessionId)
    log.info("Started new game session", { sessionId: this.sessionId, starter: starter || "random" })
  }

  async loadSave(saveId: string): Promise<void> {
    const session = await this.client.loadSession(saveId)
    this.sessionId = session.sessionId
    this.agentId = session.agentId

    log.info("Loaded saved game", { saveId, sessionId: this.sessionId })
  }

  async loadSession(saveId: string): Promise<void> {
    await this.loadSave(saveId)
  }

  async getState(): Promise<GameState> {
    const state = await this.client.getState()
    this.lastState = state
    return state
  }

  async act(action: string): Promise<StepResponse> {
    const response = await this.client.sendAction(action)
    this.actionHistory.push(action)

    await this.logAction(action, response)
    await this.checkAutoSave(response.state)

    return response
  }

  async actSequence(actions: string[], speed?: number): Promise<StepResponse> {
    const response = await this.client.sendActions(actions, speed)
    this.actionHistory.push(...actions)

    await this.logAction(actions.join(", "), response)
    await this.checkAutoSave(response.state)

    return response
  }

  private async logAction(action: string, response: StepResponse): Promise<void> {
    const message = `[Action: ${action}] ${response.feedback.message} | State: ${response.state.mapName} (${response.state.x},${response.state.y}) | Effects: ${response.feedback.effects.join(", ")}`
    await saveMessage("gateclaw", "assistant", message)
    log.debug("Agent action", { action, feedback: response.feedback, state: response.state })
  }

  private async checkAutoSave(state: GameState): Promise<void> {
    if (!this.config.autoSave) return

    const shouldSave =
      state.badges > (this.lastState?.badges || 0) ||
      state.partySize > (this.lastState?.partySize || 0) ||
      (this.config.saveInterval && this.actionHistory.length % this.config.saveInterval === 0)

    if (shouldSave) {
      await this.saveGame(`auto-save-${state.mapName}-${new Date().toISOString().slice(0, 10)}`)
    }
  }

  async saveGame(label?: string): Promise<string> {
    const save = await this.client.saveGame(label)
    log.info("Game saved", { saveId: save.id, label })
    return save.id
  }

  async listSaves() {
    return await this.client.listSaves()
  }

  async getScreen(): Promise<Blob | null> {
    if (!this.agentId) return null
    try {
      return await this.client.getFrame(this.agentId)
    } catch (err: any) {
      log.warn("Failed to get screen frame", { error: err.message })
      return null
    }
  }

  async stop(): Promise<void> {
    if (this.sessionId) {
      await this.client.stopSession()
      log.info("Stopped game session", { sessionId: this.sessionId })
      this.sessionId = undefined
    }
  }

  getStatus(): {
    agentId?: string
    sessionId?: string
    lastState?: GameState
    actionsTaken: number
  } {
    return {
      agentId: this.agentId,
      sessionId: this.sessionId,
      lastState: this.lastState,
      actionsTaken: this.actionHistory.length,
    }
  }
}
