import { useDb, schema as s } from '../../db'
import { requireLeader, scopedPatrolIds } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<any>(event)
  if (!b?.titleEl || !b?.startsAt) throw createError({ statusCode: 400, message: 'Title and start required' })
  const pids = scopedPatrolIds(me)
  const scope = ['troop', 'section', 'patrol'].includes(b.scope) ? b.scope : 'troop'
  if (pids !== null) {
    if (scope !== 'patrol' || !pids.includes(Number(b.patrolId)))
      throw createError({ statusCode: 403, message: 'You can only create events for your own patrol' })
  }
  const db = useDb()
  const sec = db.select().from(s.sections).all()[0]
  const [row] = db.insert(s.events).values({
    scope, sectionId: scope === 'section' ? sec.id : null,
    patrolId: scope === 'patrol' ? Number(b.patrolId) : null,
    titleEl: String(b.titleEl), titleEn: b.titleEn || null,
    location: b.location || null,
    startsAt: String(b.startsAt), endsAt: b.endsAt || null,
    isAllDay: !!b.isAllDay, remindAt: b.remindAt || null, createdBy: me.id
  }).returning().all()
  return { id: row.id }
})
