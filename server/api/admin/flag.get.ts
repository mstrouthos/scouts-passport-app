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

  // the week since Monday: 5 to raise, 5 to lower, 2 more for both in one day —
  // and how soon after sunrise / sunset each one got there, at their quickest
  const dow = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7
  const since = new Date(Date.parse(`${day}T12:00:00Z`) - dow * 86400_000).toISOString().slice(0, 10)
  const all = await db.select().from(s.flagDays)
  const after = (iso: string | null, sunIso: string) => iso ? Math.max(0, Math.floor((Date.parse(iso) - Date.parse(sunIso)) / 60000)) : null
  type Tally = { points: number, up: number, down: number, fastUp: number | null, fastDown: number | null }
  const tally = new Map<number, Tally>()
  const add = (id: number | null, pts: number, k?: 'up' | 'down', mins?: number | null) => {
    if (id == null || !people.some(p => p.id === id)) return
    const t = tally.get(id) || { points: 0, up: 0, down: 0, fastUp: null, fastDown: null }
    t.points += pts
    if (k) {
      t[k]++
      const f = k === 'up' ? 'fastUp' : 'fastDown'
      if (mins != null && (t[f] == null || mins < t[f]!)) t[f] = mins
    }
    tally.set(id, t)
  }
  for (const f of all.filter(f => f.day >= since)) {
    const sun = sunTimes(f.day)
    add(f.raisedBy, GAME_RANK.flagRaise, 'up', after(f.raisedAt, sun.rise))
    add(f.loweredBy, GAME_RANK.flagLower, 'down', after(f.loweredAt, sun.set))
    if (f.raisedBy && f.raisedBy === f.loweredBy) add(f.raisedBy, GAME_RANK.flagBoth)
  }
  /* the streak: days in a row on which they raised or lowered it, up to
     today (or yesterday, while today is still to play for) */
  const shift = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400_000).toISOString().slice(0, 10)
  const daysOf = new Map<number, Set<string>>()
  for (const f of all) for (const id of [f.raisedBy, f.loweredBy]) if (id != null) { const set = daysOf.get(id) || new Set(); set.add(f.day); daysOf.set(id, set) }
  const streakOf = (id: number) => {
    const set = daysOf.get(id)
    if (!set) return 0
    let d = set.has(day) ? day : shift(day, -1), n = 0
    while (set.has(d)) { n++; d = shift(d, -1) }
    return n
  }
  const minOf = (k: 'fastUp' | 'fastDown') => Math.min(...[...tally.values()].map(t => t[k] ?? Infinity))
  const earliest = minOf('fastUp'), quickest = minOf('fastDown')
  const week = [...tally.entries()].map(([id, t]) => ({ ...face(people.find(p => p.id === id)!), ...t, me: id === me.id,
    streak: streakOf(id),
    // the week's earliest to raise it after sunrise, and quickest to lower it after sunset
    earlyUp: t.fastUp != null && t.fastUp === earliest, earlyDown: t.fastDown != null && t.fastDown === quickest }))
    .sort((a, b) => b.points - a.points)
  return {
    day, sunrise: sun.rise, sunset: sun.set, now: new Date().toISOString(),
    raised: today?.raisedBy ? { id: today.raisedBy, name: nameOf(today.raisedBy), at: today.raisedAt, after: after(today.raisedAt, sun.rise) } : null,
    lowered: today?.loweredBy ? { id: today.loweredBy, name: nameOf(today.loweredBy), at: today.loweredAt, after: after(today.loweredAt, sun.set) } : null,
    // everyone in the Π: those who play (not «εκτός παρέας»), me among them
    leaders: people.filter(p => p.funPref !== 'off' || p.id === me.id).map(p => ({ ...face(p), me: p.id === me.id })),
    canPlay: me.funPref !== 'off' && !me.isHidden,
    myStreak: streakOf(me.id),
    week: week.map((r, i) => ({ ...r, place: 1 + week.filter((o, j) => j < i && o.points > r.points).length }))
  }
})
