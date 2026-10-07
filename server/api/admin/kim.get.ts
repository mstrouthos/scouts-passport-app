import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { faceOf } from '../../utils/face'
import { normalizeAvatar } from '../../../utils/avatar'
import { kimDay, kimTray, KIM_VIEW_MS } from '../../../utils/kim'
import { funPaused } from '../../utils/leaderFun'
import { kimPrizes } from '../../utils/kimRewards'

/** Το Ταψί του Κιμ: how today stands. My own play (the tray only once I have
    started — no peeking), today's results, the week's, who dared me and
    whom I dared, and the Βαθμοφόροι I could still dare. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await kimPrizes()
  const db = await useDb()
  const day = kimDay()
  const people = (await db.select().from(s.scouts)).filter(r => r.role !== 'scout' && r.isActive && !r.deletedAt && (!r.isHidden || r.id === me.id))
  const person = (id: number) => people.find(p => p.id === id)
  const figure = (raw: string | null) => { try { return raw ? normalizeAvatar(JSON.parse(raw)) : null } catch { return null } }
  const face = (p: typeof people[number]) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, ...faceOf(p), figure: figure(p.avatar) })

  const weekAgo = new Date(Date.now() - 6 * 86400_000)
  const sinceDay = kimDay(weekAgo)
  const plays = (await db.select().from(s.kimPlays)).filter(p => p.day >= sinceDay && p.answeredAt && person(p.scoutId))
  const todays = plays.filter(p => p.day === day).sort((a, b) => b.correct! - a.correct! || a.ms! - b.ms!)
  const mine = (await db.select().from(s.kimPlays).where(eq(s.kimPlays.scoutId, me.id))).find(p => p.day === day) || null
  const dares = (await db.select().from(s.kimChallenges).where(eq(s.kimChallenges.day, day)))

  // the week: days played and things remembered, most first
  const week = [...new Set(plays.map(p => p.scoutId))].map(id => {
    const ps = plays.filter(p => p.scoutId === id)
    return { ...face(person(id)!), days: ps.length, correct: ps.reduce((n, p) => n + (p.correct || 0), 0) }
  }).sort((a, b) => b.correct - a.correct || b.days - a.days)

  const t = mine ? kimTray(day) : null
  return {
    day, viewMs: KIM_VIEW_MS, paused: await funPaused(),
    mine: mine ? {
      startedAt: mine.startedAt, answered: !!mine.answeredAt, correct: mine.correct, ms: mine.ms,
      picks: mine.picks ? JSON.parse(mine.picks) : null,
      ...t
    } : null,
    today: todays.map(p => ({ ...face(person(p.scoutId)!), correct: p.correct, ms: p.ms, me: p.scoutId === me.id })),
    week,
    // who dared me today, and how they did
    daredBy: dares.filter(d => d.toId === me.id && person(d.fromId)).map(d => {
      const p = todays.find(x => x.scoutId === d.fromId)
      return { ...face(person(d.fromId)!), correct: p?.correct ?? null, ms: p?.ms ?? null }
    }),
    dared: dares.filter(d => d.fromId === me.id).map(d => d.toId),
    // whom I could dare: those who have not played today and have not left the fun
    canDare: people.filter(p => p.id !== me.id && !p.isHidden && p.funPref !== 'off' && !todays.some(x => x.scoutId === p.id)).map(face)
  }
})
