import { cmd } from "./cmd"
import fs from "fs/promises"
import { Filesystem } from "../../util/filesystem"
import path from "path"
import os from "os"
import { fileURLToPath } from "url"
import matter from "gray-matter"
import { getSoulConfig, getSoulPrompt, getSOULPath } from "../../../../gateclaw-orchestrator/src/soul"

const getPIDPath = () => {
  const appdata = process.env.APPDATA
  const dir = appdata ? path.join(appdata, "gateclaw") : path.join(os.homedir(), ".config", "gateclaw")
  return path.join(dir, "daemon.pid")
}

const getConfigDir = () => {
  const appdata = process.env.APPDATA
  const dir = appdata ? path.join(appdata, "gateclaw") : path.join(os.homedir(), ".config", "gateclaw")
  return dir
}

const isProcessAlive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const startDaemon = async () => {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const orchestratorPath = path.resolve(__dirname, "../../../../gateclaw-orchestrator/src/index.ts")

  const child = Bun.spawn(["bun", "run", orchestratorPath], {
    detached: true,
    stdio: ["ignore", "ignore", "ignore"],
  })

  child.unref()

  console.log("🐾 GateClaw daemon started")
}

const stopDaemon = async () => {
  // First check if it's even running
  try {
    await fetch("http://127.0.0.1:7371/health", { signal: AbortSignal.timeout(2000) })
  } catch {
    console.log("GateClaw daemon is not running")
    return
  }

  // Read PID and kill via taskkill (Windows-safe)
  const pidPath = getPIDPath()
  const pidContent = await Filesystem.readText(pidPath).catch(() => null)
  const pid = pidContent ? Number(pidContent.trim()) : null

  if (pid && !isNaN(pid)) {
    Bun.spawnSync(["taskkill", "/PID", String(pid), "/F"])
  }

  await fs.unlink(pidPath).catch(() => {})
  console.log("🐾 GateClaw daemon stopped")
}


const statusDaemon = async () => {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const response = await fetch("http://127.0.0.1:7371/health", {
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.log("○ GateClaw | not running")
      return
    }

    const data = await response.json() as any
    const uptimeSeconds = Math.floor(data.uptime_ms / 1000)
    console.log(`● GateClaw | soul: ${data.soul} | uptime: ${uptimeSeconds}s | pid: ${data.pid}`)
  } catch {
    console.log("○ GateClaw | not running")
  }
}


const showSoul = async () => {
  const config = getSoulConfig()
  const prompt = getSoulPrompt()

  console.log(`🐾 Soul: ${config.name}`)
  console.log(`Owner: ${config.owner}`)
  console.log(`Personality: ${config.personality}`)
  console.log(`Language: ${config.language}`)
  console.log("---")
  console.log(prompt)
}

const setSoul = async (argv: { key: string; value: string }) => {
  const validKeys = ["name", "owner", "personality", "language"]
  if (!validKeys.includes(argv.key)) {
    console.error(`Invalid key: ${argv.key}. Valid keys: ${validKeys.join(", ")}`)
    process.exit(1)
  }

  const soulPath = getSOULPath()
  const content = await Filesystem.readText(soulPath)
  const result = matter(content)

  const newFrontmatter = {
    ...result.data,
    [argv.key]: argv.value,
  }

  const newContent = matter.stringify(result.content, newFrontmatter)
  await Filesystem.write(soulPath, newContent)

  console.log(`✓ ${argv.key} = ${argv.value}`)
}

const editSoul = async () => {
  const soulPath = getSOULPath()
  const editor = process.env.EDITOR ?? "notepad"

  Bun.spawnSync([editor, soulPath])

  console.log("✓ Soul saved")
}

const installAutoStart = async () => {
  if (process.platform !== "win32") {
    console.log("Auto-start only supported on Windows")
    return
  }

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const orchestratorPath = path.resolve(__dirname, "../../../../gateclaw-orchestrator/src/index.ts")
  const bunPath = process.execPath

  Bun.spawnSync([
    "schtasks",
    "/create",
    "/tn",
    "GateClaw",
    "/tr",
    `"${bunPath}" run "${orchestratorPath}"`,
    "/sc",
    "ONLOGON",
    "/rl",
    "HIGHEST",
    "/f",
  ])

  console.log("✓ GateClaw will start on login")
}

const uninstallAutoStart = async () => {
  if (process.platform !== "win32") {
    console.log("Auto-start only supported on Windows")
    return
  }

  Bun.spawnSync(["schtasks", "/delete", "/tn", "GateClaw", "/f"])

  console.log("✓ Auto-start removed")
}

const reinstallAutoStart = async () => {
  if (process.platform !== "win32") {
    console.log("Auto-start only supported on Windows")
    return
  }

  Bun.spawnSync(["schtasks", "/delete", "/tn", "GateClaw", "/f"])
  Bun.spawnSync([
    "schtasks",
    "/create",
    "/tn",
    "GateClaw",
    "/tr",
    `"${process.execPath}" run "${path.resolve(fileURLToPath(import.meta.url), "../../../../gateclaw-orchestrator/src/index.ts")}"`,
    "/sc",
    "ONLOGON",
    "/rl",
    "HIGHEST",
    "/f",
  ])

  console.log("✓ GateClaw reinstalled")
}

const showSoulPath = async () => {
  console.log(getSOULPath())
}

const buildSoulSubcommand = (yargs: any) =>
  yargs
    .command({
      command: "show",
      describe: "show current soul configuration",
      async handler() {
        await showSoul()
      },
    })
    .command({
      command: "set",
      describe: "update soul frontmatter field",
      builder: (yargs: any) =>
        yargs
          .positional("key", {
            describe: "frontmatter key to update",
            type: "string",
            demandOption: true,
          })
          .positional("value", {
            describe: "new value for the field",
            type: "string",
            demandOption: true,
          }),
      async handler(argv: any) {
        await setSoul(argv as { key: string; value: string })
      },
    })
    .command({
      command: "edit",
      describe: "open SOUL.md in editor",
      async handler() {
        await editSoul()
      },
    })
    .command({
      command: "path",
      describe: "print path to SOUL.md",
      async handler() {
        await showSoulPath()
      },
    })
    .demandCommand()

export const InstallCommand = cmd({
  command: "install",
  describe: "install GateClaw to start on login",
  async handler() {
    await installAutoStart()
  },
})

export const UninstallCommand = cmd({
  command: "uninstall",
  describe: "remove GateClaw auto-start",
  async handler() {
    await uninstallAutoStart()
  },
})

export const DaemonCommand = cmd({
  command: "daemon",
  describe: "manage GateClaw daemon",
  builder: (yargs) =>
    yargs
      .command({
        command: "start",
        describe: "start the GateClaw daemon",
        async handler() {
          await startDaemon()
        },
      })
      .command({
        command: "stop",
        describe: "stop the GateClaw daemon",
        async handler() {
          await stopDaemon()
        },
      })
      .command({
        command: "status",
        describe: "check GateClaw daemon status",
        async handler() {
          await statusDaemon()
        },
      })
      .command({
        command: "install",
        describe: "install GateClaw to start on login",
        async handler() {
          await installAutoStart()
        },
      })
      .command({
        command: "uninstall",
        describe: "remove GateClaw auto-start",
        async handler() {
          await uninstallAutoStart()
        },
      })
      .command({
        command: "reinstall",
        describe: "reinstall GateClaw auto-start",
        async handler() {
          await reinstallAutoStart()
        },
      })
      .command({
        command: "soul",
        describe: "manage GateClaw soul configuration",
        builder: buildSoulSubcommand,
        handler() {},
      })
      .demandCommand(),
  async handler() {},
})

export const SoulCommand = cmd({
  command: "soul",
  describe: "manage GateClaw soul configuration",
  builder: buildSoulSubcommand,
  async handler() {},
})
