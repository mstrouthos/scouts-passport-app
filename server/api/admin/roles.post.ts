import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireTroopLeader } from '../../utils/guard'
import { now } from '../../utils/passcode'

/** Troop leader only: appoint/demote leaders and (re)assign their sector. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const b = await readBody<{ scoutId?: number, role?: string, scope?: string, patrolId?: number }>(event)
  const scoutId = Number(b?.scoutId)
  const db = useDb()
  const target = db.select().from(s.scouts).where(eq(s.scouts.id, scoutId)).get()
  if (!target) throw createError({ statusCode: 404, message: 'Not found' })
  if (target.id === me.id) throw createError({ statusCode: 400, message: 'Change your own role from the database, not the app' })

  const role = ['scout', 'leader', 'troop_leader'].includes(b?.role as any) ? b!.role as any : target.role
  db.update(s.scouts).set({ role }).where(eq(s.scouts.id, scoutId)).run()
  db.delete(s.leaderScopes).where(eq(s.leaderScopes.scoutId, scoutId)).run()
  if (role === 'leader') {
    const scope = ['troop', 'section', 'patrol'].includes(b?.scope as any) ? b!.scope as any : 'troop'
    db.insert(s.leaderScopes).values({
      scoutId, scope,
      sectionId: scope === 'section' ? db.select().from(s.sections).all()[0]?.id ?? null : null,
      patrolId: scope === 'patrol' ? Number(b?.patrolId) || null : null,
      assignedBy: me.id, assignedAt: now()
    }).run()
  }
  return { ok: true }
})
