import { describe, it, expect } from "bun:test"
import { preprocessMarkdownForTelegram } from "./formatter.js"

describe("preprocessMarkdownForTelegram", () => {
  it("should escape pipe characters outside code blocks", () => {
    const input = "Result: foo | bar | baz\n```\ncode | not escaped\n```"
    const result = preprocessMarkdownForTelegram(input)
    expect(result).toContain("foo \\| bar \\| baz")
    expect(result).toContain("code | not escaped")
  })

  it("should preserve pipe characters inside fenced code blocks", () => {
    const input = "```\nls -la | grep foo | wc -l\n```"
    const result = preprocessMarkdownForTelegram(input)
    expect(result).toContain("ls -la | grep foo | wc -l")
  })

  it("should escape pipes in block quotes", () => {
    const input = "> This has | pipe | chars"
    const result = preprocessMarkdownForTelegram(input)
    expect(result).toContain("> This has \\| pipe \\| chars")
  })
})
