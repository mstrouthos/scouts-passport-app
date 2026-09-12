import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { scopedSectionIds, sectionOfWith, type SessionScout } from './guard'
import { groupsILead } from './groupScope'

type Ev = typeof s.events.$inferSelect

/** Which Βαθμοφόροι hear of an event, and which of them are asked whether
   they are coming. Everyone troop-wide — the Αρχηγός Συστήματος among them —
   is told about every sector's doing, but only the Βαθμοφόροι of that sector
   are asked; an Αρχηγός who is not in the Αγέλη has no business answering
   for its cleaning day. Troop-wide and Βαθμοφόροι events ask everyone. */
async function leadersOf(ev: Ev): Promise<{ told: number[]; asked: number[] }> {
  const db = await useDb()
  const leaders = ((await db.select().from(s.scouts)).filter(r => !r.isHidden)).filter(r => r.role !== 'scout' && r.isActive)
  const scopes = await db.select().from(s.leaderScopes)
  const patrols = await db.select().from(s.patrols)

  const told: number[] = []
  const asked: number[] = []
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
    let ofTheirs = false
    if (ev.scope === 'troop') ofTheirs = true
    // a Βαθμοφόροι meeting: everyone's, or one sector's Βαθμοφόροι alone
    else if (ev.scope === 'leaders') ofTheirs = ev.sectionId == null || sections.has(ev.sectionId)
    else if (ev.scope === 'group' && ev.groupId != null)
      ofTheirs = (await groupsILead(l as any)).includes(ev.groupId)
        || (ev.sectionId != null && sections.has(ev.sectionId))
    else if (ev.sectionId != null) ofTheirs = sections.has(ev.sectionId)
    if (ofTheirs) asked.push(l.id)
    if (ofTheirs || troopWide) told.push(l.id)
  }
  return { told, asked }
}

/** The Βαθμοφόροι an event asks whether they are coming — its own sector's. */
export async function leadersForEvent(ev: Ev): Promise<number[]> {
  return (await leadersOf(ev)).asked
}

/** Everyone who hears of the event: those asked, plus the troop-wide
    Βαθμοφόροι who merely need to know. */
export async function leadersToNotify(ev: Ev): Promise<number[]> {
  return (await leadersOf(ev)).told
}

/** Can this leader answer for this event — i.e. is it one of theirs? */
export async function mayRsvp(me: SessionScout, ev: typeof s.events.$inferSelect): Promise<boolean> {
  return (await leadersForEvent(ev)).includes(me.id)
}

/** The sectors a Βαθμοφόρος belongs to — used to decide whose answers an
    Αρχηγός may read. A troop-wide leader belongs to all of them. */
export async function sectionsOfLeader(scoutId: number): Promise<number[] | null> {
  const db = await useDb()
  const person = ((await db.select().from(s.scouts)).filter(r => !r.isHidden)).find(r => r.id === scoutId)
  if (person?.role === 'troop_leader') return null
  const scopes = (await db.select().from(s.leaderScopes)).filter(x => x.scoutId === scoutId)
  if (scopes.some(x => x.scope === 'troop')) return null
  return scopes.filter(x => x.scope === 'section' && x.sectionId != null).map(x => x.sectionId!)
}
