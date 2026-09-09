import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, sectionOfWith } from '../../utils/guard'
import { assertCan } from '../../utils/permissions'

/** Trashed members this leader may restore: their own sectors', or everyone
    for the Αρχηγός Συστήματος. Each says who trashed them, when, and when the
    cron will remove them for good. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'roster.edit')
  const db = (await useDb())
  const [scouts, patrols, sections] = await Promise.all([
    db.select().from(s.scouts), db.select().from(s.patrols), db.select().from(s.sections)
  ])
  const secIds = await scopedSectionIds(me)
  const byId = new Map(scouts.map(r => [r.id, r]))
  return scouts
    .filter(r => r.deletedAt)
    .filter(r => secIds === null || (() => { const sid = sectionOfWith(r as any, patrols); return sid != null && secIds.includes(sid) })())
    .sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!))
    .map(r => {
      const sid = sectionOfWith(r as any, patrols)
      const who = r.deletedBy != null ? byId.get(r.deletedBy) : null
      return {
        id: r.id, firstName: r.firstName, lastName: r.lastName, firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn,
        role: r.role,
        sectionEl: sections.find(x => x.id === sid)?.nameEl ?? null,
        deletedAt: r.deletedAt,
        deletedBy: who ? `${who.firstName} ${who.lastName}` : null,
        purgeAt: new Date(Date.parse(r.deletedAt!) + 30 * 86400_000).toISOString()
      }
    })
})
