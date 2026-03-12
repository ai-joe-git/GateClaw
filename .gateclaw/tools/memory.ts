import { Database } from "bun:sqlite"
import { join } from "path"
import { mkdirSync } from "fs"
import { z } from "zod"

const dir = process.env.APPDATA ? join(process.env.APPDATA, "gateclaw") : join(process.env.HOME ?? "", ".local/share/gateclaw")
mkdirSync(dir, { recursive: true })
const db = new Database(join(dir, "memory.db"), { create: true })
db.run(`CREATE TABLE IF NOT EXISTS gc_fact (id TEXT PRIMARY KEY, key TEXT UNIQUE NOT NULL, value TEXT NOT NULL)`)

export const remember = {
  description: "Save a fact to GateClaw persistent memory",
  args: { key: z.string(), value: z.string() },
  async execute(params) {
    db.run("INSERT INTO gc_fact (id, key, value) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [crypto.randomUUID(), params.key, params.value])
    return `${params.key} = ${params.value}`
  },
}

export const recall = {
  description: "Retrieve facts from GateClaw memory. Use key=* to get all facts.",
  args: { key: z.string() },
  async execute(params) {
    if (params.key === "*") {
      const rows = db.query("SELECT key, value FROM gc_fact").all()
      return rows.map(r => `${r.key}: ${r.value}`).join("\n") || "No facts stored"
    }
    const row = db.query("SELECT value FROM gc_fact WHERE key = ?").get(params.key)
    return row ? `${params.key}: ${row.value}` : `No fact found for: ${params.key}`
  },
}
