import { expect, test, describe } from "bun:test"

describe("commands module exports", () => {
  test("soul commands are exported", async () => {
    const soul = await import("./soul")
    expect(typeof soul.init).toBe("function")
    expect(typeof soul.edit).toBe("function")
    expect(typeof soul.show).toBe("function")
    expect(typeof soul.reset).toBe("function")
  })
})
