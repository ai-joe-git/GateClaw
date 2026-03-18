const { spawnSync } = require("child_process")
const path = require("path")

// Test from C: drive root
const testDir = "C:\\"
const gateclawScript = "C:\\Users\\uscha\\Desktop\\Sandbox\\GateClaw\\packages\\gateclaw-orchestrator\\bin\\gateclaw.ts"

console.log("Testing gateclaw tui from:", testDir)
console.log("Script:", gateclawScript)

const result = spawnSync("bun", [gateclawScript, "tui"], {
  cwd: testDir,
  stdio: "pipe",
  env: { ...process.env },
  timeout: 3000,
})

const output = result.stdout?.toString() || ""
const lines = output.split("\n")
const workingDirLine = lines.find((l) => l.includes("Working directory"))
console.log("\nResult:", workingDirLine || "TUI started (check if working dir is correct)")
