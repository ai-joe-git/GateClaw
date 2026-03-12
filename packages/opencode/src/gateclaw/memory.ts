import { Database } from "../storage/db"
import { GCFactTable, GCMessageTable, GCTaskTable } from "./memory.sql"
import { ulid } from "ulid"
import { eq } from "drizzle-orm"

export function saveFact(key: string, value: string) {
  const db = Database.Client()
  const val = value
  return db
    .insert(GCFactTable)
    .values({ id: ulid(), key, value: val })
    .onConflictDoUpdate({
      target: GCFactTable.key,
      set: { value: val, time_updated: Date.now() },
    })
    .run()
}

export function getFact(key: string) {
  const db = Database.Client()
  return db.select().from(GCFactTable).where(eq(GCFactTable.key, key)).limit(1).get()
}

export function getAllFacts() {
  const db = Database.Client()
  return db.select().from(GCFactTable).all()
}

export function deleteFact(key: string) {
  const db = Database.Client()
  return db.delete(GCFactTable).where(eq(GCFactTable.key, key)).run()
}

export function saveMessage(sessionKey: string, role: string, content: string) {
  const db = Database.Client()
  return db.insert(GCMessageTable).values({ id: ulid(), session_key: sessionKey, role, content }).run()
}

export function getMessages(sessionKey: string, limit?: number) {
  const db = Database.Client()
  const query = db.select().from(GCMessageTable).where(eq(GCMessageTable.session_key, sessionKey))
  return limit ? query.limit(limit).all() : query.all()
}

export function saveTask(description: string, intervalMs: number) {
  const db = Database.Client()
  return db
    .insert(GCTaskTable)
    .values({ id: ulid(), description, interval_ms: intervalMs, last_run: null, enabled: 1 })
    .run()
}

export function getAllTasks() {
  const db = Database.Client()
  return db.select().from(GCTaskTable).all()
}
