import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"

const GATECLAW_BASE = "http://127.0.0.1:7371"

const server = new Server(
  {
    name: "gateclaw-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "gateclaw_remember",
        description: "Save a fact to GateClaw persistent memory",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "Fact key" },
            value: { type: "string", description: "Fact value" },
          },
          required: ["key", "value"],
        },
      },
      {
        name: "gateclaw_recall",
        description: "Retrieve a fact from GateClaw memory by key",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "Fact key" },
          },
          required: ["key"],
        },
      },
      {
        name: "gateclaw_facts",
        description: "List all facts from GateClaw memory",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "gateclaw_message",
        description: "Send a message to a GateClaw session",
        inputSchema: {
          type: "object",
          properties: {
            session_key: { type: "string", description: "Session identifier" },
            role: { type: "string", description: "Message role (user/assistant)" },
            content: { type: "string", description: "Message content" },
          },
          required: ["session_key", "role", "content"],
        },
      },
    ],
  }
})

server.setRequestHandler(
  CallToolRequestSchema,
  async (request: { params: { name: string; arguments?: Record<string, unknown> } }) => {
    const { name, arguments: args } = request.params

    try {
      let result: unknown

      switch (name) {
        case "gateclaw_remember": {
          const { key, value } = args as { key: string; value: string }
          const res = await fetch(`${GATECLAW_BASE}/fact`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value }),
          })
          result = await res.json()
          break
        }
        case "gateclaw_recall": {
          const { key } = args as { key: string }
          const res = await fetch(`${GATECLAW_BASE}/fact/${key}`)
          result = await res.json()
          break
        }
        case "gateclaw_facts": {
          const res = await fetch(`${GATECLAW_BASE}/facts`)
          result = await res.json()
          break
        }
        case "gateclaw_message": {
          const { session_key, role, content } = args as { session_key: string; role: string; content: string }
          const res = await fetch(`${GATECLAW_BASE}/message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_key, role, content }),
          })
          result = await res.json()
          break
        }
        default:
          throw new Error(`Unknown tool: ${name}`)
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      return {
        content: [{ type: "text", text: JSON.stringify({ error: message }) }],
        isError: true,
      }
    }
  },
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(console.error)
