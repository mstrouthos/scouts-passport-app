import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import * as schema from './schema'
import { DDL, MIGRATIONS } from './ddl'
import { seedIfEmpty } from './seed'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDb() {
  if (_db) return _db
  const cfg = useRuntimeConfig()
  const path = resolve(process.cwd(), cfg.dbPath || './data/passport.db')
  const isNew = !existsSync(path)

  // A brand-new database file in production almost always means the /data
  // volume isn't mounted persistently — Docker's `VOLUME /data` silently
  // creates a throwaway anonymous volume, so every redeploy starts empty and
  // reseeds over the real roster. Say so loudly rather than wiping in silence.
  if (isNew && process.env.NODE_ENV === 'production') {
    console.warn(
      `[db] No existing database at ${path} — creating a new, EMPTY one.\n` +
      `[db] If you expected your real roster here, /data is NOT a persistent volume.\n` +
      `[db] Fix it in Coolify: the application -> Storages -> add a volume mounted at /data, then redeploy.`
    )
  } else {
    console.log(`[db] ${path} (${isNew ? 'new' : 'existing'})`)
  }

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
