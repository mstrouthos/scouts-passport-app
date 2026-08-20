import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import * as schema from './schema'
import { DDL, MIGRATIONS } from './ddl'
import { seedIfEmpty } from './seed'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDb() {
  if (_db) return _db
  const cfg = useRuntimeConfig()
  const path = resolve(process.cwd(), cfg.dbPath || './data/passport.db')
  mkdirSync(dirname(path), { recursive: true })
  const sqlite = new Database(path)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.exec(DDL)
  for (const m of MIGRATIONS) { try { sqlite.exec(m) } catch { /* column exists */ } }
  const db = drizzle(sqlite, { schema })
  seedIfEmpty(db)          // throws before caching, so a failed seed retries next request
  _db = db
  return _db
}

export { schema }
