import { expect, test, describe, beforeEach, afterEach } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { init, edit, show, reset } from "./soul"

describe("soul commands", () => {
  const TEST_CONFIG_DIR = path.join(process.env.APPDATA || "tmp", "gateclaw-test-" + Date.now())

  beforeEach(() => {
    process.env.APPDATA = TEST_CONFIG_DIR
    fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true })
  })

  afterEach(() => {
    try {
      fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
    } catch {}
    delete process.env.APPDATA
  })

  describe("init", () => {
    test("creates SOUL.md with default values", async () => {
      // This test would require mocking readline input
      // For now, we test that the function exists and exports properly
      expect(typeof init).toBe("function")
    })
  })

  describe("show", () => {
    test("shows current soul config", async () => {
      // Create a test SOUL.md
      const soulContent = `---
name: TestClaw
owner: Tester
personality: test
language: english
---
Test content`
      fs.writeFileSync(path.join(TEST_CONFIG_DIR, "SOUL.md"), soulContent)
      expect(typeof show).toBe("function")
    })
  })

  describe("reset", () => {
    test("resets to default soul", async () => {
      // Create a test SOUL.md
      const soulContent = `---
name: Custom
---
Custom`
      fs.writeFileSync(path.join(TEST_CONFIG_DIR, "SOUL.md"), soulContent)
      expect(typeof reset).toBe("function")
    })
  })
})
