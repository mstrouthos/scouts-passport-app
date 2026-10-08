import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { faceOf } from '../../utils/face'
import { normalizeAvatar } from '../../../utils/avatar'
import { kimDay } from '../../../utils/kim'
import { sunTimes } from '../../../utils/sun'
import { shortName } from '../../../utils/shortName'
import { GAME_RANK } from '../../../utils/games'

/** Έπαρση Σημαίας — today's sunrise and sunset (Larnaca), whether the flag is
    up and who raised and lowered it, everyone standing around the pole, and
    this week's table (Monday on). No notifications: remembering is the game. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const day = kimDay()
  const sun = sunTimes(day)
  const people = (await db.select().from(s.scouts)).filter(r => r.role !== 'scout' && r.isActive && !r.deletedAt && (!r.isHidden || r.id === me.id))
  const figure = (raw: string | null) => { try { return raw ? normalizeAvatar(JSON.parse(raw)) : null } catch { return null } }
  const face = (p: typeof people[number]) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, ...faceOf(p), figure: figure(p.avatar) })
  const nameOf = (id: number | null) => id == null ? null : shortName(people.find(p => p.id === id)) || '—'
  const today = (await db.select().from(s.flagDays).where(eq(s.flagDays.day, day)))[0]

  // the week since Monday: 5 to raise, 5 to lower, 2 more for both in one day
  const dow = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7
  const since = new Date(Date.parse(`${day}T12:00:00Z`) - dow * 86400_000).toISOString().slice(0, 10)
  const tally = new Map<number, { points: number, up: number, down: number }>()
  const add = (id: number | null, pts: number, k?: 'up' | 'down') => {
    if (id == null || !people.some(p => p.id === id)) return
    const t = tally.get(id) || { points: 0, up: 0, down: 0 }
    t.points += pts; if (k) t[k]++; tally.set(id, t)
  }
  for (const f of (await db.select().from(s.flagDays)).filter(f => f.day >= since)) {
    add(f.raisedBy, GAME_RANK.flagRaise, 'up'); add(f.loweredBy, GAME_RANK.flagLower, 'down')
    if (f.raisedBy && f.raisedBy === f.loweredBy) add(f.raisedBy, GAME_RANK.flagBoth)
  }
  const week = [...tally.entries()].map(([id, t]) => ({ ...face(people.find(p => p.id === id)!), ...t, me: id === me.id }))
    .sort((a, b) => b.points - a.points)
  return {
    day, sunrise: sun.rise, sunset: sun.set, now: new Date().toISOString(),
    raised: today?.raisedBy ? { id: today.raisedBy, name: nameOf(today.raisedBy), at: today.raisedAt } : null,
    lowered: today?.loweredBy ? { id: today.loweredBy, name: nameOf(today.loweredBy), at: today.loweredAt } : null,
    // everyone in the Π: those who play (not «εκτός παρέας»), me among them
    leaders: people.filter(p => p.funPref !== 'off' || p.id === me.id).map(p => ({ ...face(p), me: p.id === me.id })),
    canPlay: me.funPref !== 'off' && !me.isHidden,
    week: week.map((r, i) => ({ ...r, place: 1 + week.filter((o, j) => j < i && o.points > r.points).length }))
  }
})
