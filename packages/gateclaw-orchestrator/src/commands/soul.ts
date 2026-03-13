import fs from "node:fs"
import path from "node:path"
import readline from "node:readline"
import { getSoulPrompt, getSOULPath, getSoulConfig, getConfigDir } from "../soul"

const SOUL_PATH = getSOULPath()
const CONFIG_DIR = getConfigDir()

interface SoulConfig {
  name: string
  owner: string
  personality: string
  language: string
}

function ensureConfigDir() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
}

function buildSoulContent(config: SoulConfig): string {
  const frontmatter = `---
name: ${config.name}
owner: ${config.owner}
personality: ${config.personality}
language: ${config.language}
---
`
  const prompt = `You are ${config.name}. You live on this machine.
You have persistent memory. You take initiative.
You are not a chat assistant — you are an AI resident.
Act like it.
`
  return frontmatter + prompt
}

function preview(config: SoulConfig) {
  const content = buildSoulContent(config)
  console.log("\n📋 Preview of SOUL.md:\n")
  console.log("─".repeat(60))
  console.log(content)
  console.log("─".repeat(60))
}

async function prompt(questions: { q: string; default?: string }[]): Promise<string[]> {
  const answers: string[] = []
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise<string[]>((resolve) => {
    let i = 0
    const ask = () => {
      if (i >= questions.length) {
        rl.close()
        resolve(answers)
        return
      }
      const { q, default: def } = questions[i]!
      const hint = def ? ` [${def}]` : ""
      rl.question(`${q}${hint}: `, (answer: string) => {
        answers.push(answer || def || "")
        i++
        ask()
      })
    }
    ask()
  })
}

export async function init() {
  console.log("🧬 GateClaw Soul Initialization\n")

  const existing = fs.existsSync(SOUL_PATH)
  if (existing) {
    console.log("⚠️  SOUL.md already exists at:", SOUL_PATH)
    const current = getSoulPrompt()
    console.log("\nCurrent soul:\n")
    console.log("─".repeat(60))
    console.log(current)
    console.log("─".repeat(60))
  } else {
    ensureConfigDir()
  }

  const answers = await prompt([
    { q: "Soul name", default: "GateClaw" },
    { q: "Owner name", default: "User" },
    { q: "Personality traits", default: "direct, technical, slightly sarcastic" },
    { q: "Primary language", default: "english" },
  ])

  const config: SoulConfig = {
    name: answers[0]!,
    owner: answers[1]!,
    personality: answers[2]!,
    language: answers[3]!,
  }

  preview(config)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  await new Promise<string>((resolve) => {
    rl.question("\nSave this soul? [y/N]: ", (answer: string) => {
      resolve(answer.toLowerCase())
      rl.close()
    })
  }).then((answer) => {
    if (answer !== "y" && answer !== "yes") {
      console.log("❌ Soul creation cancelled")
      process.exit(0)
    }
  })

  const content = buildSoulContent(config)
  fs.writeFileSync(SOUL_PATH, content, "utf8")

  console.log("\n✅ Soul saved to:", SOUL_PATH)
  console.log(`   name: ${config.name}`)
  console.log(`   owner: ${config.owner}`)
  console.log(`   personality: ${config.personality}`)
  console.log(`   language: ${config.language}`)
  console.log("\n🐾 GateClaw ready\n")
}

export async function edit() {
  if (!fs.existsSync(SOUL_PATH)) {
    console.log("⚠️  No SOUL.md found. Run `gateclaw soul init` first.")
    process.exit(1)
  }

  console.log("✏️  Edit Soul (Ctrl+C to cancel)\n")

  const current = getSoulPrompt()
  console.log("Current content:")
  console.log("─".repeat(60))
  console.log(current)
  console.log("─".repeat(60))

  const answers = await prompt([
    { q: "Soul name", default: "GateClaw" },
    { q: "Owner name", default: "User" },
    { q: "Personality traits", default: "direct, technical" },
    { q: "Primary language", default: "english" },
  ])

  const config: SoulConfig = {
    name: answers[0]!,
    owner: answers[1]!,
    personality: answers[2]!,
    language: answers[3]!,
  }

  preview(config)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  await new Promise<string>((resolve) => {
    rl.question("\nOverwrite existing soul? [y/N]: ", (answer: string) => {
      resolve(answer.toLowerCase())
      rl.close()
    })
  }).then((answer) => {
    if (answer !== "y" && answer !== "yes") {
      console.log("❌ Soul edit cancelled")
      process.exit(0)
    }
  })

  ensureConfigDir()
  const content = buildSoulContent(config)
  fs.writeFileSync(SOUL_PATH, content, "utf8")

  console.log("\n✅ Soul updated:", SOUL_PATH)
  console.log(`   name: ${config.name}`)
  console.log(`   owner: ${config.owner}`)
  console.log(`   personality: ${config.personality}`)
  console.log(`   language: ${config.language}`)
}

async function show() {
  if (!fs.existsSync(SOUL_PATH)) {
    console.log("⚠️  No SOUL.md found. Run `gateclaw soul init` first.")
    process.exit(1)
  }

  const content = fs.readFileSync(SOUL_PATH, "utf8")
  const { data } = await import("gray-matter").then((m) => m.default(content))

  console.log("\n🧬 Current Soul:\n")
  console.log(`  name:         ${data.name}`)
  console.log(`  owner:        ${data.owner}`)
  console.log(`  personality:  ${data.personality}`)
  console.log(`  language:     ${data.language}`)
  console.log("\n" + "─".repeat(60))
  console.log(content)
  console.log("─".repeat(60) + "\n")
}

async function reset() {
  if (!fs.existsSync(SOUL_PATH)) {
    console.log("⚠️  No SOUL.md found")
    return
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  await new Promise<string>((resolve) => {
    rl.question("⚠️  This will reset SOUL.md to defaults. Continue? [y/N]: ", (answer: string) => {
      resolve(answer.toLowerCase())
      rl.close()
    })
  }).then((answer) => {
    if (answer !== "y" && answer !== "yes") {
      console.log("❌ Reset cancelled")
      process.exit(0)
    }
  })

  ensureConfigDir()
  const config: SoulConfig = {
    name: "GateClaw",
    owner: "User",
    personality: "direct, technical, slightly sarcastic",
    language: "english",
  }
  const content = buildSoulContent(config)
  fs.writeFileSync(SOUL_PATH, content, "utf8")

  console.log("\n✅ Soul reset to defaults")
}

export { show, reset }
