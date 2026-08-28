import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds, idParam } from '../../../utils/guard'
import { canScheduleForGroup } from '../../../utils/groupScope'
import { eventInScope } from '../../../utils/eventScope'
import { assertCan } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'events.edit')
  const id = idParam(event)
  await eventInScope(me, id)
  const b = await readBody<any>(event)
  const db = (await useDb())
  const set: any = {}

  if (b?.titleEl !== undefined) {
    const v = String(b.titleEl).trim()
    if (!v) throw createError({ statusCode: 400, message: 'Title required' })
    set.titleEl = v
  }
  // what the meeting is about, shown to the Αγέλη's families
  if (b?.themeEl !== undefined) set.themeEl = b.themeEl ? String(b.themeEl).slice(0, 200) : null
  if (b?.descriptionEl !== undefined) set.descriptionEl = b.descriptionEl ? String(b.descriptionEl).slice(0, 2000) : null
  if (b?.titleEn !== undefined) set.titleEn = String(b.titleEn || '').trim() || null
  if (b?.location !== undefined) set.location = String(b.location || '').trim() || null
  if (b?.isAllDay !== undefined) set.isAllDay = !!b.isAllDay
  if (b?.tracksAttendance !== undefined) set.tracksAttendance = !!b.tracksAttendance
  for (const k of ['startsAt', 'endsAt', 'remindAt'] as const) {
    if (b?.[k] === undefined) continue
    const v = b[k] ? String(b[k]) : null
    if (v && Number.isNaN(Date.parse(v)))
      throw createError({ statusCode: 400, message: `${k} is not a valid date` })
    if (k === 'startsAt' && !v) throw createError({ statusCode: 400, message: 'Start required' })
    set[k] = v
  }

  // moving an event between sectors follows the same rules as creating one
  if (b?.scope !== undefined || b?.sectionId !== undefined || b?.patrolId !== undefined || b?.groupId !== undefined) {
    const secIds = await scopedSectionIds(me)
    const scope = ['troop', 'section', 'patrol', 'leaders', 'group'].includes(b.scope) ? b.scope : 'section'
    if (scope === 'group') {
      const groupId = Number(b.groupId)
      const g = (await db.select().from(s.notifyGroups)).find(x => x.id === groupId)
      if (!g) throw createError({ statusCode: 400, message: 'Bad group' })
      if (!(await canScheduleForGroup(me, groupId)))
        throw createError({ statusCode: 403, message: 'You do not run that group' })
      set.scope = 'group'; set.groupId = groupId; set.sectionId = g.sectionId; set.patrolId = null
    } else if (scope === 'leaders') {
      if (secIds !== null) throw createError({ statusCode: 403, message: 'Only the Αρχηγός Συστήματος can set a Βαθμοφόροι event' })
      set.scope = 'leaders'; set.sectionId = null; set.patrolId = null; set.groupId = null
    } else if (scope === 'troop') {
      if (secIds !== null) throw createError({ statusCode: 403, message: 'Troop events are set by the Troop Leader' })
      set.scope = 'troop'; set.sectionId = null; set.patrolId = null; set.groupId = null
    } else if (scope === 'patrol') {
      const p = (await db.select().from(s.patrols)).find(x => x.id === Number(b.patrolId))
      if (!p) throw createError({ statusCode: 400, message: 'Bad patrol' })
      if (secIds !== null && !secIds.includes(p.sectionId))
        throw createError({ statusCode: 403, message: 'Out of your sector' })
      set.scope = 'patrol'; set.patrolId = p.id; set.sectionId = p.sectionId; set.groupId = null
    } else {
      const sectionId = Number(b.sectionId)
      if (!(await db.select().from(s.sections)).some(x => x.id === sectionId))
        throw createError({ statusCode: 400, message: 'Bad section' })
      if (secIds !== null && !secIds.includes(sectionId))
        throw createError({ statusCode: 403, message: 'Out of your sector' })
      set.scope = 'section'; set.sectionId = sectionId; set.patrolId = null; set.groupId = null
    }
  }

  if (Object.keys(set).length) await db.update(s.events).set(set).where(eq(s.events.id, id))
  return { ok: true }
})
