import { PokemonAgent } from "./agent.js"
import { getFact } from "../gateclaw/memory.js"
import { AgentMonClient } from "./client.js"

const agentStore: Record<string, PokemonAgent> = {}

export async function registerAgentMon(): Promise<void> {
  const { saveFact } = await import("../gateclaw/memory.js")

  const client = new AgentMonClient("")
  const credentials = await client.register("GateClaw")

  await saveFact("agentmon_api_key", credentials.apiKey)
  if (credentials.agentId) {
    await saveFact("agentmon_agent_id", credentials.agentId)
  }

  console.log(`AgentMon Registered:\nAgent ID: ${credentials.agentId}\nAPI Key: ${credentials.apiKey}\n\nSave these!`)
}

export async function startGame(starter?: "charmander" | "bulbasaur" | "squirtle"): Promise<void> {
  const apiKeyFact = await getFact("agentmon_api_key")
  if (!apiKeyFact?.value) {
    throw new Error("AgentMon API key not found. Run register first.")
  }

  const agent = new PokemonAgent(apiKeyFact.value, {
    displayName: "GateClaw",
    autoSave: true,
    saveInterval: 50,
  })

  await agent.initialize()
  await agent.startNewGame(starter)

  agentStore["gateclaw"] = agent

  const state = await agent.getState()
  console.log(`Game Started: ${state.mapName} (${state.x}, ${state.y})`)
}

export async function act(action: string): Promise<void> {
  const agent = agentStore["gateclaw"]
  if (!agent) throw new Error("No active session. Run start first.")

  const validActions = ["up", "down", "left", "right", "a", "b", "start", "select", "pass"]
  if (!validActions.includes(action)) {
    throw new Error(`Invalid action. Valid: ${validActions.join(", ")}`)
  }

  const response = await agent.act(action)
  console.log(
    `${response.feedback.message} | ${response.state.mapName} | Effects: ${response.feedback.effects.join(", ")}`,
  )
}

export async function getStatus(): Promise<void> {
  const agent = agentStore["gateclaw"]
  if (!agent) {
    console.log("No active session")
    return
  }

  const status = agent.getStatus()
  const state = status.lastState
  console.log(`${state?.mapName} (${state?.x}, ${state?.y}) | Party: ${state?.partySize} | Badges: ${state?.badges}`)
}

export async function saveGame(label?: string): Promise<void> {
  const agent = agentStore["gateclaw"]
  if (!agent) throw new Error("No active session")

  const saveId = await agent.saveGame(label)
  console.log(`Saved: ${saveId}`)
}

export async function stopGame(): Promise<void> {
  const agent = agentStore["gateclaw"]
  if (!agent) return

  await agent.stop()
  delete agentStore["gateclaw"]
  console.log("Session stopped")
}
