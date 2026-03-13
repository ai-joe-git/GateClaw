import { expect, test, describe, beforeEach, afterEach } from "bun:test"
import { spawn } from "child_process"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { wait } from "./test-utils"

const TEST_DB_PATH = path.join(os.tmpdir(), "gateclaw-e2e.db")

describe("E2E - HTTP API with Database", () => {
  let daemon: ReturnType<typeof spawn> | null = null

  const startDaemon = () => {
    return new Promise<ReturnType<typeof spawn>>((resolve) => {
      const proc = spawn("bun", ["run", "src/index.ts"], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      })
      proc.on("spawn", () => resolve(proc))
      daemon = proc
    })
  }

  const stopDaemon = async () => {
    if (daemon) {
      try {
        await fetch("http://127.0.0.1:7371/shutdown", { method: "POST" })
      } catch {}
      await wait(200)
      if (daemon && daemon.exitCode === undefined) {
        daemon.kill("SIGTERM")
      }
      daemon = null
    }
  }

  beforeEach(async () => {
    await stopDaemon()
    daemon = await startDaemon()
    await wait(2000)
  })

  afterEach(async () => {
    await stopDaemon()
    // Cleanup test data
    try {
      const factsRes = await fetch("http://127.0.0.1:7371/facts")
      if (factsRes.ok) {
        const facts = await factsRes.json()
        for (const fact of facts as any[]) {
          if (fact.key?.startsWith("e2e_")) {
            await fetch(`http://127.0.0.1:7371/fact/${fact.key}`, { method: "DELETE" })
          }
        }
      }
    } catch {}
  })

  test("fact CRUD operations persist across requests", async () => {
    // Create
    const createRes = await fetch("http://127.0.0.1:7371/fact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "e2e_test_key", value: "persisted_value" }),
    })
    expect(createRes.status).toBe(200)

    // Read
    const readRes = await fetch("http://127.0.0.1:7371/fact/e2e_test_key")
    expect(readRes.status).toBe(200)
    const fact = await readRes.json()
    expect((fact as any).value).toBe("persisted_value")

    // Update
    const updateRes = await fetch("http://127.0.0.1:7371/fact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "e2e_test_key", value: "updated_value" }),
    })
    expect(updateRes.status).toBe(200)

    // Verify update
    const readAgainRes = await fetch("http://127.0.0.1:7371/fact/e2e_test_key")
    const updatedFact = await readAgainRes.json()
    expect((updatedFact as any).value).toBe("updated_value")

    // Delete
    const deleteRes = await fetch("http://127.0.0.1:7371/fact/e2e_test_key", { method: "DELETE" })
    expect(deleteRes.status).toBe(200)

    // Verify delete
    const readAfterDeleteRes = await fetch("http://127.0.0.1:7371/fact/e2e_test_key")
    expect(readAfterDeleteRes.status).toBe(404)
  })

  test("message conversation persists in database", async () => {
    // Store conversation
    const msgs = [
      { session_key: "e2e_conv", role: "user", content: "first message" },
      { session_key: "e2e_conv", role: "assistant", content: "response one" },
      { session_key: "e2e_conv", role: "user", content: "second message" },
      { session_key: "e2e_conv", role: "assistant", content: "response two" },
    ]

    for (const msg of msgs) {
      const res = await fetch("http://127.0.0.1:7371/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      })
      expect(res.status).toBe(200)
    }

    // Retrieve and verify order
    const getRes = await fetch("http://127.0.0.1:7371/messages/e2e_conv")
    const retrieved = await getRes.json()
    expect((retrieved as any[]).length).toBe(4)
    expect((retrieved as any[])[0].content).toBe("first message")
    expect((retrieved as any[])[1].content).toBe("response one")
  })

  test("multiple sessions remain isolated", async () => {
    // Session A
    await fetch("http://127.0.0.1:7371/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_key: "session_a", role: "user", content: "message A" }),
    })

    // Session B
    await fetch("http://127.0.0.1:7371/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_key: "session_b", role: "user", content: "message B" }),
    })

    // Verify isolation
    const resA = await fetch("http://127.0.0.1:7371/messages/session_a")
    const msgsA = await resA.json()
    expect((msgsA as any[]).length).toBe(1)
    expect((msgsA as any[])[0].content).toBe("message A")

    const resB = await fetch("http://127.0.0.1:7371/messages/session_b")
    const msgsB = await resB.json()
    expect((msgsB as any[]).length).toBe(1)
    expect((msgsB as any[])[0].content).toBe("message B")
  })

  test("uptime accumulates across requests", async () => {
    const health1 = await fetch("http://127.0.0.1:7371/health")
    const data1 = await health1.json()

    await wait(1000)

    const health2 = await fetch("http://127.0.0.1:7371/health")
    const data2 = await health2.json()

    const uptime1 = (data1 as any).uptime_ms
    const uptime2 = (data2 as any).uptime_ms
    expect(uptime2 - uptime1).toBeGreaterThanOrEqual(1000)
    expect(uptime2 - uptime1).toBeLessThan(1500)
  })

  test("health endpoint reflects database state", async () => {
    // Initial health check
    const healthInitial = await fetch("http://127.0.0.1:7371/health")
    const dataInitial = await healthInitial.json()
    expect((dataInitial as any).status).toBe("ok")

    // Create some data
    await fetch("http://127.0.0.1:7371/fact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "e2e_health_test", value: "test" }),
    })

    // Health should still be ok
    const healthAfter = await fetch("http://127.0.0.1:7371/health")
    const dataAfter = await healthAfter.json()
    expect((dataAfter as any).status).toBe("ok")
  })
})
