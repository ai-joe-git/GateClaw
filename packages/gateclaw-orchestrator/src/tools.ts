import { execSync } from "child_process"
import fs from "node:fs"
import path from "node:path"

export type ToolCall = { tool: string; [key: string]: any }

export const TOOLS_PROMPT = `
TOOLS AVAILABLE — respond with ONLY the JSON, no extra text:

shell_exec:       {"tool":"shell_exec","command":"<cmd command>"}
shell_ps:         {"tool":"shell_ps","command":"<powershell command>"}
read_file:        {"tool":"read_file","path":"<absolute_path>"}
read_file_lines:  {"tool":"read_file_lines","path":"<absolute_path>","from":<line>,"to":<line>}
write_file:       {"tool":"write_file","path":"<absolute_path>","content":"<content>"}
append_file:      {"tool":"append_file","path":"<absolute_path>","content":"<content>"}
delete_file:      {"tool":"delete_file","path":"<absolute_path>"}
move_file:        {"tool":"move_file","from":"<absolute_path>","to":"<absolute_path>"}
file_exists:      {"tool":"file_exists","path":"<absolute_path>"}
list_dir:         {"tool":"list_dir","path":"<absolute_path>"}
search_files:     {"tool":"search_files","path":"<absolute_path>","pattern":"<glob_or_name>"}
http_get:         {"tool":"http_get","url":"<url>"}
http_post:        {"tool":"http_post","url":"<url>","body":{}}
store_fact:       {"tool":"store_fact","key":"<key>","value":"<value>"}
get_fact:         {"tool":"get_fact","key":"<key>"}
delete_fact:      {"tool":"delete_fact","key":"<key>"}
get_all_facts:    {"tool":"get_all_facts"}

SHELL RULES:
- shell_exec uses cmd.exe — supports &&, works for git, bun, node, file ops
- shell_ps uses PowerShell — use only for PS-specific commands (Get-*, Set-*, etc.)
- Prefer shell_exec for everything unless PowerShell is strictly needed

GENERAL RULES:
- Respond with ONLY the raw JSON when calling a tool — no markdown, no explanation
- After receiving the tool result, respond normally in plain English
- For multi-step tasks, chain tool calls one at a time
- CRITICAL: Always respond in English only
`

// ── helpers ───────────────────────────────────────────────────────────────────

function runShell(command: string, shell: string, timeout = 15000): string {
  try {
    const out = execSync(command, { encoding: "utf8", shell, timeout })
    return out?.trim() || "(no output)"
  } catch (e: any) {
    const stderr = e.stderr?.trim()
    const stdout = e.stdout?.trim()
    const parts = [
      stderr && `STDERR: ${stderr}`,
      stdout && `STDOUT: ${stdout}`,
    ].filter(Boolean)
    return `ERROR (exit ${e.status ?? "?"}): ${e.message}\n${parts.join("\n")}`.trim()
  }
}

function stripHtml(html: string, maxLen = 8000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLen)
}

function searchRecursive(dir: string, pattern: string): string[] {
  const results: string[] = []
  const regex = new RegExp(
    pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, "."),
    "i"
  )
  const walk = (current: string) => {
    try {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (regex.test(entry.name)) results.push(full)
      }
    } catch { /* skip inaccessible dirs */ }
  }
  walk(dir)
  return results
}

function normaliseFacts(raw: unknown): Record<string, string> {
  if (Array.isArray(raw)) {
    return Object.fromEntries(
      raw
        .filter((f: any) => f?.key !== undefined)
        .map((f: any) => [String(f.key), String(f.value ?? "")])
    )
  }
  if (raw && typeof raw === "object") return raw as Record<string, string>
  return {}
}

// ── executor ──────────────────────────────────────────────────────────────────

export async function executeTool(call: ToolCall): Promise<string> {
  switch (call.tool) {

    // ── shell ─────────────────────────────────────────────────────────────────

    case "shell_exec":
      return runShell(call.command, "cmd")

    case "shell_ps":
      return runShell(call.command, "powershell")

    // ── filesystem ────────────────────────────────────────────────────────────

    case "read_file":
      try {
        return fs.readFileSync(call.path, "utf8")
      } catch (e: any) { return `ERROR: ${e.message}` }

    case "read_file_lines": {
      try {
        const lines = fs.readFileSync(call.path, "utf8").split("\n")
        const from = Math.max(0, (call.from ?? 1) - 1)
        const to = Math.min(lines.length, call.to ?? lines.length)
        return lines.slice(from, to).join("\n") || "(empty range)"
      } catch (e: any) { return `ERROR: ${e.message}` }
    }

    case "write_file":
      try {
        fs.mkdirSync(path.dirname(call.path), { recursive: true })
        fs.writeFileSync(call.path, call.content, "utf8")
        return `File written: ${call.path}`
      } catch (e: any) { return `ERROR: ${e.message}` }

    case "append_file":
      try {
        fs.mkdirSync(path.dirname(call.path), { recursive: true })
        fs.appendFileSync(call.path, call.content, "utf8")
        return `Appended to: ${call.path}`
      } catch (e: any) { return `ERROR: ${e.message}` }

    case "delete_file":
      try {
        fs.rmSync(call.path, { recursive: true, force: true })
        return `Deleted: ${call.path}`
      } catch (e: any) { return `ERROR: ${e.message}` }

    case "move_file":
      try {
        fs.mkdirSync(path.dirname(call.to), { recursive: true })
        fs.renameSync(call.from, call.to)
        return `Moved: ${call.from} → ${call.to}`
      } catch (e: any) { return `ERROR: ${e.message}` }

    case "file_exists":
      return fs.existsSync(call.path)
        ? `EXISTS: ${call.path}`
        : `NOT FOUND: ${call.path}`

    case "list_dir": {
      try {
        const entries = fs.readdirSync(call.path, { withFileTypes: true })
        return entries
          .map(e => `${e.isDirectory() ? "[DIR] " : "      "}${e.name}`)
          .join("\n") || "(empty directory)"
      } catch (e: any) { return `ERROR: ${e.message}` }
    }

    case "search_files": {
      try {
        const results = searchRecursive(call.path, call.pattern ?? "*")
        return results.length
          ? results.slice(0, 100).join("\n")
          : "No files matched"
      } catch (e: any) { return `ERROR: ${e.message}` }
    }

    // ── http ──────────────────────────────────────────────────────────────────

    case "http_get": {
      try {
        const res = await fetch(call.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; GateClaw/1.0)" },
          signal: AbortSignal.timeout(10000),
        })
        const raw = await res.text()
        const isHtml = raw.trimStart().startsWith("<")
        return isHtml ? stripHtml(raw) : raw.slice(0, 8000)
      } catch (e: any) { return `ERROR: ${e.message}` }
    }

    case "http_post": {
      try {
        const res = await fetch(call.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "GateClaw/1.0",
          },
          body: JSON.stringify(call.body ?? {}),
          signal: AbortSignal.timeout(10000),
        })
        return await res.text()
      } catch (e: any) { return `ERROR: ${e.message}` }
    }

    // ── memory / facts ────────────────────────────────────────────────────────

    case "store_fact": {
      try {
        await fetch("http://127.0.0.1:7371/fact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: call.key, value: call.value }),
        })
        return `Fact stored: ${call.key} = ${call.value}`
      } catch (e: any) { return `ERROR: ${e.message}` }
    }

    case "get_fact": {
      try {
        const res = await fetch(`http://127.0.0.1:7371/fact/${encodeURIComponent(call.key)}`)
        if (res.status === 404) return `Fact not found: ${call.key}`
        const data = await res.json() as { key: string; value: string }
        return `${data.key} = ${data.value}`
      } catch (e: any) { return `ERROR: ${e.message}` }
    }

    case "delete_fact": {
      try {
        await fetch("http://127.0.0.1:7371/fact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: call.key, value: "" }),
        })
        return `Fact cleared: ${call.key}`
      } catch (e: any) { return `ERROR: ${e.message}` }
    }

    case "get_all_facts": {
      try {
        const res = await fetch("http://127.0.0.1:7371/facts")
        const facts = normaliseFacts(await res.json())
        const entries = Object.entries(facts)
        return entries.length
          ? entries.map(([k, v]) => `${k} = ${v}`).join("\n")
          : "(no facts stored)"
      } catch (e: any) { return `ERROR: ${e.message}` }
    }

    default:
      return `Unknown tool: ${call.tool}`
  }
}
