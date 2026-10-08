import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { faceOf } from '../../utils/face'
import { normalizeAvatar } from '../../../utils/avatar'
import { kimDay } from '../../../utils/kim'

/** Πού είναι ο Βορράς; — whether I have had today's go (and how it went), and
    how everyone did today and this week, ranked by how far off north they were. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const day = kimDay()
  const people = (await db.select().from(s.scouts)).filter(r => r.role !== 'scout' && r.isActive && !r.deletedAt && (!r.isHidden || r.id === me.id))
  const person = (id: number) => people.find(p => p.id === id)
  const figure = (raw: string | null) => { try { return raw ? normalizeAvatar(JSON.parse(raw)) : null } catch { return null } }
  const face = (p: typeof people[number]) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, ...faceOf(p), figure: figure(p.avatar) })

  // the week since Monday, as the Κιμ counts it
  const dow = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7
  const sinceDay = new Date(Date.parse(`${day}T12:00:00Z`) - dow * 86400_000).toISOString().slice(0, 10)
  const plays = (await db.select().from(s.northPlays)).filter(p => p.day >= sinceDay && p.answeredAt && person(p.scoutId))
  const mine = (await db.select().from(s.northPlays).where(eq(s.northPlays.scoutId, me.id))).find(p => p.day === day) || null

  // ranked by how far off north: fewest degrees first (whole degrees — the
  // same number is the same place), the quicker lock-in first within it
  const off = (p: { error: number | null }) => Math.round(Math.abs(p.error ?? 180))
  const today = plays.filter(p => p.day === day).sort((a, b) => off(a) - off(b) || a.ms! - b.ms!)
  // the week: the average off over the days played; more days first on a tie
  const week = [...new Set(plays.map(p => p.scoutId))].map(id => {
    const ps = plays.filter(p => p.scoutId === id)
    return { ...face(person(id)!), days: ps.length, avg: Math.round(ps.reduce((n, p) => n + Math.abs(p.error ?? 180), 0) / ps.length), points: ps.reduce((n, p) => n + (p.points || 0), 0), me: id === me.id }
  }).sort((a, b) => a.avg - b.avg || b.days - a.days)
  const placed = <T>(list: T[], key: (x: T) => number) => list.map((x, i) => ({ ...x, place: 1 + list.filter((o, j) => j < i && key(o) < key(x)).length }))
  return {
    mine: mine && { answered: !!mine.answeredAt, error: mine.error, points: mine.points, ms: mine.ms },
    today: placed(today.map(p => ({ ...face(person(p.scoutId)!), error: p.error, off: off(p), points: p.points, ms: p.ms, me: p.scoutId === me.id })), x => x.off),
    week: placed(week, x => x.avg)
  }
})
