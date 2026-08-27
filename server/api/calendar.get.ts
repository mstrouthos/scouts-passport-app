import { useDb, schema as s } from '../db'
import { requireScout, sectionOf } from '../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = (await useDb())
  const mySection = await sectionOf(me)
  // a band member sees band practice, wherever they otherwise sit
  const myGroups = (await db.select().from(s.notifyGroupMembers))
    .filter(m => m.scoutId === me.id).map(m => m.groupId)
  // A member sees their own sector's programme: the sector's own meetings,
  // their unit's, and any group they belong to. Troop-wide and Βαθμοφόροι
  // events are not theirs to read.
  const rows = (await db.select().from(s.events))
    .filter(e => (e.scope === 'section' && e.sectionId === mySection)
      || (e.scope === 'patrol' && e.patrolId === me.patrolId)
      || (e.scope === 'group' && e.groupId != null && myGroups.includes(e.groupId)))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  return rows.map(e => ({
    id: e.id, scope: e.scope, titleEl: e.titleEl, titleEn: e.titleEn,
    location: e.location, startsAt: e.startsAt, endsAt: e.endsAt, isAllDay: e.isAllDay
  }))
})
