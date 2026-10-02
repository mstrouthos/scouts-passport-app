import { and, eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds, idParam, sectionOfWith } from '../../../utils/guard'
import { childIdsOfParent } from '../../../utils/parents'
import { targetsOf, touchesSections, targetNames } from '../../../utils/announceTargets'

/** One announcement in full: who sent it and when, and everyone it went to —
    whether the push reached their phone, and whether they have opened it.

    The send itself is recorded per recipient in notification_log (members by
    id, named parents under -1 000 000 − id, parents who never signed in under
    −section id). Opened is read from the bell: a row marked read, or one
    already swept away, which only happens to read ones. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const db = (await useDb())
  const a = (await db.select().from(s.announcements).where(eq(s.announcements.id, id)).limit(1))[0]
  if (!a) throw createError({ statusCode: 404, message: 'Not found' })
  const secs = await scopedSectionIds(me)
  const groups = await db.select().from(s.notifyGroups)
  if (!(secs === null || a.createdBy === me.id || touchesSections(targetsOf(a), secs, groups)))
    throw createError({ statusCode: 403, message: 'Out of your sector' })

  const [log, bells, parentBells, scouts, patrols, sections, parents, links] = await Promise.all([
    db.select().from(s.notificationLog)
      .where(and(eq(s.notificationLog.kind, 'announcement'), eq(s.notificationLog.refId, id))),
    db.select().from(s.notifications)
      .where(and(eq(s.notifications.kind, 'announcement'), eq(s.notifications.refId, id))),
    db.select().from(s.parentNotifications)
      .where(and(eq(s.parentNotifications.kind, 'announcement'), eq(s.parentNotifications.refId, id))),
    db.select().from(s.scouts), db.select().from(s.patrols), db.select().from(s.sections),
    db.select().from(s.parents), db.select().from(s.parentChildren)
  ])
  const person = new Map(scouts.map(x => [x.id, x]))
  const section = new Map(sections.map(x => [x.id, x]))
  const opened = (row: { readAt: string | null } | undefined) =>
    row ? (row.readAt ? { opened: true, openedAt: row.readAt } : { opened: false, openedAt: null })
      : { opened: true, openedAt: null }

  const members = log.filter(l => l.scoutId > 0).map(l => {
    const r = person.get(l.scoutId)
    const sec = r ? sectionOfWith(r as any, patrols) : null
    return {
      id: l.scoutId, firstName: r?.firstName ?? '—', lastName: r?.lastName ?? '',
      firstNameEn: r?.firstNameEn ?? null, lastNameEn: r?.lastNameEn ?? null,
      role: r?.role ?? null, isHidden: !!r?.isHidden, isSender: l.scoutId === a.createdBy,
      sectionEl: sec != null ? section.get(sec)?.nameEl ?? null : null,
      sectionEn: sec != null ? section.get(sec)?.nameEn ?? null : null,
      outcome: l.outcome, error: l.error,
      ...opened(bells.find(b => b.scoutId === l.scoutId))
    }
  })
  const family = log.filter(l => l.scoutId <= -1_000_000).map(l => {
    const pid = -1_000_000 - l.scoutId
    const p = parents.find(x => x.id === pid)
    const kids = p ? childIdsOfParent(p, links).map(k => person.get(k)).filter(Boolean) : []
    return {
      id: pid, name: p?.name ?? '—', children: kids.map(k => `${k!.firstName} ${k!.lastName}`),
      outcome: l.outcome, error: l.error,
      ...opened(parentBells.find(b => b.parentId === pid))
    }
  })
  // parents who never signed in are only reachable as a section's devices
  const unnamedSections = log.filter(l => l.scoutId < 0 && l.scoutId > -1_000_000)
    .map(l => section.get(-l.scoutId)).filter(Boolean).map(x => ({ nameEl: x!.nameEl, nameEn: x!.nameEn }))

  const by = person.get(a.createdBy)
  const approver = a.approvedBy != null && a.approvedBy !== a.createdBy ? person.get(a.approvedBy) : null
  const t = targetsOf(a)
  return {
    id: a.id, textEl: a.textEl, targets: t, targetNames: targetNames(t, sections, groups),
    status: a.status, viaSms: a.viaSms, toParents: a.toParents, parentsOnly: a.parentsOnly,
    createdAt: a.createdAt, sentAt: a.sentAt, scheduledAt: a.scheduledAt, repeat: a.repeat,
    by: by ? `${by.firstName} ${by.lastName}` : '',
    approvedBy: approver ? `${approver.firstName} ${approver.lastName}` : null,
    stats: a.stats ? JSON.parse(a.stats) : null,
    members, parents: family, unnamedSections
  }
})
