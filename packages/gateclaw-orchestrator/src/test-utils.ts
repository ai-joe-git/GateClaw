import { expect, test, describe } from "bun:test"

/**
 * Simple promise-based wait helper
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if a process is running
 */
export function isRunning(pid: number): boolean {
  try {
    if (process.platform === "win32") {
      // Windows - use tasklist
      const { execSync } = require("child_process")
      execSync(`tasklist /FI "PID eq ${pid}" /NH`, { stdio: "pipe" })
      return true
    } else {
      // Unix - use kill 0
      process.kill(pid, 0)
      return true
    }
  } catch {
    return false
  }
}

/**
 * Read PID from file
 */
export function readPidFile(filePath: string): number | null {
  try {
    const content = require("node:fs").readFileSync(filePath, "utf8").trim()
    return parseInt(content, 10)
  } catch {
    return null
  }
}

/**
 * Cleanup test database
 */
export function cleanupTestDB(): void {
  const path = require("node:path")
  const fs = require("node:fs")
  const os = require("node:os")
  const testDB = path.join(os.tmpdir(), "gateclaw-test.db")
  try {
    fs.rmSync(testDB, { force: true })
  } catch {}
}
