import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { scopedSectionIds, rankOf, type SessionScout } from './guard'

/** The sectors whose Βαθμοφόροι a leader belongs to — a poll for a sector
    reaches its Αρχηγός and Υπαρχηγοί alike. */
export async function myLeaderSections(me: SessionScout): Promise<number[]> {
  const db = await useDb()
  const scopes = (await db.select().from(s.leaderScopes)).filter(x => x.scoutId === me.id)
  const patrols = await db.select().from(s.patrols)
  const out = new Set<number>()
  for (const sc of scopes) {
    if (sc.scope === 'section' && sc.sectionId != null) out.add(sc.sectionId)
    if (sc.scope === 'patrol' && sc.patrolId != null) {
      const p = patrols.find(x => x.id === sc.patrolId)
      if (p) out.add(p.sectionId)
    }
  }
  return [...out]
}

/** Polls this leader is being asked. */
export async function pollsFor(me: SessionScout) {
  const db = await useDb()
  const mine = await myLeaderSections(me)
  const troopWide = me.role === 'troop_leader'
  const all = await db.select().from(s.polls)
  const visible = all.filter(p => p.sectionId == null || troopWide || mine.includes(p.sectionId))

  const options = await db.select().from(s.pollOptions)
  const votes = await db.select().from(s.pollVotes)
  const people = await db.select().from(s.scouts)
  const rank = await rankOf(me)

  return visible
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map(p => {
      const opts = options.filter(o => o.pollId === p.id).sort((a, b) => a.idx - b.idx)
      const cast = votes.filter(v => v.pollId === p.id)
      const mineHere = cast.filter(v => v.scoutId === me.id).map(v => v.optionId)
      const voters = new Set(cast.map(v => v.scoutId))
      return {
        id: p.id, questionEl: p.questionEl, sectionId: p.sectionId,
        isMulti: p.isMulti, isClosed: p.isClosed, closesAt: p.closesAt,
        createdAt: p.createdAt,
        // a leader may close or delete what they put, and so may the Αρχηγός Συστήματος
        canManage: p.createdBy === me.id || rank === 'admin',
        myVotes: mineHere,
        voted: mineHere.length > 0,
        voterCount: voters.size,
        options: opts.map(o => {
          const on = cast.filter(v => v.optionId === o.id)
          return {
            id: o.id, textEl: o.textEl, count: on.length,
            // who voted is visible — this is a working group deciding something
            voters: on.map(v => {
              const r = people.find(x => x.id === v.scoutId)
              return r ? { id: r.id, firstName: r.firstName, lastName: r.lastName } : null
            }).filter(Boolean)
          }
        })
      }
    })
}

/** Every Βαθμοφόρος a poll reaches: one sector's, or the whole troop's. */
export async function leadersOfSections(sectionId: number | null): Promise<number[]> {
  const db = await useDb()
  const leaders = (await db.select().from(s.scouts)).filter(r => r.role !== 'scout' && r.isActive)
  if (sectionId == null) return leaders.map(r => r.id)
  const scopes = await db.select().from(s.leaderScopes)
  const patrols = await db.select().from(s.patrols)
  return leaders.filter(l => {
    if (l.role === 'troop_leader') return true
    return scopes.some(sc => sc.scoutId === l.id && (
      (sc.scope === 'troop') ||
      (sc.scope === 'section' && sc.sectionId === sectionId) ||
      (sc.scope === 'patrol' && patrols.find(p => p.id === sc.patrolId)?.sectionId === sectionId)
    ))
  }).map(r => r.id)
}
