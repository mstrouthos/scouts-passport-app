import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { rankOf, scopedSectionIds, type SessionScout } from './guard'

/** Groups this leader runs. Being named a group's leader is a grant in its own
    right: whoever runs the band schedules band practice, whatever sector they
    otherwise belong to. */
export async function groupsILead(me: SessionScout): Promise<number[]> {
  const db = await useDb()
  return (await db.select().from(s.notifyGroupLeaders))
    .filter(g => g.scoutId === me.id).map(g => g.groupId)
}

/** Groups a leader may see: theirs to run, plus anything in their sectors, and
    everything for someone with full access. */
export async function visibleGroupIds(me: SessionScout): Promise<number[] | null> {
  const secIds = await scopedSectionIds(me)
  if (secIds === null) return null
  const db = await useDb()
  const mine = await groupsILead(me)
  const inSector = (await db.select().from(s.notifyGroups))
    .filter(g => g.sectionId != null && secIds.includes(g.sectionId))
    .map(g => g.id)
  return [...new Set([...mine, ...inSector])]
}

/** May this leader put an event in this group's diary? */
export async function canScheduleForGroup(me: SessionScout, groupId: number): Promise<boolean> {
  const rank = await rankOf(me)
  if (rank === 'admin') return true
  if ((await groupsILead(me)).includes(groupId)) return true
  // a sector leader may schedule for a group that belongs to their sector
  const secIds = await scopedSectionIds(me)
  if (secIds === null) return true
  const db = await useDb()
  const g = (await db.select().from(s.notifyGroups).where(eq(s.notifyGroups.id, groupId)).limit(1))[0]
  return !!g && g.sectionId != null && secIds.includes(g.sectionId)
}

/** Scouts in a group — who a group event is actually for. */
export async function groupMemberIds(groupId: number): Promise<number[]> {
  const db = await useDb()
  return (await db.select().from(s.notifyGroupMembers))
    .filter(m => m.groupId === groupId).map(m => m.scoutId)
}
