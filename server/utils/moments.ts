import { and, eq, gt, inArray, or } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { sectionOfWith, type SessionScout } from './guard'
import { boardFor } from './board'
import { syncRewards } from './rewards'
import { badgeArt } from '../../utils/art'
import { STREAK_REWARDS } from '../../utils/avatar'
import { isBirthday, cyprusDay } from '../../utils/season'

/* What has happened for a member since the app last showed them — so a win
   is played once, when they next open it, whether or not they tapped the
   notification: a Πτυχίο, a sign-off, points from a leader, a photo mission
   approved, an item for the collection, 👏 from their Ενωμοτία, a better
   place on the league table, their Ενωμοτία going top, their birthday.
   The very first time there is nothing to replay: it starts from now. */
export type Moment =
  | { type: 'award', kind: 'badge' | 'requirement' | 'venture', key: string, emoji: string, title: string, image?: string | null }
  | { type: 'mission', key: string, emoji: string, title: string, points: number }
  | { type: 'points', key: string, points: number, reasons: string[] }
  | { type: 'reward', key: string, keys: string[] }
  | { type: 'kudos', key: string, count: number, names: string[] }
  | { type: 'rank', key: string, from: number, to: number }
  | { type: 'patrolTop', key: string, name: string, emblem: string }
  | { type: 'birthday', key: string, firstName: string }

/** Where the member stands now: their place in their sector, their Ενωμοτία's. */
export async function standing(me: SessionScout) {
  const db = await useDb()
  const patrols = await db.select().from(s.patrols)
  const board = await boardFor(sectionOfWith(me as any, patrols), me.id)
  const at = board.individual.findIndex(r => r.id === me.id)
  const p = board.patrols.findIndex(x => x.id === me.patrolId)
  return { rank: at >= 0 ? at + 1 : null, patrolRank: p >= 0 ? p + 1 : null, patrol: p >= 0 ? board.patrols[p] : null }
}

export async function momentsFor(me: SessionScout) {
  const db = await useDb()
  await syncRewards(me.id)   // catches up a season's item or a run of meetings
  const now = new Date().toISOString()
  const here = await standing(me)
  const items: Moment[] = []
  const year = cyprusDay().slice(0, 4)
  const birthday = isBirthday(me.birthday) && me.birthdaySeen !== year
  const since = me.momentsSeenAt
  if (since) {
    // Πτυχία and sign-offs, as they were announced
    const notes = (await db.select().from(s.notifications)
      .where(and(eq(s.notifications.scoutId, me.id), gt(s.notifications.createdAt, since))))
      .filter(n => ['badge', 'requirement', 'venture'].includes(n.kind) && n.refId != null)
    if (notes.some(n => n.kind === 'badge')) {
      const badges = new Map((await db.select().from(s.achievements)).map(b => [b.id, b]))
      for (const n of notes.filter(n => n.kind === 'badge')) {
        const b = badges.get(n.refId!)
        if (b) items.push({ type: 'award', kind: 'badge', key: `badge:${b.id}`, emoji: b.iconEmoji || '🏅', title: b.titleEl, image: badgeArt(b.slug) })
      }
    }
    for (const n of notes.filter(n => n.kind !== 'badge'))
      items.push({ type: 'award', kind: n.kind as any, key: `${n.kind}:${n.refId}`, emoji: n.kind === 'venture' ? '🏵️' : '⚜️', title: n.body.replace(/^⚜️\s*Ολοκλήρωσες:\s*/, '') })

    // points a leader gave: a photo mission each on its own, the rest together
    const awards = (await db.select().from(s.pointAwards).where(and(gt(s.pointAwards.awardedAt, since),
      me.patrolId ? or(eq(s.pointAwards.scoutId, me.id), eq(s.pointAwards.patrolId, me.patrolId)) : eq(s.pointAwards.scoutId, me.id))))
      .filter(w => w.points > 0)
    for (const w of awards.filter(w => w.kind === 'mission')) {
      const [emoji, ...rest] = w.reasonEl.split(' ')
      items.push({ type: 'mission', key: `mission:${w.id}`, emoji: emoji || '📸', title: rest.join(' ') || w.reasonEl, points: w.points })
    }
    const other = awards.filter(w => w.kind !== 'mission')
    if (other.length) items.push({
      type: 'points', key: `points:${other.map(w => w.id).join(',')}`,
      points: other.reduce((a, w) => a + w.points, 0),
      reasons: [...new Set(other.map(w => w.reasonEl || w.kind))].slice(0, 4)
    })

    // items for the collection not already celebrated as they were won (the
    // quiz's own are shown the moment the answer goes in)
    const won = (await db.select().from(s.scoutRewards).where(and(eq(s.scoutRewards.scoutId, me.id), gt(s.scoutRewards.unlockedAt, since))))
      .map(r => r.rewardKey).filter(k => STREAK_REWARDS.find(r => r.key === k)?.track !== 'quiz')
    if (won.length) items.push({ type: 'reward', key: `reward:${won.join(',')}`, keys: won })

    // 👏 from the Ενωμοτία
    const claps = await db.select().from(s.scoutKudos).where(and(eq(s.scoutKudos.toId, me.id), gt(s.scoutKudos.createdAt, since)))
    if (claps.length) {
      const from = await db.select({ id: s.scouts.id, firstName: s.scouts.firstName }).from(s.scouts)
        .where(inArray(s.scouts.id, [...new Set(claps.map(c => c.fromId))]))
      items.push({ type: 'kudos', key: `kudos:${claps.map(c => c.id).join(',')}`, count: claps.length, names: from.map(f => f.firstName) })
    }

    // a better place on the table; the Ενωμοτία going top
    if (here.rank && me.lastRank && here.rank < me.lastRank)
      items.push({ type: 'rank', key: `rank:${me.lastRank}:${here.rank}`, from: me.lastRank, to: here.rank })
    if (here.patrolRank === 1 && me.lastPatrolRank && me.lastPatrolRank > 1 && here.patrol)
      items.push({ type: 'patrolTop', key: `patrolTop:${here.patrol.id}`, name: here.patrol.nameEl, emblem: here.patrol.emblem })
  }
  if (birthday) items.push({ type: 'birthday', key: `birthday:${year}`, firstName: me.firstName })
  return { at: now, items, rank: here.rank, patrolRank: here.patrolRank }
}

/** They have seen it all: remember when, and where they stood. */
export async function momentsSeen(me: SessionScout, at: unknown) {
  const t = typeof at === 'string' && !Number.isNaN(Date.parse(at)) && Date.parse(at) <= Date.now() + 60_000 ? new Date(at).toISOString() : new Date().toISOString()
  const here = await standing(me)
  const set: any = { momentsSeenAt: t, lastRank: here.rank, lastPatrolRank: here.patrolRank }
  if (isBirthday(me.birthday)) set.birthdaySeen = cyprusDay().slice(0, 4)
  await (await useDb()).update(s.scouts).set(set).where(eq(s.scouts.id, me.id))
}
