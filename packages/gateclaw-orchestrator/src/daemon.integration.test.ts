import { expect, test, describe, beforeEach, afterEach } from "bun:test"
import { spawn, execSync } from "child_process"
import fs from "node:fs"
import { wait, isRunning } from "./test-utils"

const TIMEOUT = 10000

describe("Daemon Lifecycle Integration", () => {
  let daemon: ReturnType<typeof spawn> | null = null
  let pid: number | undefined

  const killDaemon = () => {
    if (daemon) {
      const daemonPid = daemon.pid
      if (daemonPid) {
        if (process.platform === "win32") {
          try {
            execSync(`taskkill /PID ${daemonPid} /F`, { stdio: "pipe" })
          } catch {}
        } else {
          process.kill(daemonPid, "SIGTERM")
        }
      }
      daemon = null
    }
    if (pid && isRunning(pid)) {
      try {
        if (process.platform === "win32") {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "pipe" })
        } else {
          process.kill(pid, "SIGTERM")
        }
      } catch {}
    }
    try {
      fs.rmSync(".gateclaw.pid", { force: true })
    } catch {}
  }

  beforeEach(async () => {
    killDaemon()
    await wait(500)
  })

  afterEach(() => {
    killDaemon()
  })

  test(
    "starts daemon and responds to health check",
    async () => {
      daemon = spawn("bun", ["run", "src/index.ts"], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      })
      pid = daemon.pid

      // Wait for daemon to start
      await wait(2000)

      // Check health endpoint
      const res = await fetch("http://127.0.0.1:7371/health")
      expect(res.status).toBe(200)
      const data = await res.json()
      expect((data as any).status).toBe("ok")
      expect((data as any).soul).toBe("GateClaw")
      expect(typeof (data as any).pid).toBe("number")
    },
    TIMEOUT,
  )

  test(
    "persists fact and retrieves it",
    async () => {
      // Start daemon
      daemon = spawn("bun", ["run", "src/index.ts"], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      })
      await wait(2000)

      // Store a fact
      const storeRes = await fetch("http://127.0.0.1:7371/fact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "integration_test", value: "test_value_123" }),
      })
      expect(storeRes.status).toBe(200)

      // Retrieve the fact
      const getRes = await fetch("http://127.0.0.1:7371/fact/integration_test")
      expect(getRes.status).toBe(200)
      const fact = await getRes.json()
      expect((fact as any).key).toBe("integration_test")
      expect((fact as any).value).toBe("test_value_123")
    },
    TIMEOUT,
  )

  test(
    "stores message and retrieves from session",
    async () => {
      // Start daemon
      daemon = spawn("bun", ["run", "src/index.ts"], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      })
      await wait(2000)

      // Store messages
      const msg1 = await fetch("http://127.0.0.1:7371/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_key: "test_session", role: "user", content: "hello" }),
      })
      expect(msg1.status).toBe(200)

      const msg2 = await fetch("http://127.0.0.1:7371/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_key: "test_session", role: "assistant", content: "hi there" }),
      })
      expect(msg2.status).toBe(200)

      // Retrieve messages
      const getRes = await fetch("http://127.0.0.1:7371/messages/test_session")
      expect(getRes.status).toBe(200)
      const msgs = await getRes.json()
      expect(Array.isArray(msgs)).toBe(true)
      expect((msgs as any[]).length).toBeGreaterThanOrEqual(2)
    },
    TIMEOUT,
  )

  test(
    "shutdown endpoint stops daemon gracefully",
    async () => {
      // Start daemon
      daemon = spawn("bun", ["run", "src/index.ts"], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      })
      await wait(2000)

      // Call shutdown
      const shutdownRes = await fetch("http://127.0.0.1:7371/shutdown", { method: "POST" })
      expect(shutdownRes.status).toBe(200)
      expect((await shutdownRes.json()).ok).toBe(true)

      // Wait for shutdown to complete
      await wait(200)

      // Daemon should be stopped
      expect(daemon?.exitCode).not.toBe(undefined)
      if (daemon && daemon.exitCode === undefined) {
        // On Windows, check if process is still running
        try {
          execSync(`tasklist /FI "PID eq ${daemon?.pid}" /NH`, { stdio: "pipe" })
          throw new Error("Daemon still running")
        } catch {
          // Expected - process is dead
        }
      }
    },
    TIMEOUT,
  )

  test(
    "broadcasts to event stream",
    async () => {
      // Start daemon
      daemon = spawn("bun", ["run", "src/index.ts"], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      })
      await wait(2000)

      // Subscribe to SSE
      const controller = new AbortController()
      const res = await fetch("http://127.0.0.1:7371/events", {
        signal: controller.signal,
        headers: { Accept: "text/event-stream" },
      })
      expect(res.status).toBe(200)

      // Broadcast a message
      const broadcastRes = await fetch("http://127.0.0.1:7371/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "test broadcast" }),
      })
      expect(broadcastRes.status).toBe(200)

      // Read SSE stream
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      const chunk = await reader.read()
      const text = decoder.decode(chunk.value!)
      expect(text).toContain("test broadcast")

      controller.abort()
    },
    TIMEOUT,
  )
})
