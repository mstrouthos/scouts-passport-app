import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'

/* "Has this person ever actually used the app?" is answered by their session,
   not only by the moment they typed a passcode: someone who signed in before
   we started recording it stays signed in for months and would otherwise read
   as never activated. So stamp lazily on any authenticated request, and write
   at most once an hour per person to keep it off the hot path. */
const THROTTLE_MS = 3600_000

function stale(lastLoginAt: string | null | undefined): boolean {
  if (!lastLoginAt) return true
  const t = Date.parse(lastLoginAt)
  return !Number.isFinite(t) || Date.now() - t > THROTTLE_MS
}

export async function markSeenScout(row: { id: number, firstLoginAt: string | null, lastLoginAt: string | null }) {
  if (!stale(row.lastLoginAt)) return
  const t = new Date().toISOString()
  try {
    const db = await useDb()
    await db.update(s.scouts)
      .set({ lastLoginAt: t, ...(row.firstLoginAt ? {} : { firstLoginAt: t }) })
      .where(eq(s.scouts.id, row.id))
    row.lastLoginAt = t
    if (!row.firstLoginAt) row.firstLoginAt = t
  } catch (err) { console.error('[seen] scout stamp failed', err) }
}

export async function markSeenParent(row: { id: number, firstLoginAt: string | null, lastLoginAt: string | null }) {
  if (!stale(row.lastLoginAt)) return
  const t = new Date().toISOString()
  try {
    const db = await useDb()
    await db.update(s.parents)
      .set({ lastLoginAt: t, ...(row.firstLoginAt ? {} : { firstLoginAt: t }) })
      .where(eq(s.parents.id, row.id))
    row.lastLoginAt = t
    if (!row.firstLoginAt) row.firstLoginAt = t
  } catch (err) { console.error('[seen] parent stamp failed', err) }
}
