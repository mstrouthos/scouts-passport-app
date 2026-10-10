import { eq, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { faceOf } from '../../utils/face'
import { normalizeAvatar } from '../../../utils/avatar'
import { canPhoto, activePhotoRound, photoWinners } from '../../utils/photoGame'
import { photoThing, PHOTO_TRIES } from '../../../utils/photoGame'
import { cyprusWeekStart } from '../../utils/leaderFun'

/** Φωτογραφικό κυνήγι: the round in play (what to photograph, who has it,
    my tries), the last one, and the week's table. For those who play it, and
    the Αρχηγός Συστήματος, who may also start a round by hand. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const admin = me.role === 'troop_leader'
  // every Βαθμοφόρος sees it; only those who play the games (not «εκτός παρέας») take part
  const db = await useDb()
  const people = await db.select().from(s.scouts)
  const figure = (raw: string | null) => { try { return raw ? normalizeAvatar(JSON.parse(raw)) : null } catch { return null } }
  const face = (id: number) => { const p = people.find(x => x.id === id); return p ? { id: p.id, firstName: p.firstName, lastName: p.lastName, ...faceOf(p), figure: figure(p.avatar) } : null }
  const view = async (r: typeof s.photoRounds.$inferSelect | null | undefined) => {
    if (!r) return null
    const t = photoThing(r.thing)
    const winners = (await photoWinners(r.id)).map(w => ({ ...face(w.scoutId), place: w.place, points: w.points, at: w.createdAt, photo: w.fileId ? `/api/photo-shot/${w.fileId}` : null, me: w.scoutId === me.id }))
    const mine = (await db.select().from(s.photoShots).where(eq(s.photoShots.roundId, r.id))).filter(x => x.scoutId === me.id).sort((a, b) => a.id - b.id)
    return {
      id: r.id, thing: t ? { key: t.key, el: t.el, emoji: t.emoji } : null, startedAt: r.startedAt, endsAt: r.endsAt, endedAt: r.endedAt, byAdmin: !!r.startedBy,
      winners, mine: { tries: mine.length, left: Math.max(0, PHOTO_TRIES - mine.length), won: mine.find(x => x.place) ? { place: mine.find(x => x.place)!.place, points: mine.find(x => x.place)!.points } : null, last: mine.at(-1) ? { ok: mine.at(-1)!.ok, reason: mine.at(-1)!.reason } : null }
    }
  }
  const live = await activePhotoRound()
  const last = live ? null : (await db.select().from(s.photoRounds)).filter(r => r.endedAt).sort((a, b) => b.id - a.id)[0]
  // the week: points from places won
  const week = cyprusWeekStart()
  const rounds = (await db.select().from(s.photoRounds)).filter(r => r.startedAt >= week).map(r => r.id)
  const shots = rounds.length ? (await db.select().from(s.photoShots).where(inArray(s.photoShots.roundId, rounds))).filter(x => x.place) : []
  const tally = new Map<number, { points: number, wins: number }>()
  for (const x of shots) { const t = tally.get(x.scoutId) || { points: 0, wins: 0 }; t.points += x.points; t.wins++; tally.set(x.scoutId, t) }
  const board = [...tally.entries()].map(([id, t]) => ({ ...face(id)!, ...t, me: id === me.id })).filter(r => r.id).sort((a, b) => b.points - a.points)
  return {
    access: true, plays: canPhoto(me), admin, tries: PHOTO_TRIES,
    round: await view(live), last: await view(last),
    week: board.map((r, i) => ({ ...r, place: 1 + board.filter((o, j) => j < i && o.points > r.points).length }))
  }
})
