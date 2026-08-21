import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, scopedScouts } from '../../utils/guard'

/** Notification groups the leader may use, with their members. A sector
    leader sees troop-wide groups and their own section's. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = (await useDb())
  const secIds = await scopedSectionIds(me)
  const groups = (await db.select().from(s.notifyGroups))
    .filter(g => secIds === null || g.sectionId == null || secIds.includes(g.sectionId))
    .sort((a, b) => a.nameEl.localeCompare(b.nameEl, 'el'))
  const members = await db.select().from(s.notifyGroupMembers)
  const people = new Map((await db.select().from(s.scouts)).map(r => [r.id, r]))
  return groups.map(g => ({
    id: g.id, nameEl: g.nameEl, nameEn: g.nameEn, emoji: g.emoji, sectionId: g.sectionId,
    canManage: secIds === null || (g.sectionId != null && secIds.includes(g.sectionId)),
    members: members.filter(m => m.groupId === g.id).map(m => {
      const r = people.get(m.scoutId)
      return r ? {
        id: r.id, firstName: r.firstName, lastName: r.lastName,
        firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn, phone: r.phone
      } : null
    }).filter(Boolean)
  }))
})
