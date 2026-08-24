import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { groupsILead } from '../../utils/groupScope'

/** Notification groups the leader may use, with their members. A sector
    leader sees troop-wide groups and their own section's. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = (await useDb())
  const secIds = await scopedSectionIds(me)
  // running a group makes it yours to see, whatever sector it sits in
  const iLead = await groupsILead(me)
  const groups = (await db.select().from(s.notifyGroups))
    .filter(g => secIds === null || g.sectionId == null || secIds.includes(g.sectionId) || iLead.includes(g.id))
    .sort((a, b) => a.nameEl.localeCompare(b.nameEl, 'el'))
  const members = await db.select().from(s.notifyGroupMembers)
  const leaders = await db.select().from(s.notifyGroupLeaders)
  const people = new Map((await db.select().from(s.scouts)).map(r => [r.id, r]))
  const person = (id: number) => {
    const r = people.get(id)
    return r ? {
      id: r.id, firstName: r.firstName, lastName: r.lastName,
      firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn, phone: r.phone
    } : null
  }
  return groups.map(g => ({
    id: g.id, nameEl: g.nameEl, nameEn: g.nameEn, emoji: g.emoji, sectionId: g.sectionId,
    canManage: secIds === null || (g.sectionId != null && secIds.includes(g.sectionId)) || iLead.includes(g.id),
    iLead: iLead.includes(g.id),
    leaders: leaders.filter(l => l.groupId === g.id).map(l => person(l.scoutId)).filter(Boolean),
    members: members.filter(m => m.groupId === g.id).map(m => person(m.scoutId)).filter(Boolean)
  }))
})
