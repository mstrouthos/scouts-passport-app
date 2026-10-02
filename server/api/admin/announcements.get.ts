import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, rankOf } from '../../utils/guard'
import { targetsOf, touchesSections, withinSections, targetNames } from '../../utils/announceTargets'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = (await useDb())
  const secs = await scopedSectionIds(me)
  const rank = await rankOf(me)
  const sectionRows = await db.select().from(s.sections)
  const groups = await db.select().from(s.notifyGroups)
  const people = new Map((await db.select().from(s.scouts)).map(x => [x.id, x]))
  return (await db.select().from(s.announcements))
    .filter(a => secs === null || a.createdBy === me.id || touchesSections(targetsOf(a), secs, groups))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 300)
    .map(a => {
      const t = targetsOf(a)
      const by = people.get(a.createdBy)
      const canApprove = a.status === 'pending' &&
        (rank === 'admin' || (rank === 'archigos' && withinSections(t, secs, groups)))
      return {
        id: a.id, targets: t, targetNames: targetNames(t, sectionRows, groups), textEl: a.textEl, status: a.status,
        viaSms: a.viaSms, toParents: a.toParents, parentsOnly: a.parentsOnly, scheduledAt: a.scheduledAt, repeat: a.repeat,
        byFirst: by?.firstName ?? '', byLast: by?.lastName ?? '',
        createdAt: a.createdAt, sentAt: a.sentAt, canApprove, mine: a.createdBy === me.id
      }
    })
})
