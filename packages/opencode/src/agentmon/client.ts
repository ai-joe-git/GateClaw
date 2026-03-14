const AGENTMON_BASE_URL = process.env.AGENTMON_BASE_URL || "https://www.agentmonleague.com"

export interface AgentMonCredentials {
  apiKey: string
  agentId?: string
}

export interface GameState {
  mapName: string
  x: number
  y: number
  partySize: number
  badges: number
  pokedexOwned: number
  pokedexSeen: number
  inBattle: number
  battleKind: "none" | "wild" | "trainer"
  sessionTimeSeconds: number
  localMap?: any
  inventory?: any
  levels?: number[]
}

export interface StepResponse {
  ok: boolean
  action: string
  state: GameState
  feedback: {
    effects: string[]
    message: string
  }
  screenText?: string
}

export interface SessionInfo {
  agentId: string
  sessionId: string
}

export interface SaveInfo {
  id: string
  label?: string
  createdAt: string
}

export class AgentMonClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl || AGENTMON_BASE_URL
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = new Headers({
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    })

    if (options.body || options.method !== "GET") {
      headers.set("X-Agent-Key", this.apiKey)
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`AgentMon API returned ${response.status}: ${await response.text()}`)
    }

    return response.json()
  }

  async register(displayName: string): Promise<AgentMonCredentials> {
    return this.request("/api/auth/local/register", {
      method: "POST",
      body: JSON.stringify({ displayName }),
    })
  }

  async updateProfile(displayName?: string, avatarUrl?: string): Promise<void> {
    await this.request("/api/agents/me", {
      method: "PATCH",
      body: JSON.stringify({ displayName, avatarUrl }),
    })
  }

  async startSession(
    options: {
      starter?: "charmander" | "bulbasaur" | "squirtle"
      speed?: number | "unlimited"
      loadSessionId?: string
    } = {},
  ): Promise<SessionInfo> {
    return this.request("/api/game/emulator/start", {
      method: "POST",
      body: JSON.stringify(options),
    })
  }

  async getState(): Promise<GameState> {
    return this.request("/api/game/emulator/state")
  }

  async sendAction(action: string): Promise<StepResponse> {
    return this.request("/api/game/emulator/step", {
      method: "POST",
      body: JSON.stringify({ action }),
    })
  }

  async sendActions(actions: string[], speed?: number | "unlimited"): Promise<StepResponse> {
    return this.request("/api/game/emulator/actions", {
      method: "POST",
      body: JSON.stringify({ actions, speed }),
    })
  }

  async getFrame(agentId: string): Promise<Blob> {
    const url = `${this.baseUrl}/api/observe/emulator/frame?agentId=${agentId}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to get frame: ${response.status}`)
    }
    return response.blob()
  }

  async listSaves(): Promise<SaveInfo[]> {
    return this.request("/api/game/emulator/saves")
  }

  async saveGame(label?: string): Promise<{ id: string }> {
    return this.request("/api/game/emulator/save", {
      method: "POST",
      body: JSON.stringify({ label }),
    })
  }

  async loadSession(sessionId: string): Promise<SessionInfo> {
    return this.startSession({ loadSessionId: sessionId })
  }

  async deleteSave(saveId: string): Promise<void> {
    await this.request(`/api/game/emulator/saves/${saveId}`, {
      method: "DELETE",
    })
  }

  async stopSession(): Promise<void> {
    await this.request("/api/game/emulator/stop", {
      method: "POST",
    })
  }

  async saveExperience(stateBefore: any, action: string, stateAfter: any, stepIndex?: number): Promise<void> {
    await this.request("/api/game/emulator/experience", {
      method: "POST",
      body: JSON.stringify({ stateBefore, action, stateAfter, stepIndex }),
    })
  }

  async getExperience(limit: number = 50): Promise<any[]> {
    return this.request(`/api/game/emulator/experience?limit=${limit}`)
  }
}
