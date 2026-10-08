import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { faceOf } from '../../utils/face'
import { normalizeAvatar } from '../../../utils/avatar'
import { kimDay } from '../../../utils/kim'

/** Πού είναι ο Βορράς; — whether I have had today's go (and how it went), and
    how everyone did today and this week. */
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

  const today = plays.filter(p => p.day === day).sort((a, b) => b.points! - a.points! || Math.abs(a.error!) - Math.abs(b.error!) || a.ms! - b.ms!)
  const week = [...new Set(plays.map(p => p.scoutId))].map(id => {
    const ps = plays.filter(p => p.scoutId === id)
    return { ...face(person(id)!), days: ps.length, points: ps.reduce((n, p) => n + (p.points || 0), 0), me: id === me.id }
  }).sort((a, b) => b.points - a.points || a.days - b.days)
  return {
    mine: mine && { answered: !!mine.answeredAt, error: mine.error, points: mine.points, ms: mine.ms },
    today: today.map(p => ({ ...face(person(p.scoutId)!), error: p.error, points: p.points, ms: p.ms, me: p.scoutId === me.id })),
    week
  }
})
