import readline from "node:readline"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"

interface Fact {
  key: string
  value: string
}

async function prompt(question: string, options?: { default?: string }): Promise<string> {
  return new Promise<string>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    const hint = options?.default ? ` [${options.default}]` : ""
    rl.question(`${question}${hint}: `, (answer: string) => {
      rl.close()
      resolve(answer || options?.default || "")
    })
  })
}

async function storeFact(key: string, value: string) {
  try {
    const res = await fetch("http://127.0.0.1:7371/fact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    })
    if (res.ok) {
      console.log(`✅ Fact stored: ${key}`)
    } else {
      console.error("❌ Failed to store fact")
    }
  } catch {
    console.error("🔴 GateClaw daemon not running")
    process.exit(1)
  }
}

async function deleteFact(key: string) {
  try {
    const res = await fetch(`http://127.0.0.1:7371/fact/${key}`, {
      method: "DELETE",
    })
    if (res.ok) {
      console.log(`✅ Fact deleted: ${key}`)
    } else {
      console.error("❌ Fact not found")
    }
  } catch {
    console.error("🔴 GateClaw daemon not running")
    process.exit(1)
  }
}

async function getFact(key: string) {
  try {
    const res = await fetch(`http://127.0.0.1:7371/fact/${key}`)
    if (res.ok) {
      const fact = (await res.json()) as Fact
      console.log(`${fact.key}: ${fact.value}`)
    } else {
      console.error("❌ Fact not found")
    }
  } catch {
    console.error("🔴 GateClaw daemon not running")
    process.exit(1)
  }
}

export async function fact(argv: string[]) {
  const subcmd = argv[0]
  switch (subcmd) {
    case "store": {
      if (argv.length < 3) {
        console.log(`📝 Usage: gateclaw fact store <key> <value>`)
        process.exit(1)
      }
      await storeFact(argv[1]!, argv[2]!)
      break
    }
    case "delete": {
      if (!argv[1]) {
        console.log("📝 Usage: gateclaw fact delete <key>")
        process.exit(1)
      }
      await deleteFact(argv[1])
      break
    }
    case "get": {
      if (!argv[1]) {
        console.log("📝 Usage: gateclaw fact get <key>")
        process.exit(1)
      }
      await getFact(argv[1])
      break
    }
    default:
      console.log(`🧠 Fact Commands:
  gateclaw fact store <key> <value>  - Store a new fact
  gateclaw fact delete <key>         - Delete a fact
  gateclaw fact get <key>            - Get a fact by key`)
  }
}
