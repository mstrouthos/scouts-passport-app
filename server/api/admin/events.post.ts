import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<any>(event)
  if (!b?.titleEl || !b?.startsAt) throw createError({ statusCode: 400, message: 'Title and start required' })
  const db = useDb()
  const secIds = scopedSectionIds(me)
  let scope = ['troop', 'section', 'patrol'].includes(b.scope) ? b.scope : 'section'
  let sectionId: number | null = b.sectionId != null ? Number(b.sectionId) : null
  let patrolId: number | null = b.patrolId != null ? Number(b.patrolId) : null

  if (scope === 'troop') {
    if (secIds !== null) throw createError({ statusCode: 403, message: 'Troop events are set by the Troop Leader' })
    sectionId = null; patrolId = null
  } else if (scope === 'patrol') {
    const p = db.select().from(s.patrols).all().find(x => x.id === patrolId)
    if (!p) throw createError({ statusCode: 400, message: 'Bad patrol' })
    if (secIds !== null && !secIds.includes(p.sectionId))
      throw createError({ statusCode: 403, message: 'Out of your sector' })
    sectionId = p.sectionId
  } else {
    if (sectionId === null || !db.select().from(s.sections).all().some(x => x.id === sectionId))
      throw createError({ statusCode: 400, message: 'Bad section' })
    if (secIds !== null && !secIds.includes(sectionId))
      throw createError({ statusCode: 403, message: 'Out of your sector' })
    patrolId = null
  }

  const [row] = db.insert(s.events).values({
    scope, sectionId, patrolId,
    titleEl: String(b.titleEl), titleEn: b.titleEn || null,
    location: b.location || null,
    startsAt: String(b.startsAt), endsAt: b.endsAt || null,
    isAllDay: !!b.isAllDay, remindAt: b.remindAt || null, createdBy: me.id
  }).returning().all()
  return { id: row.id }
})
