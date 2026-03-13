import { expect, test, describe } from "bun:test"
import { logger, formatError } from "./logger"

describe("logger", () => {
  test("info logs with context", () => {
    expect(() => {
      logger.info("test message", { key: "value" })
    }).not.toThrow()
  })

  test("error logs with error object", () => {
    expect(() => {
      logger.error("error message", { error: "something failed" })
    }).not.toThrow()
  })

  test("warn logs with context", () => {
    expect(() => {
      logger.warn("warning message", { code: "WARN_001" })
    }).not.toThrow()
  })

  test("debug logs with context", () => {
    expect(() => {
      logger.debug("debug message", { detail: "verbose info" })
    }).not.toThrow()
  })

  test("formatError formats Error object", () => {
    const err = new Error("test error")
    const formatted = formatError(err)
    expect(formatted).toContain("test error")
  })

  test("formatError formats string", () => {
    const formatted = formatError("error string")
    expect(formatted).toBe("error string")
  })
})
