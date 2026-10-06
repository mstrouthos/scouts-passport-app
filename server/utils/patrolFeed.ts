import { and, eq, gt, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { sectionOfWith, type SessionScout } from './guard'
import { faceOf } from './face'
import { badgeArt } from '../../utils/art'
import { isBirthday, cyprusDay } from '../../utils/season'

/* The Ενωμοτία's wins of the last two weeks — a Πτυχίο, an Η.Κ.Α.Δ.Ε.
   sign-off, a photo mission approved, an item for the collection, a
   birthday today — each with its 👏 from the others. Only what already
   happened in the app, named by first name; nothing anyone wrote. A member
   with no Ενωμοτία sees their sector's. */
const FEED_DAYS = 14

export type FeedItem = {
  key: string, type: 'badge' | 'venture' | 'mission' | 'reward' | 'birthday',
  who: { id: number, firstName: string, avatar: any }, at: string,
  title?: string, emoji?: string | null, art?: string | null, rewardKey?: string,
  claps: number, clapped: boolean, mine: boolean
}

/** The members whose wins a member sees: their Ενωμοτία (or sector), real
    accounts only — a hidden test account sees itself as well. */
async function circleOf(me: SessionScout) {
  const db = await useDb()
  const patrols = await db.select().from(s.patrols)
  const mine = sectionOfWith(me as any, patrols)
  return (await db.select().from(s.scouts).where(eq(s.scouts.role, 'scout')))
    .filter(r => r.isActive && (!r.isHidden || r.id === me.id))
    .filter(r => me.patrolId ? r.patrolId === me.patrolId : sectionOfWith(r, patrols) === mine)
}

export async function feedFor(me: SessionScout): Promise<FeedItem[]> {
  const db = await useDb()
  const people = await circleOf(me)
  if (!people.length) return []
  const ids = people.map(p => p.id)
  const byId = new Map(people.map(p => [p.id, p]))
  const since = new Date(Date.now() - FEED_DAYS * 86400_000).toISOString()
  const items: Omit<FeedItem, 'claps' | 'clapped' | 'mine'>[] = []
  const who = (id: number) => { const p = byId.get(id)!; return { id, firstName: p.firstName, avatar: faceOf(p).avatar } }

  // Πτυχία and Η.Κ.Α.Δ.Ε. sign-offs, as announced to them
  const notes = (await db.select().from(s.notifications)
    .where(and(inArray(s.notifications.scoutId, ids), gt(s.notifications.createdAt, since))))
    .filter(n => (n.kind === 'badge' || n.kind === 'venture') && n.refId != null)
  const badges = new Map((await db.select().from(s.achievements)).map(b => [b.id, b]))
  const venture = new Map((await db.select().from(s.ventureRequirements)).map(v => [v.id, v]))
  for (const n of notes) {
    if (n.kind === 'badge') {
      const b = badges.get(n.refId!)
      if (b) items.push({ key: `badge:${n.scoutId}:${b.id}`, type: 'badge', who: who(n.scoutId), at: n.createdAt, title: b.titleEl, emoji: b.iconEmoji, art: badgeArt(b.slug) })
    } else {
      const v = venture.get(n.refId!)
      if (v) items.push({ key: `venture:${n.scoutId}:${v.id}`, type: 'venture', who: who(n.scoutId), at: n.createdAt, title: v.areaEl, emoji: '🏵️' })
    }
  }
  // photo missions approved
  const subs = (await db.select().from(s.missionSubmissions).where(inArray(s.missionSubmissions.scoutId, ids)))
    .filter(x => x.status === 'approved' && x.reviewedAt && x.reviewedAt > since)
  const missions = new Map((await db.select().from(s.missions)).map(m => [m.id, m]))
  for (const x of subs) {
    const m = missions.get(x.missionId)
    if (m) items.push({ key: `mission:${x.id}`, type: 'mission', who: who(x.scoutId), at: x.reviewedAt!, title: m.titleEl, emoji: m.emoji })
  }
  // items for the collection
  for (const r of (await db.select().from(s.scoutRewards).where(inArray(s.scoutRewards.scoutId, ids))).filter(r => r.unlockedAt > since))
    items.push({ key: `reward:${r.scoutId}:${r.rewardKey}`, type: 'reward', who: who(r.scoutId), at: r.unlockedAt, rewardKey: r.rewardKey })
  // birthdays today
  const today = cyprusDay()
  for (const p of people.filter(p => isBirthday(p.birthday)))
    items.push({ key: `birthday:${p.id}:${today.slice(0, 4)}`, type: 'birthday', who: who(p.id), at: `${today}T00:00:00.000Z`, emoji: '🎂' })

  const keys = items.map(i => i.key)
  const kudos = keys.length ? await db.select().from(s.scoutKudos).where(inArray(s.scoutKudos.eventKey, keys)) : []
  return items
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 20)
    .map(i => ({
      ...i, mine: i.who.id === me.id,
      claps: kudos.filter(k => k.eventKey === i.key).length,
      clapped: kudos.some(k => k.eventKey === i.key && k.fromId === me.id)
    }))
}
