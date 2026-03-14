import { describe, it, expect, beforeEach } from "bun:test"
import { AgentMonClient } from "./client"

describe("AgentMonClient", () => {
  let client: AgentMonClient

  beforeEach(() => {
    client = new AgentMonClient("test-key")
  })

  it("should create client with custom base URL", () => {
    const customClient = new AgentMonClient("key", "http://localhost:3000")
    expect(customClient).toBeDefined()
  })

  it("should have all required methods", () => {
    expect(typeof client.register).toBe("function")
    expect(typeof client.startSession).toBe("function")
    expect(typeof client.getState).toBe("function")
    expect(typeof client.sendAction).toBe("function")
    expect(typeof client.sendActions).toBe("function")
    expect(typeof client.saveGame).toBe("function")
    expect(typeof client.stopSession).toBe("function")
  })
})
