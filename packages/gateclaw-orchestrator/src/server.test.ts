import { expect, test, describe } from "bun:test"
import { app } from "./server"

describe("HTTP API", () => {
  describe("GET /health", () => {
    test("returns healthy status", async () => {
      const req = new Request("http://localhost:7371/health")
      const res = await app.request(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect((data as any).status).toBe("ok")
      expect((data as any).soul).toBe("GateClaw")
    })
  })

  describe("POST /fact", () => {
    test("stores valid fact", async () => {
      const req = new Request("http://localhost:7371/fact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "test", value: "value" }),
      })
      const res = await app.request(req)
      expect(res.status).toBe(200)
    })

    test("rejects invalid fact", async () => {
      const req = new Request("http://localhost:7371/fact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "only" }),
      })
      const res = await app.request(req)
      expect(res.status).toBe(500)
    })
  })

  describe("POST /message", () => {
    test("stores valid message", async () => {
      const req = new Request("http://localhost:7371/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_key: "s", role: "r", content: "c" }),
      })
      const res = await app.request(req)
      expect(res.status).toBe(200)
    })
  })

  describe("POST /broadcast", () => {
    test("rejects empty message", async () => {
      const req = new Request("http://localhost:7371/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "" }),
      })
      const res = await app.request(req)
      expect(res.status).toBe(500)
    })
  })
})
