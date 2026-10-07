import { and, eq, gt, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { faceOf } from '../../utils/face'
import { normalizeAvatar, randomAvatar } from '../../../utils/avatar'
import { kimDay } from '../../../utils/kim'
import { FUN_LIMIT_DAY, cyprusDayStart, cyprusWeekStart, funPaused, potatoTick, activePotato, potatoPool, potatoCycle, potatoTargets } from '../../utils/leaderFun'

/** The playground: every Βαθμοφόρος of every sector, standing; what has
    been going on lately; and the marks still on anyone. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const [people, scopes, sections, patrols] = await Promise.all([
    db.select().from(s.scouts), db.select().from(s.leaderScopes), db.select().from(s.sections), db.select().from(s.patrols)])
  const leaders = people.filter(r => r.role !== 'scout' && r.isActive && !r.deletedAt && (!r.isHidden || r.id === me.id))
  // a Βαθμοφόρος with no avatar yet is given one at random, the first time —
  // theirs to change in the avatar builder. Its look starts from their first
  // name (Greek men's names end in -ς), only as a first guess.
  for (const l of leaders) if (!l.avatar) {
    const like = /[ςσ]$/i.test(String(l.firstName || '').trim()) ? 'boy' : /[αηωάήώ]$/i.test(String(l.firstName || '').trim()) ? 'girl' : undefined
    const avatar = JSON.stringify(randomAvatar(like))
    await db.update(s.scouts).set({ avatar }).where(and(eq(s.scouts.id, l.id), isNull(s.scouts.avatar)))
    l.avatar = avatar
  }
  const secName = (id: number | null) => sections.find(x => x.id === id)?.nameEl
  const where = (l: typeof people[number]) => {
    if (l.role === 'troop_leader') return 'Όλο το Σύστημα'
    const names = [...new Set(scopes.filter(x => x.scoutId === l.id).map(x => x.scope === 'troop' ? 'Όλο το Σύστημα'
      : x.scope === 'section' ? secName(x.sectionId) : secName(patrols.find(p => p.id === x.patrolId)?.sectionId ?? null)).filter(Boolean))]
    return names.join(' · ')
  }
  const since = new Date(Date.now() - 7 * 86400_000).toISOString()
  const recent = (await db.select().from(s.leaderFun).where(gt(s.leaderFun.createdAt, since)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const nameOf = (id: number) => people.find(p => p.id === id)?.firstName ?? '—'
  // standing, the avatar shows even for one who uses a photo as their face
  const figure = (raw: string | null) => { try { return raw ? normalizeAvatar(JSON.parse(raw)) : null } catch { return null } }
  const today = cyprusDayStart()

  /* "who did it?": a throw with no name keeps its thrower hidden from all
     but the thrower, until guessed, given up on, or a day has gone by */
  const DAY = 24 * 3600_000
  const outcomeOf = (r: typeof recent[number]) => r.outcome || (r.anon && Date.now() - Date.parse(r.createdAt) > DAY ? 'escaped' : null)
  const hidden = (r: typeof recent[number]) => r.anon && !outcomeOf(r) && r.fromId !== me.id
  const anonUsed = recent.some(r => r.anon && r.fromId === me.id && r.createdAt >= cyprusWeekStart())

  // the hot potato: burned first if its time is up
  await potatoTick()
  const pot = await activePotato()
  // the last one to burn, for a couple of days
  const twoDays = new Date(Date.now() - 2 * 86400_000).toISOString()
  const lastBurn = (await db.select().from(s.hotPotato)).filter(p => p.endedAt && p.endedAt > twoDays).sort((a, b) => b.id - a.id)[0]
  const pool = pot ? await potatoPool() : []
  const kimToday = (await db.select().from(s.kimPlays).where(eq(s.kimPlays.scoutId, me.id))).find(p => p.day === kimDay() && p.answeredAt)
  return {
    kim: kimToday ? { correct: kimToday.correct } : null,
    paused: await funPaused(), canPause: me.role === 'troop_leader',
    me: { id: me.id, pref: me.funPref, sentToday: recent.filter(r => r.fromId === me.id && r.createdAt >= today && !r.auto).length, limit: FUN_LIMIT_DAY,
      anonLeft: !anonUsed },
    potato: {
      active: pot ? {
        holder: pot.holderId, holderName: nameOf(pot.holderId), prev: pot.prevId, deadline: pot.deadline, passes: pot.passes,
        // who has had it this round, and whom the holder may throw it to
        had: potatoCycle(pot), canGet: potatoTargets(pool, potatoCycle(pot), pot.holderId)
      } : null,
      // a new one whenever none is in play: it runs until it burns on someone
      canStart: !pot,
      last: lastBurn ? { burned: lastBurn.burnedId, burnedName: nameOf(lastBurn.burnedId!), passes: lastBurn.passes, at: lastBurn.endedAt } : null
    },
    leaders: leaders.map(l => ({ id: l.id, firstName: l.firstName, lastName: l.lastName, ...faceOf(l), figure: figure(l.avatar), where: where(l), me: l.id === me.id, pref: l.funPref }))
      .sort((a, b) => Number(b.me) - Number(a.me) || a.firstName.localeCompare(b.firstName, 'el')),
    // what was done, newest first — the marks are worked out from it on the page
    recent: recent.slice(0, 300).map(r => ({
      id: r.id, to: r.toId, toName: nameOf(r.toId), action: r.action, at: r.createdAt, auto: r.auto,
      ...(hidden(r) ? { from: null, fromName: null, guessesLeft: 3 - r.guesses } : { from: r.fromId, fromName: nameOf(r.fromId) }),
      ...(r.anon ? { anon: true, outcome: outcomeOf(r) } : {})
    }))
  }
})
