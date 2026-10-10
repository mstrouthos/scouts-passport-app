import { eq, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { faceOf } from '../../utils/face'
import { normalizeAvatar } from '../../../utils/avatar'
import { canPhoto, activePhotoRound } from '../../utils/photoGame'
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
    const shots = (await db.select().from(s.photoShots).where(eq(s.photoShots.roundId, r.id))).sort((a, b) => a.id - b.id)
    const mine = shots.filter(x => x.scoutId === me.id)
    const won = mine.find(x => x.place)
    const ended = !!r.endedAt
    const photo = (x: typeof shots[number]) => x.fileId ? `/api/photo-shot/${x.fileId}` : null
    return {
      id: r.id, thing: t ? { key: t.key, el: t.el, emoji: t.emoji } : null, startedAt: r.startedAt, endsAt: r.endsAt, endedAt: r.endedAt, byAdmin: !!r.startedBy,
      // how many have played so far — who, and the places, only once it is over
      played: new Set(shots.map(x => x.scoutId)).size,
      winners: ended ? shots.filter(x => x.place).sort((a, b) => a.place! - b.place!).map(w => ({ ...face(w.scoutId), place: w.place, points: w.points, at: w.createdAt, photo: photo(w), me: w.scoutId === me.id })) : [],
      // every photo kept, after the places, in the order they came
      gallery: ended ? shots.filter(x => !x.place && x.fileId).map(x => ({ ...face(x.scoutId), at: x.createdAt, photo: photo(x), me: x.scoutId === me.id })) : [],
      mine: {
        tries: mine.length, left: mine.some(x => x.ok || !x.judged) ? 0 : Math.max(0, PHOTO_TRIES - mine.length),
        won: won ? { place: won.place, points: won.points } : null,
        kept: !won && mine.some(x => x.ok || !x.judged),
        last: mine.at(-1) ? { ok: mine.at(-1)!.ok, reason: mine.at(-1)!.reason } : null
      }
    }
  }
  const live = await activePhotoRound()
  const last = live ? null : (await db.select().from(s.photoRounds)).filter(r => r.endedAt).sort((a, b) => b.id - a.id)[0]
  // the week: points from places won
  const week = cyprusWeekStart()
  // (only rounds that are over: till then the places are hidden)
  const rounds = (await db.select().from(s.photoRounds)).filter(r => r.startedAt >= week && r.endedAt).map(r => r.id)
  const shots = rounds.length ? (await db.select().from(s.photoShots).where(inArray(s.photoShots.roundId, rounds))).filter(x => x.place) : []
  const tally = new Map<number, { points: number, wins: number }>()
  for (const x of shots) { const t = tally.get(x.scoutId) || { points: 0, wins: 0 }; t.points += x.points; t.wins++; tally.set(x.scoutId, t) }
  const board = [...tally.entries()].map(([id, t]) => ({ ...face(id)!, ...t, me: id === me.id })).filter(r => r.id).sort((a, b) => b.points - a.points)
  return {
    access: true, plays: canPhoto(me), admin, tries: PHOTO_TRIES,
    // the video that explains it, opened by itself until it has been seen
    video: canPhoto(me) && !me.photoVideoSeen,
    round: await view(live), last: await view(last),
    week: board.map((r, i) => ({ ...r, place: 1 + board.filter((o, j) => j < i && o.points > r.points).length }))
  }
})
