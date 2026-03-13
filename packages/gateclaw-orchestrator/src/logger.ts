import fs from "node:fs"
import path from "node:path"
import { getLogPath } from "./soul"

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, unknown>
}

const formatLog = (entry: LogEntry): string => {
  return JSON.stringify(entry)
}

const writeLog = (entry: LogEntry) => {
  const line = formatLog(entry)
  console.log(line)
  try {
    fs.appendFileSync(getLogPath(), line + "\n", "utf8")
  } catch {}
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => {
    writeLog({ timestamp: new Date().toISOString(), level: "debug", message, context })
  },
  info: (message: string, context?: Record<string, unknown>) => {
    writeLog({ timestamp: new Date().toISOString(), level: "info", message, context })
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    writeLog({ timestamp: new Date().toISOString(), level: "warn", message, context })
  },
  error: (message: string, context?: Record<string, unknown>) => {
    writeLog({ timestamp: new Date().toISOString(), level: "error", message, context })
  },
}

export const formatError = (err: unknown): string => {
  if (err instanceof Error) {
    return `${err.message}${err.stack ? `\n${err.stack}` : ""}`
  }
  return String(err)
}
