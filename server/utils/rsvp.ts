import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { scopedSectionIds, sectionOfWith, type SessionScout } from './guard'
import { groupsILead } from './groupScope'

/** Which Βαθμοφόροι an event actually concerns, and so who is asked whether
   they are coming. Asking every leader about every sector's meeting would
   make the question worth ignoring. */
export async function leadersForEvent(ev: typeof s.events.$inferSelect): Promise<number[]> {
  const db = await useDb()
  const leaders = (await db.select().from(s.scouts)).filter(r => r.role !== 'scout' && r.isActive)
  const scopes = await db.select().from(s.leaderScopes)
  const patrols = await db.select().from(s.patrols)

  const out: number[] = []
  for (const l of leaders) {
    const mine = scopes.filter(x => x.scoutId === l.id)
    const troopWide = l.role === 'troop_leader' || mine.some(x => x.scope === 'troop')
    const sections = new Set<number>()
    for (const sc of mine) {
      if (sc.scope === 'section' && sc.sectionId != null) sections.add(sc.sectionId)
      if (sc.scope === 'patrol' && sc.patrolId != null) {
        const p = patrols.find(x => x.id === sc.patrolId)
        if (p) sections.add(p.sectionId)
      }
    }
    let relevant = false
    if (ev.scope === 'troop' || ev.scope === 'leaders') relevant = true
    else if (ev.scope === 'group' && ev.groupId != null)
      relevant = troopWide || (await groupsILead(l as any)).includes(ev.groupId)
        || (ev.sectionId != null && sections.has(ev.sectionId))
    else if (ev.sectionId != null) relevant = troopWide || sections.has(ev.sectionId)
    if (relevant) out.push(l.id)
  }
  return out
}

/** Can this leader answer for this event — i.e. is it one of theirs? */
export async function mayRsvp(me: SessionScout, ev: typeof s.events.$inferSelect): Promise<boolean> {
  return (await leadersForEvent(ev)).includes(me.id)
}
