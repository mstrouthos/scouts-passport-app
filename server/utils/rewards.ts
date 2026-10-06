import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { localDay, currentStreak } from './streak'
import { now } from './passcode'
import { STREAK_REWARDS, SEASON_OF } from '../../utils/avatar'
import { seasonOn } from '../../utils/season'
import { attendanceOf } from './attendanceStreak'
import { sendPushTo } from './push'
import { noteError } from './errorReport'

const dayNumber = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000)

/** The longest run of consecutive local days ever answered. */
export function longestStreak(days: Iterable<string>): number {
  const nums = [...new Set([...days].filter(Boolean).map(dayNumber))].sort((a, b) => a - b)
  let best = 0, run = 0
  nums.forEach((n, i) => { run = i && n === nums[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run) })
  return best
}

/* Seasonal items are won by taking part while the season lasts — counted
   from the day they arrived in the app, never for the seasons before it. */
const SEASONS_FROM = '2026-10-06'

/** The days a member took part in something: answered the quiz, came to a
    meeting, sent a photo mission. */
async function activeDays(scoutId: number, quizDays: string[]) {
  const db = await useDb()
  const events = new Map((await db.select().from(s.events)).map(e => [e.id, e]))
  const met = (await db.select().from(s.eventReviews).where(eq(s.eventReviews.scoutId, scoutId)))
    .filter(r => r.attendance === 'present' && events.has(r.eventId)).map(r => localDay(events.get(r.eventId)!.startsAt))
  const sent = (await db.select({ at: s.missionSubmissions.createdAt }).from(s.missionSubmissions)
    .where(eq(s.missionSubmissions.scoutId, scoutId))).map(m => localDay(m.at))
  return [...quizDays, ...met, ...sent].filter(d => d && d >= SEASONS_FROM)
}

/** Brings a member's collection up to date with their record — their best
    streaks ever, at the quiz and at meetings, so a long streak from before
    the collection existed counts too — and says what is theirs and what was
    earned just now. */
export async function syncRewards(scoutId: number) {
  const db = await useDb()
  const days = (await db.select({ at: s.challengeAnswers.answeredAt }).from(s.challengeAnswers)
    .where(eq(s.challengeAnswers.scoutId, scoutId))).map(a => localDay(a.at))
  const best = longestStreak(days), current = currentStreak(days)
  const att = await attendanceOf(scoutId)
  const have = await db.select().from(s.scoutRewards).where(eq(s.scoutRewards.scoutId, scoutId))
  const owned = new Set(have.map(r => r.rewardKey))
  const seasons = new Set((await activeDays(scoutId, days)).map(seasonOn).filter(Boolean))
  const reached = (r: typeof STREAK_REWARDS[number]) => r.track === 'season'
    ? seasons.has(SEASON_OF[r.key])
    : r.days <= (r.track === 'attendance' ? att.best : best)
  const fresh = STREAK_REWARDS.filter(r => reached(r) && !owned.has(r.key)).map(r => r.key)
  if (fresh.length) {
    const t = now()
    await db.insert(s.scoutRewards).values(fresh.map(rewardKey => ({ scoutId, rewardKey, unlockedAt: t }))).onConflictDoNothing()
  }
  return { best, current, attendBest: att.best, attendCurrent: att.current, unlocked: [...owned, ...fresh] as string[], fresh: fresh as string[] }
}

/** After a meeting is registered (or a photo mission sent): a member whose
    run of meetings — or whose taking part in the season — has just earned
    an item hears of it, and finds it in their collection. */
export async function rewardAttendance(scoutId: number) {
  try {
    const { fresh } = await syncRewards(scoutId)
    const won = STREAK_REWARDS.filter(r => fresh.includes(r.key) && r.track === 'attendance')
    if (won.length) await sendPushTo([scoutId], {
      title: '🏕️ Νέο αντικείμενο συλλογής!',
      body: `${won[won.length - 1].days} συγκεντρώσεις στη σειρά — δες το στον χαρακτήρα σου`,
      kind: 'reward', refId: won[won.length - 1].days
    })
    const season = STREAK_REWARDS.filter(r => fresh.includes(r.key) && r.track === 'season')
    if (season.length) await sendPushTo([scoutId], {
      title: '🎁 Εποχικό αντικείμενο!',
      body: 'Κέρδισες ένα αντικείμενο που υπάρχει μόνο αυτή την εποχή — δες το στον χαρακτήρα σου',
      kind: 'reward', refId: 1000 + STREAK_REWARDS.findIndex(r => r.key === season[0].key)
    })
  } catch (e) { noteError('Συλλογή — σερί παρουσιών', e, { scout: scoutId }) }
}
