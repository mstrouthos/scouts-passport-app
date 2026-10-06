import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { localDay, currentStreak } from './streak'
import { now } from './passcode'
import { STREAK_REWARDS } from '../../utils/avatar'

const dayNumber = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000)

/** The longest run of consecutive local days ever answered. */
export function longestStreak(days: Iterable<string>): number {
  const nums = [...new Set([...days].filter(Boolean).map(dayNumber))].sort((a, b) => a - b)
  let best = 0, run = 0
  nums.forEach((n, i) => { run = i && n === nums[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run) })
  return best
}

/** Brings a member's collection up to date with their record — their best
    streak ever, so a long streak from before the collection existed counts
    too — and says what is theirs and what was earned just now. */
export async function syncRewards(scoutId: number) {
  const db = await useDb()
  const days = (await db.select({ at: s.challengeAnswers.answeredAt }).from(s.challengeAnswers)
    .where(eq(s.challengeAnswers.scoutId, scoutId))).map(a => localDay(a.at))
  const best = longestStreak(days), current = currentStreak(days)
  const have = await db.select().from(s.scoutRewards).where(eq(s.scoutRewards.scoutId, scoutId))
  const owned = new Set(have.map(r => r.rewardKey))
  const fresh = STREAK_REWARDS.filter(r => r.days <= best && !owned.has(r.key)).map(r => r.key)
  if (fresh.length) {
    const t = now()
    await db.insert(s.scoutRewards).values(fresh.map(rewardKey => ({ scoutId, rewardKey, unlockedAt: t }))).onConflictDoNothing()
  }
  return { best, current, unlocked: [...owned, ...fresh] as string[], fresh: fresh as string[] }
}
