/** Is this container ready to take traffic?

    Coolify's health check points here. It answers only once the process can
    actually serve — the database included, since the schema is built on the
    first query and a container that cannot reach Postgres is no use even
    though Node is up. While it fails, the proxy keeps sending people to the
    old container, which is what turns a deploy from a visible outage into
    nothing at all.

    Deliberately says nothing about the database beyond up or down: it is
    reachable without signing in. */
import { sql } from 'drizzle-orm'
import { useDb } from '../db'

export default defineEventHandler(async (event) => {
  try {
    await (await useDb()).execute(sql`select 1`)
  } catch {
    setResponseStatus(event, 503)
    return { ok: false }
  }
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { ok: true }
})
