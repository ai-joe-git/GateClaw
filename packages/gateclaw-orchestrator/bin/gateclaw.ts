#!/usr/bin/env bun
import fs from "node:fs"
import path from "node:path"
import { execSync, spawn, spawnSync } from "child_process"
import { CLI_PID_FILE, CLI_LOG_FILE, SRC_INDEX } from "../src/soul"

const PKG_DIR = path.resolve(import.meta.dir, "..")

const cmd = process.argv[2]

function readPid(): number | null {
  try {
    return parseInt(fs.readFileSync(CLI_PID_FILE, "utf8").trim(), 10)
  } catch {
    return null
  }
}

function isRunning(pid: number): boolean {
  try {
    if (process.platform === "win32") {
      execSync(`tasklist /FI "PID eq ${pid}" /NH`, { stdio: "pipe" })
      return true
    } else {
      process.kill(pid, 0)
      return true
    }
  } catch {
    return false
  }
}

async function checkStatus(retries = 5, delayMs = 500): Promise<any | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch("http://127.0.0.1:7371/health", { signal: AbortSignal.timeout(1000) })
      if (res.ok) return await res.json()
    } catch {
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  return null
}

function printHelp() {
  const blue = "\x1b[36m"
  const green = "\x1b[32m"
  const yellow = "\x1b[33m"
  const reset = "\x1b[0m"
  const bold = "\x1b[1m"

  console.log(`${blue}`)
  console.log(`  ██████╗  █████╗ ████████╗███████╗ ██████╗██╗      █████╗ ██╗    ██╗`)
  console.log(` ██╔════╝ ██╔══██╗╚══██╔══╝██╔════╝██╔════╝██║     ██╔══██╗██║    ██║`)
  console.log(` ██║  ███╗███████║   ██║   █████╗  ██║     ██║     ███████║██║ █╗ ██║`)
  console.log(` ██║   ██║██╔══██║   ██║   ██╔══╝  ██║     ██║     ██╔══██║██║███╗██║`)
  console.log(` ╚██████╔╝██║  ██║   ██║   ███████╗╚██████╗███████╗██║  ██║╚███╔███╔╝`)
  console.log(`  ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝${reset}`)
  console.log()
  console.log(`${bold}Resident AI. Local Control. Zero Bullshit.${reset}`)
  console.log()
  console.log(`${yellow}Usage:${reset}`)
  console.log(`  gateclaw <command> [options]`)
  console.log()
  console.log(`${yellow}Commands:${reset}`)
  console.log(`  ${green}start      ${reset}Start the daemon in background`)
  console.log(`  ${green}stop       ${reset}Stop the running daemon`)
  console.log(`  ${green}restart    ${reset}Restart the daemon`)
  console.log(`  ${green}status     ${reset}Show daemon status and uptime`)
  console.log(`  ${green}logs       ${reset}Tail live logs (Ctrl+C to stop)`)
  console.log(`  ${green}web        ${reset}Open browser UI (starts daemon if needed)`)
  console.log(`  ${green}tui        ${reset}Launch the TUI (starts daemon if needed)`)
  console.log(`  ${green}run        ${reset}Run in foreground (dev mode)`)
  console.log(`  ${green}upgrade    ${reset}Check and install updates (interactive)`)
  console.log(`  ${green}soul       ${reset}Soul management (init|edit|show|reset)`)
  console.log(`  ${green}telegram   ${reset}Telegram bot (setup|start|stop|status)`)
  console.log(`  ${green}facts      ${reset}View all memory facts`)
  console.log(`  ${green}fact       ${reset}Fact operations (store|delete|get)`)
  console.log(`  ${green}history    ${reset}View message history [session]`)
  console.log(`  ${green}models     ${reset}List AI models (interactive)`)
  console.log(`  ${green}export     ${reset}Export sessions to JSON/MD (interactive)`)
  console.log(`  ${green}agentmon   ${reset}Pokémon Red AI (register|start|act|status|save|load|stop)`)
  console.log()
  console.log(`${yellow}Examples:${reset}`)
  console.log(`  gateclaw start              # Start daemon`)
  console.log(`  gateclaw status             # Check if running`)
  console.log(`  gateclaw upgrade            # Check for updates`)
  console.log(`  gateclaw web                # Open browser UI`)
  console.log(`  gateclaw tui                # Launch terminal UI`)
  console.log(`  gateclaw soul init          # Initialize soul identity`)
  console.log(`  gateclaw telegram setup     # Interactive bot setup`)
  console.log(`  gateclaw telegram start     # Start Telegram bot`)
  console.log(`  gateclaw models             # List AI models`)
  console.log(`  gateclaw export gateclaw    # Export session`)
  console.log(`  gateclaw fact store mykey "my value"`)
  console.log(`  gateclaw agentmon start     # Start Pokémon game`)
  console.log(`  gateclaw agentmon act up    # Send action`)
  console.log(`  gateclaw logs | grep -i error`)
  console.log()
}

switch (cmd) {
  case "start": {
    const existing = readPid()
    if (existing && isRunning(existing)) {
      console.log(`✅ GateClaw already running (pid ${existing})`)
      process.exit(0)
    }
    console.log("🐾 Starting GateClaw daemon...")
    const child = spawn("bun", ["run", SRC_INDEX], {
      detached: true,
      stdio: ["ignore", fs.openSync(CLI_LOG_FILE, "a"), fs.openSync(CLI_LOG_FILE, "a")],
      env: { ...process.env },
    })
    child.unref()
    fs.writeFileSync(CLI_PID_FILE, String(child.pid), "utf8")
    console.log(`✅ GateClaw started (pid ${child.pid})`)
    console.log(`📋 Logs: gateclaw logs`)
    break
  }

  case "stop": {
    let pid = readPid()

    // Try HTTP shutdown first - get actual PID from health endpoint
    try {
      const res = await fetch("http://127.0.0.1:7371/health")
      if (res.ok) {
        const data = (await res.json()) as { pid: number }
        pid = data.pid

        // Try the shutdown endpoint
        const shutdownRes = await fetch("http://127.0.0.1:7371/shutdown", { method: "POST" })
        if (shutdownRes.ok) {
          console.log("🛑 GateClaw stopped (via HTTP)")
          fs.rmSync(CLI_PID_FILE, { force: true })
          process.exit(0)
        }
      }
    } catch {
      // No HTTP endpoint available
    }

    // Fall back to PID file method
    if (!pid || !isRunning(pid)) {
      console.log("⚠️  GateClaw is not running")
      fs.rmSync(CLI_PID_FILE, { force: true })
      process.exit(0)
    }

    // Kill the process
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "pipe" })
      } catch {
        process.kill(pid, "SIGTERM")
      }
    } else {
      process.kill(pid)
    }
    fs.rmSync(CLI_PID_FILE, { force: true })
    console.log(`🛑 GateClaw stopped (pid ${pid})`)
    break
  }

  case "restart": {
    const pid = readPid()
    if (pid && isRunning(pid)) {
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "pipe" })
        } catch {
          // ignore if already dead
        }
      } else {
        try {
          process.kill(pid)
        } catch {}
      }
      fs.rmSync(CLI_PID_FILE, { force: true })
      console.log(`🛑 Stopped (pid ${pid})`)
    }
    await new Promise((r) => setTimeout(r, 500))
    const child = spawn("bun", ["run", SRC_INDEX], {
      detached: true,
      stdio: ["ignore", fs.openSync(CLI_LOG_FILE, "a"), fs.openSync(CLI_LOG_FILE, "a")],
      env: { ...process.env },
    })
    child.unref()
    fs.writeFileSync(CLI_PID_FILE, String(child.pid), "utf8")

    // Wait for daemon to be ready
    const ready = await checkStatus()
    if (ready) {
      console.log(`✅ GateClaw restarted (pid ${child.pid})`)
    } else {
      console.log(`⚠️  GateClaw started (pid ${child.pid}) but health check failed`)
    }
    break
  }

  case "status": {
    const data = await checkStatus()
    if (data) {
      const pid = readPid()
      console.log(`🟢 GateClaw is ONLINE (pid ${pid ?? "?"})`)
      console.log(`   Soul:    ${data.soul}`)
      console.log(`   Uptime:  ${Math.floor(data.uptime_ms / 1000)}s`)
    } else {
      console.log("🔴 GateClaw is OFFLINE")
    }
    break
  }

  case "logs": {
    console.log(`📋 Tailing ${CLI_LOG_FILE} (Ctrl+C to stop)\n`)
    try {
      execSync(`tail -f "${CLI_LOG_FILE}"`, { stdio: "inherit", shell: "cmd" })
    } catch {
      let size = 0
      setInterval(() => {
        try {
          const stat = fs.statSync(CLI_LOG_FILE)
          if (stat.size > size) {
            const buf = Buffer.alloc(stat.size - size)
            const fd = fs.openSync(CLI_LOG_FILE, "r")
            fs.readSync(fd, buf, 0, buf.length, size)
            fs.closeSync(fd)
            process.stdout.write(buf.toString("utf8"))
            size = stat.size
          }
        } catch {}
      }, 500)
    }
    break
  }

  case "web": {
    const ROOT = path.resolve(PKG_DIR, "..", "..")

    try {
      await fetch("http://127.0.0.1:7371/health")
    } catch {
      console.log("🐾 Daemon not running, starting it first...")
      const child = spawn("bun", ["run", SRC_INDEX], {
        detached: true,
        stdio: ["ignore", fs.openSync(CLI_LOG_FILE, "a"), fs.openSync(CLI_LOG_FILE, "a")],
        env: { ...process.env },
      })
      child.unref()
      fs.writeFileSync(CLI_PID_FILE, String(child.pid), "utf8")
      await new Promise((r) => setTimeout(r, 1500))
    }

    console.log("🌐 Opening GateClaw Web UI in browser...")
    spawnSync("bun", ["run", "--cwd", path.join(ROOT, "packages", "opencode"), "src/index.ts", "web"], {
      stdio: "inherit",
      env: { ...process.env },
      cwd: ROOT,
    })
    break
  }

  case "tui": {
    const ROOT = path.resolve(PKG_DIR, "..", "..")

    try {
      await fetch("http://127.0.0.1:7371/health")
    } catch {
      console.log("🐾 Daemon not running, starting it first...")
      const child = spawn("bun", ["run", SRC_INDEX], {
        detached: true,
        stdio: ["ignore", fs.openSync(CLI_LOG_FILE, "a"), fs.openSync(CLI_LOG_FILE, "a")],
        env: { ...process.env },
      })
      child.unref()
      fs.writeFileSync(CLI_PID_FILE, String(child.pid), "utf8")
      await new Promise((r) => setTimeout(r, 1500))
    }

    console.log("🖥️  Launching GateClaw TUI...")
    spawnSync(
      "bun",
      ["run", "--cwd", path.join(ROOT, "packages", "opencode"), "--conditions=browser", "src/index.ts"],
      {
        stdio: "inherit",
        env: { ...process.env },
        cwd: ROOT,
      },
    )
    break
  }

  case "soul": {
    const subcmd = process.argv[3]
    switch (subcmd) {
      case "init": {
        const { init } = await import("../src/commands/soul")
        await init()
        break
      }
      case "edit": {
        const { edit } = await import("../src/commands/soul")
        await edit()
        break
      }
      case "show": {
        const { show } = await import("../src/commands/soul")
        await show()
        break
      }
      case "reset": {
        const { reset } = await import("../src/commands/soul")
        await reset()
        break
      }
      default:
        console.log(`🧬 Soul Commands:
  gateclaw soul init   - Create/initialize SOUL.md interactively
  gateclaw soul edit   - Edit existing SOUL.md
  gateclaw soul show   - Display current SOUL.md
  gateclaw soul reset  - Reset to default soul`)
    }
    break
  }

  case "telegram": {
    const subcmd = process.argv[3]
    switch (subcmd) {
      case "setup": {
        console.log("🐾 GateClaw Telegram Setup\n")
        const readline = await import("node:readline")
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

        const ask = (q: string): Promise<string> => new Promise((resolve) => rl.question(q + " ", resolve))

        console.log("Step 1: Create your bot")
        console.log("  1. Message @BotFather on Telegram")
        console.log("  2. Send: /newbot")
        console.log("  3. Choose a name (e.g., GateClawBot)")
        console.log("  4. Copy the API token\n")

        const token = await ask("Paste your token:")
        if (!token) {
          console.log("❌ No token provided")
          rl.close()
          process.exit(1)
        }

        console.log("\nVerifying token...")
        const botRes = await fetch(`https://api.telegram.org/bot${token}/getMe`)
        const botData = (await botRes.json()) as any
        if (!botData.ok) {
          console.log("❌ Invalid token")
          rl.close()
          process.exit(1)
        }
        console.log(`✅ Bot: @${botData.result.username}`)

        console.log("\nStep 2: Activate your bot")
        console.log("  1. Search for @${botData.result.username} on Telegram")
        console.log("  2. Click START or send /start")
        console.log("  3. I'll auto-detect your chat ID\n")

        console.log("Getting your chat ID...")
        const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`)
        const updatesData = (await updatesRes.json()) as any
        let chatId =
          updatesData.result?.length > 0
            ? String(updatesData.result[updatesData.result.length - 1].message?.chat?.id)
            : null

        if (chatId) {
          console.log(`✅ Chat ID auto-detected: ${chatId}`)
        } else {
          console.log("⚠️  No chat updates found yet")
          const manualId = await ask("Enter your chat ID (or press Enter to retry):")
          if (manualId) {
            chatId = manualId
          } else {
            const retryRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`)
            const retryData = (await retryRes.json()) as any
            chatId =
              retryData.result?.length > 0
                ? String(retryData.result[retryData.result.length - 1].message?.chat?.id)
                : null
          }
        }

        if (!chatId) {
          console.log("\nTo get your chat ID:")
          console.log("  1. Message your bot with any text")
          console.log("  2. Visit: https://api.telegram.org/bot<TOKEN>/getUpdates")
          console.log("  3. Look for 'chat':{'id':NUMBER}")
          const manualId = await ask("Enter your chat ID:")
          chatId = manualId || null
        }

        if (!chatId) {
          console.log("❌ No chat ID provided")
          rl.close()
          process.exit(1)
        }

        // Save to GateClaw config directory
        const configDir = process.env.APPDATA
          ? require("node:path").join(process.env.APPDATA, "gateclaw")
          : require("node:path").join(require("node:os").homedir(), ".config", "gateclaw")
        const fs = await import("node:fs")
        fs.mkdirSync(configDir, { recursive: true })
        const envPath = require("node:path").join(configDir, ".env")
        fs.writeFileSync(envPath, `GATECLAW_TELEGRAM_TOKEN="${token}"\nGATECLAW_TELEGRAM_CHAT_ID="${chatId}"\n`)

        console.log("\n✅ Telegram configured!")
        console.log(`   Config saved to: ${envPath}`)

        // Test message
        const testRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🐾 GateClaw configured!\nToken: saved\nChat ID: ${chatId}\nStatus: ready`,
            parse_mode: "Markdown",
          }),
        })
        if (testRes.ok) {
          console.log("✅ Welcome message sent to your Telegram!")
        }

        rl.close()
        console.log("\nRestart daemon: gateclaw restart")
        break
      }
      case "start": {
        console.log("🐾 Starting Telegram bot...")
        const { startBotApp } = await import("../src/telegram-bot/app/start-bot-app.js")
        await startBotApp()
        break
      }
      case "stop": {
        console.log("🛑 Stopping Telegram bot...")
        const { processManager } = await import("../src/telegram-bot/process/manager.js")
        if (processManager.isRunning()) {
          const { success } = await processManager.stop()
          if (success) {
            console.log("✅ Telegram bot stopped")
          } else {
            console.log("⚠️  Failed to stop Telegram bot")
          }
        } else {
          console.log("ℹ️  Telegram bot not running")
        }
        break
      }
      case "status":
        {
          console.log("📊 Telegram Bot Status\n")

          // Check daemon health
          try {
            const daemonRes = await fetch("http://127.0.0.1:7371/health")
            const daemonData = (await daemonRes.json()) as any

            console.log(`Daemon: ${daemonData.status === "ok" ? "🟢 Online" : "🔴 Offline"}`)
            console.log(`  Soul: ${daemonData.soul || "unknown"}`)
            console.log(`  Uptime: ${Math.floor((daemonData.uptime_ms || 0) / 1000)}s`)
          } catch {
            console.log("Daemon: 🔴 Offline")
            console.log("\n💡 Start daemon: gateclaw start")
            break
          }

          // Check Telegram configuration
          const configDir = process.env.APPDATA
            ? require("node:path").join(process.env.APPDATA, "gateclaw")
            : require("node:path").join(require("node:os").homedir(), ".config", "gateclaw")
          const fs = require("node:fs")
          const envPath = require("node:path").join(configDir, ".env")

          let tokenConfigured = false
          let chatIdConfigured = false

          if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, "utf8")
            tokenConfigured = !!envContent.match(/GATECLAW_TELEGRAM_TOKEN="([^"]+)"/)
            chatIdConfigured = !!envContent.match(/GATECLAW_TELEGRAM_CHAT_ID="(\d+)"/)
          }

          console.log("\nTelegram Configuration:")
          console.log(`  Token: ${tokenConfigured ? "✅ Configured" : "❌ Not set"}`)
          console.log(`  Chat ID: ${chatIdConfigured ? "✅ Configured" : "❌ Not set"}`)

          // Bot status inference
          if (tokenConfigured && chatIdConfigured) {
            console.log("\nBot Status: 🟢 Running (in-process with daemon)")
            console.log("  The bot runs inside the daemon process")
            console.log("  Test: Message your bot on Telegram")
          } else if (!tokenConfigured) {
            console.log("\nBot Status: ⚠️  Not configured")
            console.log("  Run: gateclaw telegram setup")
          } else if (!chatIdConfigured) {
            console.log("\nBot Status: ⚠️  Incomplete setup")
            console.log("  Run: gateclaw telegram setup")
          }

          console.log("\n" + "─".repeat(50))
          console.log("💡 Commands:")
          console.log("   gateclaw telegram setup   - Configure bot")
          console.log("   gateclaw restart          - Restart daemon + bot")
        }
        break
      default:
        console.log(`🐾 Telegram Commands:
  gateclaw telegram setup   - Interactive bot setup (NEW!)
  gateclaw telegram start   - Start Telegram bot
  gateclaw telegram stop    - Stop Telegram bot
  gateclaw telegram status  - Show bot status`)
    }
    break
  }

  case "facts": {
    const res = await fetch("http://127.0.0.1:7371/facts")
    if (!res.ok) {
      console.log("🔴 GateClaw daemon not running")
      process.exit(1)
    }
    const facts = (await res.json()) as any[]
    if (facts.length === 0) {
      console.log("🧠 No facts stored")
    } else {
      console.log(`🧠 ${facts.length} fact(s):\n`)
      facts.forEach((f) => console.log(`  ${f.key}: ${f.value}`))
    }
    break
  }

  case "fact": {
    const subcmd = process.argv[3] || ""
    const args = process.argv.slice(4)
    const { fact } = await import("../src/commands/fact")
    await fact([subcmd, ...args])
    break
  }

  case "history": {
    const session = process.argv[3] || "default"
    const res = await fetch(`http://127.0.0.1:7371/messages/${session}`)
    if (!res.ok) {
      console.log("🔴 GateClaw daemon not running")
      process.exit(1)
    }
    const msgs = (await res.json()) as any[]
    if (msgs.length === 0) {
      console.log("📜 No messages in session:", session)
    } else {
      console.log(`📜 ${msgs.length} message(s) in session "${session}":\n`)
      msgs.forEach((m) => console.log(`  [${m.role}] ${m.content.slice(0, 60)}${m.content.length > 60 ? "..." : ""}`))
    }
    break
  }

  case "models": {
    console.log("\n  ███╗   ███╗███████╗███╗   ██╗██╗  ██╗")
    console.log("  ████╗ ████║██╔════╝████╗  ██║██║  ██║")
    console.log("  ██╔████╔██║█████╗  ██╔██╗ ██║██║  ██║")
    console.log("  ██║╚██╔╝██║██╔══╝  ██║╚██╗██║██║  ██║")
    console.log("  ██║ ╚═╝ ██║███████╗██║ ╚████║███████║")
    console.log("  ╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝╚══════╝\n")

    try {
      const res = await fetch("http://127.0.0.1:7371/models")
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const response = (await res.json()) as any
      const data = response.data || response || []

      console.log(`📊 Available Models (${data.length} total)\n`)
      console.log("─".repeat(70))

      if (data.length === 0) {
        console.log("ℹ️  No models configured")
        console.log("\n💡 Configure models in gateclaw.json or via TUI")
      } else {
        const providers = new Map<string, any[]>()
        data.forEach((m: any) => {
          if (!providers.has(m.providerID)) {
            providers.set(m.providerID, [])
          }
          providers.get(m.providerID)!.push(m)
        })

        for (const [providerId, models] of providers) {
          console.log(`\n🤖 ${providerId}`)
          console.log("─".repeat(40))
          models.forEach((m: any, i: number) => {
            const icon = i === 0 ? "★" : "○"
            console.log(`  ${icon} ${m.modelID}`)
          })
        }

        console.log("\n" + "─".repeat(70))
        console.log("\n💡 Use in TUI: /model <provider>/<model>")
        console.log("   Example: /model gateclaw/big-pickle")
      }
    } catch (e: any) {
      console.log("🔴 GateClaw daemon not running")
      console.log("   Start with: gateclaw start")
      console.log("\n💡 Models are managed by the daemon")
      console.log(`\nError: ${e.message}`)
    }
    break
  }

  case "export": {
    console.log("\n  ██████╗ ██╗   ██╗███████╗██████╗ ██╗   ██╗")
    console.log("  ██╔══██╗╚██╗ ██╔╝██╔════╝██╔══██╗██║   ██║")
    console.log("  ██████╔╝ ╚████╔╝ █████╗  ██████╔╝██║   ██║")
    console.log("  ██╔══██╗  ╚██╔╝  ██╔══╝  ██╔══██╗██║   ██║")
    console.log("  ██████╔╝   ██║   ███████╗██║  ██║╚██████╔╝")
    console.log("  ╚═════╝    ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝\n")

    const session = process.argv[3]
    const format = process.argv[4] || "markdown"

    if (!session) {
      console.log("📝 Usage: gateclaw export <session> [format]")
      console.log("   Formats: markdown, json")
      console.log("\n💡 Available sessions:")
      console.log("   gateclaw - Main session (default)")
      console.log("\n📁 Export to current directory")
      process.exit(1)
    }

    try {
      const res = await fetch(`http://127.0.0.1:7371/messages/${session}`)
      if (!res.ok) throw new Error("Daemon not running")
      const msgs = (await res.json()) as any[]

      if (msgs.length === 0) {
        console.log(`📜 No messages in session: ${session}`)
        process.exit(1)
      }

      const timestamp = new Date().toISOString().replace(/:/g, "-").slice(0, 19)
      const filename = `${session}-${timestamp}.${format === "json" ? "json" : "md"}`
      const filepath = path.join(process.cwd(), filename)

      console.log(`📦 Exporting ${msgs.length} messages...`)

      let content: string
      if (format === "json") {
        content = JSON.stringify(msgs, null, 2)
      } else {
        content = `# GateClaw Export: ${session}\n\n`
        content += `Exported: ${new Date().toISOString()}\n\n`
        content += `Messages: ${msgs.length}\n\n`
        content += "─".repeat(60) + "\n\n"
        msgs.forEach((m: any, i: number) => {
          content += `## Message ${i + 1} (${m.role})\n\n`
          content += `${m.content}\n\n`
          content += "─".repeat(40) + "\n\n"
        })
      }

      fs.writeFileSync(filepath, content)
      console.log(`✅ Exported to: ${filepath}`)
      console.log(`   Format: ${format}`)
      console.log(`   Messages: ${msgs.length}`)
      console.log(`   Size: ${(Buffer.byteLength(content) / 1024).toFixed(2)} KB`)
    } catch (e: any) {
      console.log("🔴 GateClaw daemon not running")
      console.log("   Start with: gateclaw start")
      console.log("\nError:", e.message)
    }
    break
  }

  case "agentmon": {
    const subcmd = process.argv[3]
    const args = process.argv.slice(4)
    switch (subcmd) {
      case "register": {
        console.log("🎮 Registering AgentMon agent...")
        const { registerAgentMon } = await import("../../opencode/src/agentmon/command.js")
        await registerAgentMon()
        break
      }
      case "start": {
        const starter = args[0] as "charmander" | "bulbasaur" | "squirtle" | undefined
        console.log("🎮 Starting Pokémon game...")
        const { startGame } = await import("../../opencode/src/agentmon/command.js")
        await startGame(starter)
        break
      }
      case "act": {
        if (!args[0]) {
          console.log("📝 Usage: gateclaw agentmon act <action>")
          console.log("Valid actions: up, down, left, right, a, b, start, select, pass")
          process.exit(1)
        }
        const { act } = await import("../../opencode/src/agentmon/command.js")
        await act(args[0])
        break
      }
      case "status": {
        const { getStatus } = await import("../../opencode/src/agentmon/command.js")
        await getStatus()
        break
      }
      case "save": {
        const label = args[0]
        const { saveGame } = await import("../../opencode/src/agentmon/command.js")
        await saveGame(label)
        break
      }
      case "load": {
        if (!args[0]) {
          console.log("📝 Usage: gateclaw agentmon load <saveId>")
          process.exit(1)
        }
        console.log("🎮 Loading saved game...")
        const { startGame } = await import("../../opencode/src/agentmon/command.js")
        const { getFact } = await import("../../opencode/src/gateclaw/memory.js")
        const apiKeyFact = await getFact("agentmon_api_key")
        if (!apiKeyFact?.value) {
          console.log("🔴 AgentMon API key not found")
          process.exit(1)
        }
        const { PokemonAgent } = await import("../../opencode/src/agentmon/agent.js")
        const agent = new PokemonAgent(apiKeyFact.value, { displayName: "GateClaw" })
        await agent.initialize()
        await agent.loadSave(args[0])
        console.log("✅ Game loaded")
        break
      }
      case "stop": {
        const { stopGame } = await import("../../opencode/src/agentmon/command.js")
        await stopGame()
        break
      }
      default:
        console.log(`🎮 AgentMon Commands:
  gateclaw agentmon register [name]     - Register new agent
  gateclaw agentmon start [starter]     - Start new game (charmander/bulbasaur/squirtle)
  gateclaw agentmon act <action>        - Send action (up/down/left/right/a/b/start/select/pass)
  gateclaw agentmon status              - Show game status
  gateclaw agentmon save [label]        - Save current game
  gateclaw agentmon load <saveId>       - Load saved game
  gateclaw agentmon stop                - Stop session`)
    }
    break
  }

  case "run": {
    console.log("🐾 GateClaw running in foreground (dev mode)...")
    spawn("bun", ["run", SRC_INDEX], {
      stdio: "inherit",
      env: { ...process.env },
    })
    break
  }

  case "upgrade": {
    console.log("\n  ██████╗ ██╗   ██╗███╗   ██╗ ██████╗ ██╗   ██╗███╗   ███╗")
    console.log("  ██╔══██╗██║   ██║████╗  ██║██╔═══██╗██║   ██║████╗ ████║")
    console.log("  ██████╔╝██║   ██║██╔██╗ ██║██║   ██║██║   ██║██╔████╔██║")
    console.log("  ██╔══██╗██║   ██║██║╚██╗██║██║   ██║██║   ██║██║╚██╔╝██║")
    console.log("  ██║  ██║╚██████╔╝██║ ╚████║╚██████╔╝╚██████╔╝██║ ╚═╝ ██║")
    console.log("  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚═╝     ╚═╝\n")

    const { execSync } = await import("child_process")
    const fs = await import("node:fs")
    const path = await import("node:path")

    console.log("🔍 Checking for updates...\n")

    try {
      // Get current version
      const pkgPath = path.join(PKG_DIR, "package.json")
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
      const currentVersion = pkg.version || "unknown"
      console.log(`Current version: ${currentVersion}`)

      // Check npm for latest version
      const npmOutput = execSync("npm view gateclaw-orchestrator version 2>nul || echo latest", {
        encoding: "utf8",
      }).trim()
      const latestVersion = npmOutput

      console.log(`Latest version:  ${latestVersion}`)

      if (currentVersion === latestVersion || currentVersion === "unknown") {
        console.log("\n✅ GateClaw is up to date!")
        console.log("\n💡 Tip: Run 'gateclaw upgrade --force' to force reinstall")
      } else {
        console.log("\n🆕 New version available!")
        console.log(`   ${currentVersion} → ${latestVersion}`)

        const readline = await import("node:readline")
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

        const answer = await new Promise<string>((resolve) => {
          rl.question("\n📦 Upgrade now? [y/N] ", resolve)
        })

        if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
          console.log("\n⬇️  Upgrading GateClaw...")
          console.log("   This may take a minute...\n")

          try {
            execSync("bun install -g gateclaw-orchestrator", { stdio: "inherit" })
            console.log("\n✅ Upgrade complete!")
            console.log("\n🔄 Restart daemon: gateclaw restart")
          } catch (e: any) {
            console.log("\n❌ Upgrade failed")
            console.log("   Try: bun install -g gateclaw-orchestrator")
          }
        } else {
          console.log("\nℹ️  Upgrade cancelled")
        }

        rl.close()
      }
    } catch (e: any) {
      console.log("⚠️  Could not check for updates")
      console.log("   Error:", e.message)
      console.log("\n💡 Manual upgrade: bun install -g gateclaw-orchestrator")
    }
    break
  }

  default:
    printHelp()
}
