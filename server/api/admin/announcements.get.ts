import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, rankOf } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = (await useDb())
  const secs = await scopedSectionIds(me)
  const rank = await rankOf(me)
  const sections = new Map((await db.select().from(s.sections)).map(x => [x.id, x]))
  const people = new Map((await db.select().from(s.scouts)).map(x => [x.id, x]))
  return (await db.select().from(s.announcements))
    .filter(a => secs === null || a.createdBy === me.id || (a.sectionId != null && secs.includes(a.sectionId)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30)
    .map(a => {
      const sec = a.sectionId != null ? sections.get(a.sectionId) : null
      const by = people.get(a.createdBy)
      const canApprove = a.status === 'pending' &&
        (rank === 'admin' || (rank === 'archigos' && a.sectionId != null && (secs === null || secs.includes(a.sectionId))))
      return {
        id: a.id, audience: a.audience, textEl: a.textEl, status: a.status,
        sectionEl: sec?.nameEl ?? null, sectionEn: sec?.nameEn ?? null,
        byFirst: by?.firstName ?? '', byLast: by?.lastName ?? '',
        createdAt: a.createdAt, sentAt: a.sentAt, canApprove, mine: a.createdBy === me.id
      }
    })
})
