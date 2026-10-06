import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { now } from '../../utils/passcode'
import { isOpen } from '../../utils/missions'

/** The leader's missions and the photos waiting for them: the missions of the
    sectors they run (every one, for the troop-wide), newest first, each with
    its counts; and the queue of photos to check, oldest first. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const t = now()
  const secs = await scopedSectionIds(me)
  const mine = (await db.select().from(s.missions))
    .filter(m => secs === null || (m.sectionId != null && secs.includes(m.sectionId)))
  const ids = new Set(mine.map(m => m.id))
  const subs = (await db.select().from(s.missionSubmissions)).filter(x => ids.has(x.missionId))
  const people = new Map((await db.select().from(s.scouts)).map(r => [r.id, r]))
  const sections = new Map((await db.select().from(s.sections)).map(x => [x.id, x]))
  const byId = new Map(mine.map(m => [m.id, m]))
  return {
    // the sectors a mission can be for: those with member logins, that this leader runs
    sections: [...sections.values()].filter(x => x.hasApp && (secs === null || secs.includes(x.id)))
      .sort((a, b) => a.sortOrder - b.sortOrder).map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn })),
    allSections: secs === null,
    missions: mine.sort((a, b) => b.opensAt.localeCompare(a.opensAt)).map(m => ({
      ...m, open: isOpen(m, t), section: m.sectionId ? sections.get(m.sectionId)?.nameEl : null,
      pending: subs.filter(x => x.missionId === m.id && x.status === 'pending').length,
      approved: subs.filter(x => x.missionId === m.id && x.status === 'approved').length
    })),
    queue: subs.filter(x => x.status === 'pending').sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(x => {
      const r = people.get(x.scoutId), m = byId.get(x.missionId)!
      return {
        id: x.id, missionId: m.id, mission: m.titleEl, emoji: m.emoji, points: m.points, description: m.descriptionEl,
        name: r ? `${r.firstName} ${r.lastName}` : `#${x.scoutId}`, note: x.note, createdAt: x.createdAt,
        photo: `/api/missions/photo/${x.id}?v=${x.fileId}`
      }
    })
  }
})
