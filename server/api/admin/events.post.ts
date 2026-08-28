import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { assertCan } from '../../utils/permissions'
import { canScheduleForGroup } from '../../utils/groupScope'
import { leadersForEvent } from '../../utils/rsvp'
import { sendPushTo } from '../../utils/push'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b0 = await readBody<any>(event)
  // whoever runs a group may schedule for it even when they may not create
  // events generally — that is the whole point of naming them its leader
  if (b0?.scope !== 'group') await assertCan(me, 'events.edit')
  const b = b0
  if (!b?.titleEl || !b?.startsAt) throw createError({ statusCode: 400, message: 'Title and start required' })
  const db = (await useDb())
  const secIds = await scopedSectionIds(me)
  let scope = ['troop', 'section', 'patrol', 'leaders', 'group'].includes(b.scope) ? b.scope : 'section'
  let sectionId: number | null = b.sectionId != null ? Number(b.sectionId) : null
  let patrolId: number | null = b.patrolId != null ? Number(b.patrolId) : null
  let groupId: number | null = b.groupId != null ? Number(b.groupId) : null

  if (scope === 'group') {
    if (!Number.isInteger(groupId)) throw createError({ statusCode: 400, message: 'Bad group' })
    const g = (await db.select().from(s.notifyGroups)).find(x => x.id === groupId)
    if (!g) throw createError({ statusCode: 400, message: 'Bad group' })
    if (!(await canScheduleForGroup(me, groupId!)))
      throw createError({ statusCode: 403, message: 'You do not run that group' })
    sectionId = g.sectionId; patrolId = null
  } else if (scope === 'leaders') {
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
    scope, sectionId, patrolId, groupId: scope === 'group' ? groupId : null,
    titleEl: String(b.titleEl), titleEn: b.titleEn || null,
    themeEl: b.themeEl ? String(b.themeEl).slice(0, 200) : null,
    location: b.location || null,
    startsAt: String(b.startsAt), endsAt: b.endsAt || null,
    isAllDay: !!b.isAllDay, tracksAttendance: b.tracksAttendance !== false,
    remindAt: b.remindAt || null, createdBy: me.id
  }).returning())

  // ask the Βαθμοφόροι this concerns whether they are coming — everyone but
  // whoever just created it, who plainly knows
  let asked = 0
  try {
    const ids = (await leadersForEvent(row)).filter(id => id !== me.id)
    if (ids.length) {
      const when = new Date(row.startsAt).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })
      asked = ids.length
      await sendPushTo(ids, {
        title: 'Πύλη Προσκόπων',
        body: `📅 Νέα δράση: ${row.titleEl} (${when}). Θα είσαι εκεί;`,
        kind: 'eventRsvp', refId: row.id
      })
    }
  } catch (err) { console.error('[event] rsvp notification failed', err) }

  return { id: row.id, asked }
})
