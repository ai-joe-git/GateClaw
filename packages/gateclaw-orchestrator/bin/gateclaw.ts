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

function printHelp() {
  console.log(`
  ██████╗  █████╗ ████████╗███████╗ ██████╗██╗      █████╗ ██╗    ██╗
 ██╔════╝ ██╔══██╗╚══██╔══╝██╔════╝██╔════╝██║     ██╔══██╗██║    ██║
 ██║  ███╗███████║   ██║   █████╗  ██║     ██║     ███████║██║ █╗ ██║
 ██║   ██║██╔══██║   ██║   ██╔══╝  ██║     ██║     ██╔══██║██║███╗██║
 ╚██████╔╝██║  ██║   ██║   ███████╗╚██████╗███████╗██║  ██║╚███╔███╔╝
  ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝

  Resident AI. Local Control. Zero Bullshit.

  Usage:
    gateclaw <command> [options]

  Commands:
    start      Start the daemon in background
    stop       Stop the running daemon
    restart    Restart the daemon
    status     Show daemon status and uptime
    logs       Tail live logs (Ctrl+C to stop)
    tui        Launch the TUI (starts daemon if needed)
    run        Run in foreground (dev mode)
    soul       Soul management (init|edit|show|reset)
    telegram   Telegram bot setup (setup|status|test|verify|reset|autoid|info)
    facts      View all memory facts
    fact       Fact operations (store|delete|get)
    history    View message history [session]

  Examples:
    gateclaw start              # Start daemon
    gateclaw status             # Check if running
    gateclaw soul init          # Initialize soul identity
    gateclaw telegram setup     # Configure Telegram bot
    gateclaw fact store mykey "my value"
    gateclaw logs | grep -i error
  `)
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
    console.log(`✅ GateClaw restarted (pid ${child.pid})`)
    break
  }

  case "status": {
    try {
      const res = await fetch("http://127.0.0.1:7371/health")
      const data = (await res.json()) as any
      const pid = readPid()
      console.log(`🟢 GateClaw is ONLINE (pid ${pid ?? "?"})`)
      console.log(`   Soul:    ${data.soul}`)
      console.log(`   Uptime:  ${Math.floor(data.uptime_ms / 1000)}s`)
    } catch {
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
        const { telegram } = await import("../src/commands/telegram")
        await telegram.setup()
        break
      }
      case "status": {
        const { telegram } = await import("../src/commands/telegram")
        await telegram.status()
        break
      }
      case "test": {
        const { telegram } = await import("../src/commands/telegram")
        await telegram.test()
        break
      }
      case "verify": {
        const { telegram } = await import("../src/commands/telegram")
        await telegram.verify()
        break
      }
      case "reset": {
        const { telegram } = await import("../src/commands/telegram")
        await telegram.reset()
        break
      }
      case "autoid": {
        const { telegram } = await import("../src/commands/telegram")
        await telegram.autoid()
        break
      }
      case "info": {
        const { telegram } = await import("../src/commands/telegram")
        await telegram.info()
        break
      }
      default:
        console.log(`🐾 Telegram Commands:
  gateclaw telegram setup   - Interactive bot setup
  gateclaw telegram status  - Show current config
  gateclaw telegram test    - Send test message
  gateclaw telegram verify  - Verify token and chat ID
  gateclaw telegram reset   - Clear configuration
  gateclaw telegram autoid  - Auto-detect chat ID
  gateclaw telegram info    - Quick status check`)
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

  case "run": {
    console.log("🐾 GateClaw running in foreground (dev mode)...")
    spawn("bun", ["run", SRC_INDEX], {
      stdio: "inherit",
      env: { ...process.env },
    })
    break
  }

  default:
    printHelp()
}
