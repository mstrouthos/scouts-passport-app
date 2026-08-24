import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { assertCan } from '../../utils/permissions'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'events.edit')
  const b = await readBody<any>(event)
  if (!b?.titleEl || !b?.startsAt) throw createError({ statusCode: 400, message: 'Title and start required' })
  const db = (await useDb())
  const secIds = await scopedSectionIds(me)
  let scope = ['troop', 'section', 'patrol', 'leaders'].includes(b.scope) ? b.scope : 'section'
  let sectionId: number | null = b.sectionId != null ? Number(b.sectionId) : null
  let patrolId: number | null = b.patrolId != null ? Number(b.patrolId) : null

  if (scope === 'leaders') {
    sectionId = null; patrolId = null
    if (me.role !== 'troop_leader' && secIds !== null)
      throw createError({ statusCode: 403, message: 'Only the Αρχηγός Συστήματος can add a Βαθμοφόροι event' })
  } else if (scope === 'troop') {
    if (secIds !== null) throw createError({ statusCode: 403, message: 'Troop events are set by the Troop Leader' })
    sectionId = null; patrolId = null
  } else if (scope === 'patrol') {
    const p = (await db.select().from(s.patrols)).find(x => x.id === patrolId)
    if (!p) throw createError({ statusCode: 400, message: 'Bad patrol' })
    if (secIds !== null && !secIds.includes(p.sectionId))
      throw createError({ statusCode: 403, message: 'Out of your sector' })
    sectionId = p.sectionId
  } else {
    if (sectionId == null || !(await db.select().from(s.sections)).some(x => x.id === sectionId))
      throw createError({ statusCode: 400, message: 'Bad section' })
    if (secIds !== null && !secIds.includes(sectionId))
      throw createError({ statusCode: 403, message: 'Out of your sector' })
    patrolId = null
  }

  const [row] = (await db.insert(s.events).values({
    scope, sectionId, patrolId,
    titleEl: String(b.titleEl), titleEn: b.titleEn || null,
    location: b.location || null,
    startsAt: String(b.startsAt), endsAt: b.endsAt || null,
    isAllDay: !!b.isAllDay, tracksAttendance: b.tracksAttendance !== false,
    remindAt: b.remindAt || null, createdBy: me.id
  }).returning())
  return { id: row.id }
})
