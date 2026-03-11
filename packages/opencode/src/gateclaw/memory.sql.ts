import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../storage/schema.sql"

export const GCFactTable = sqliteTable("gc_fact", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  value: text().notNull(),
  ...Timestamps,
})

export const GCMessageTable = sqliteTable("gc_message", {
  id: text().primaryKey(),
  session_key: text().notNull(),
  role: text().notNull(),
  content: text().notNull(),
  ...Timestamps,
})

export const GCTaskTable = sqliteTable("gc_task", {
  id: text().primaryKey(),
  description: text().notNull(),
  interval_ms: integer().notNull(),
  last_run: integer(),
  enabled: integer().notNull().default(1),
  ...Timestamps,
})
