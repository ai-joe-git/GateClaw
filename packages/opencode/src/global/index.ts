import fs from "fs/promises"
import path from "path"
import os from "os"
import { Filesystem } from "../util/filesystem"

const app = "gateclaw"

// Windows: use APPDATA\gateclaw
// Linux/macOS: use XDG_CONFIG_HOME or ~/.config
// Can be overridden via OPENCODE_CONFIG_DIR
const getConfigPath = () => {
  if (process.env.OPENCODE_CONFIG_DIR) {
    return process.env.OPENCODE_CONFIG_DIR
  }
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || os.homedir(), app)
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), app)
}

const getDataPath = () => {
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA || os.homedir(), app)
  }
  return path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"), app)
}

const getCachePath = () => {
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA || os.homedir(), app, "cache")
  }
  return path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"), app)
}

// Windows: use LOCALAPPDATA\gateclaw (not ai.opencode.desktop\gateclaw - that's original OpenCode!)
// Linux/macOS: use XDG_STATE_HOME or ~/.local/state
const state =
  process.platform === "win32"
    ? path.join(process.env.LOCALAPPDATA || os.homedir(), app)
    : process.env.XDG_STATE_HOME
      ? path.join(process.env.XDG_STATE_HOME, app)
      : path.join(os.homedir(), ".local", "state", app)

const data = getDataPath()
const cache = getCachePath()
const config = getConfigPath()

export namespace Global {
  export const Path = {
    // Allow override via OPENCODE_TEST_HOME for test isolation
    get home() {
      return process.env.OPENCODE_TEST_HOME || os.homedir()
    },
    data,
    bin: path.join(data, "bin"),
    log: path.join(data, "log"),
    cache,
    config,
    state,
  }
}

await Promise.all([
  fs.mkdir(Global.Path.data, { recursive: true }),
  fs.mkdir(Global.Path.config, { recursive: true }),
  fs.mkdir(Global.Path.state, { recursive: true }),
  fs.mkdir(Global.Path.log, { recursive: true }),
  fs.mkdir(Global.Path.bin, { recursive: true }),
])

// Debug: log config path on startup
console.log(`[gateclaw/opencode] Config path: ${Global.Path.config}`)
console.log(`[gateclaw/opencode] APPDATA env: ${process.env.APPDATA}`)
console.log(`[gateclaw/opencode] OPENCODE_CONFIG_DIR env: ${process.env.OPENCODE_CONFIG_DIR}`)

const CACHE_VERSION = "21"

const version = await Filesystem.readText(path.join(Global.Path.cache, "version")).catch(() => "0")

if (version !== CACHE_VERSION) {
  try {
    const contents = await fs.readdir(Global.Path.cache)
    await Promise.all(
      contents.map((item) =>
        fs.rm(path.join(Global.Path.cache, item), {
          recursive: true,
          force: true,
        }),
      ),
    )
  } catch (e) {}
  await Filesystem.write(path.join(Global.Path.cache, "version"), CACHE_VERSION)
}
