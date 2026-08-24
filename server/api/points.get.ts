import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout } from '../utils/guard'

/** Where a scout's points came from, newest first.

   Three sources feed the total: answering challenge questions, awards made
   directly to them, and awards made to their whole ενωμοτία. The last kind is
   shown as a team award because that is what it is — and because it follows
   the patrol, so joining a team brings its history with you. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = await useDb()

  const events = new Map((await db.select().from(s.events)).map(e => [e.id, e]))
  const patrols = new Map((await db.select().from(s.patrols)).map(p => [p.id, p]))
  const challenges = new Map((await db.select().from(s.challenges)).map(c => [c.id, c]))

  const items: any[] = []

  for (const a of await db.select().from(s.challengeAnswers).where(eq(s.challengeAnswers.scoutId, me.id))) {
    if (!a.pointsAwarded) continue
    const c = challenges.get(a.challengeId)
    items.push({
      source: 'challenge', points: a.pointsAwarded, at: a.answeredAt,
      titleEl: c?.titleEl ?? 'Πρόκληση', detailEl: 'Σωστή απάντηση'
    })
  }

  const KIND_EL: Record<string, string> = {
    game: 'Παιχνίδι', attendance: 'Παρουσία', uniform: 'Στολή', manual: 'Απονομή'
  }
  for (const w of await db.select().from(s.pointAwards)) {
    const mine = w.scoutId === me.id
    const viaPatrol = !w.scoutId && w.patrolId != null && w.patrolId === me.patrolId
    if (!mine && !viaPatrol) continue
    const ev = w.eventId != null ? events.get(w.eventId) : null
    items.push({
      source: viaPatrol ? 'patrol' : w.kind, points: w.points, at: w.awardedAt,
      titleEl: w.reasonEl || KIND_EL[w.kind] || 'Πόντοι',
      detailEl: [ev?.titleEl, viaPatrol ? patrols.get(w.patrolId!)?.nameEl : null].filter(Boolean).join(' · ') || null,
      kind: w.kind
    })
  }

  items.sort((a, b) => String(b.at).localeCompare(String(a.at)))
  const total = items.reduce((n, i) => n + i.points, 0)

  // a headline per source, so the shape of the total is visible at a glance
  const buckets = ['challenge', 'attendance', 'uniform', 'game', 'patrol', 'manual']
  const summary = buckets.map(key => ({
    key,
    points: items.filter(i => (i.source === 'patrol' ? 'patrol' : i.source) === key)
      .reduce((n, i) => n + i.points, 0),
    count: items.filter(i => (i.source === 'patrol' ? 'patrol' : i.source) === key).length
  })).filter(b => b.count > 0)

  return { total, summary, items }
})
