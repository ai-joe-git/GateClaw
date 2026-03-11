import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import matter from "gray-matter"

const getConfigDir = () => {
  const dir = process.env.APPDATA
    ? path.join(process.env.APPDATA, "gateclaw")
    : path.join(os.homedir(), ".config/gateclaw")

  fs.mkdirSync(dir, { recursive: true })
  return dir
}

const getSOULPath = () => path.join(getConfigDir(), "SOUL.md")
const getPIDPath = () => path.join(getConfigDir(), "daemon.pid")
const getLogPath = () => path.join(getConfigDir(), "daily.log")

const defaultSoul = `---
name: GateClaw
owner: User
personality: direct, technical, slightly sarcastic
language: english
---
You are GateClaw. You live on this machine.
You have persistent memory. You take initiative.
You are not a chat assistant — you are an AI resident.
Act like it.
`

let cachedPrompt: string | null = null

const readSoulFile = () => {
  const p = getSOULPath()

  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, defaultSoul, "utf8")
    cachedPrompt = defaultSoul
    return defaultSoul
  }

  const content = fs.readFileSync(p, "utf8")
  cachedPrompt = content
  return content
}

const parseSoul = () => {
  const content = readSoulFile()
  const result = matter(content)
  return {
    data: result.data as { name?: string; owner?: string; personality?: string; language?: string },
    content: result.content,
  }
}

export const getSoulName = () => {
  const { data } = parseSoul()
  return data.name || "GateClaw"
}

export const getSoulConfig = () => {
  const { data } = parseSoul()
  return {
    name: data.name || "GateClaw",
    owner: data.owner || "User",
    personality: data.personality || "direct, technical",
    language: data.language || "english",
  }
}

export const getSoulPrompt = () => {
  const { data, content } = parseSoul()
  const fields = Object.entries(data)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")
  return `${fields}\n\n${content.trim()}`
}

export { getSOULPath, getPIDPath, getLogPath }
