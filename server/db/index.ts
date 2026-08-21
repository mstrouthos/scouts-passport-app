import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'
import { DDL, MIGRATIONS } from './ddl'
import { seedIfEmpty } from './seed'

type Db = ReturnType<typeof drizzle<typeof schema>>

let _pool: pg.Pool | null = null
let _db: Db | null = null
let _ready: Promise<Db> | null = null

/** Postgres connection. The schema is created and seeded once per process;
    every caller awaits that same promise, so no request can run a query
    against a half-built schema. */
export function useDb(): Promise<Db> {
  if (_ready) return _ready
  _ready = init().catch(err => {
    _ready = null   // let the next request retry rather than wedging the process
    throw err
  })
  return _ready
}

async function init(): Promise<Db> {
  const cfg = useRuntimeConfig()
  const connectionString = cfg.databaseUrl || process.env.DATABASE_URL
  if (!connectionString)
    throw new Error('[db] NUXT_DATABASE_URL is not set — point it at your Postgres database.')

  _pool = new pg.Pool({
    connectionString,
    max: 10,
    // Coolify's internal network is plain TCP; managed providers usually need TLS.
    ssl: /[?&]sslmode=(require|verify-full)/.test(connectionString) ? { rejectUnauthorized: false } : undefined
  })
  _pool.on('error', e => console.error('[db] idle client error', e))

  const safeUrl = connectionString.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@')
  console.log(`[db] connecting to ${safeUrl}`)

  await _pool.query(DDL)
  for (const m of MIGRATIONS) {
    try { await _pool.query(m) } catch (e: any) { console.warn('[db] migration skipped:', m, e?.message) }
  }
  // Databases created before is_chief existed have nobody flagged. The office
  // belongs to the founding troop leader, so adopt the earliest one. Idempotent.
  await _pool.query(`UPDATE scouts SET is_chief = TRUE
    WHERE id = (SELECT MIN(id) FROM scouts WHERE role = 'troop_leader')
      AND NOT EXISTS (SELECT 1 FROM scouts WHERE is_chief = TRUE)`)

  _db = drizzle(_pool, { schema })

  // Say exactly which server/database we reached and what is already in it.
  // If a redeploy reports a different host, or 0 scouts when you expect many,
  // the app is pointed at a different (or fresh) database — it never deletes.
  const info = await _pool.query(`SELECT current_database() AS db,
      inet_server_addr()::text AS host, inet_server_port() AS port`)
  const counts = await _pool.query(`SELECT
      (SELECT count(*) FROM scouts)     AS scouts,
      (SELECT count(*) FROM challenges) AS challenges,
      (SELECT count(*) FROM events)     AS events`)
  const { db: dbName, host, port } = info.rows[0]
  const c = counts.rows[0]
  console.log(`[db] server ${host ?? 'local'}:${port} database "${dbName}"`)
  console.log(`[db] existing rows — scouts:${c.scouts} challenges:${c.challenges} events:${c.events}`)

  const empty = Number(c.scouts) === 0
  if (empty && process.env.NODE_ENV === 'production') {
    console.warn(
      `[db] This database is EMPTY, so it is about to be seeded from scratch.\n` +
      `[db] The app never deletes data — if you expected an existing roster here,\n` +
      `[db] it is connected to a different or brand-new database. Check that\n` +
      `[db] NUXT_DATABASE_URL is unchanged and that the Postgres service itself\n` +
      `[db] was not recreated by the deploy.`
    )
  }

  await seedIfEmpty(_db)
  console.log('[db] ready')
  return _db
}

export { schema }
