import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout, sectionOf } from '../utils/guard'
import { now, isAtOrBefore } from '../utils/passcode'
import { localDay, currentStreak, bonusEarned, weekDays, weekdayOf } from '../utils/streak'

/** The scout's question path, in order, with their streak. Bonus questions are
    hidden unless this week's streak earned them. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = (await useDb())
  const t = now()
  const mySection = await sectionOf(me)

  const myAnswers = (await db.select().from(s.challengeAnswers)
    .where(eq(s.challengeAnswers.scoutId, me.id)))
  const ansMap = new Map(myAnswers.map(a => [a.challengeId, a]))
  const days = new Set(myAnswers.map(a => localDay(a.answeredAt)).filter(Boolean))
  const today = localDay(new Date())
  const streak = currentStreak(days, today)
  const earnedBonus = bonusEarned(days, today)

  const mine = (await db.select().from(s.challenges))
    .filter(c => c.isPublished && isAtOrBefore(c.unlocksAt, t) && !c.forLeaders)
    .filter(c => (!c.sectionId && !c.patrolId)
      || (c.patrolId != null ? c.patrolId === me.patrolId : c.sectionId === mySection))
    // a bonus question only appears once this week's streak has earned it
    .filter(c => !c.isBonus || earnedBonus || ansMap.has(c.id))
    .sort((a, b) => (a.unlocksAt || '').localeCompare(b.unlocksAt || ''))

  const allOpts = (await db.select().from(s.challengeOptions)).sort((a, b) => a.sortOrder - b.sortOrder)
  const optsBy = new Map<number, typeof allOpts>()
  for (const o of allOpts) {
    const list = optsBy.get(o.challengeId) || []
    list.push(o); optsBy.set(o.challengeId, list)
  }

  const items = mine.map(c => {
    const mine_ = ansMap.get(c.id)
    const closed = isAtOrBefore(c.closesAt, t)
    const revealed = !!mine_ || closed
    return {
      id: c.id, titleEl: c.titleEl, titleEn: c.titleEn,
      questionEl: c.questionEl, questionEn: c.questionEn,
      imageEmoji: c.imageEmoji, points: c.points,
      unlocksAt: c.unlocksAt, closesAt: c.closesAt, closed, isBonus: c.isBonus,
      // path state drives the colour of the node
      state: mine_ ? (mine_.isCorrect ? 'correct' : 'wrong') : closed ? 'missed' : 'open',
      explanationEl: revealed ? c.explanationEl : null,
      explanationEn: revealed ? c.explanationEn : null,
      options: (optsBy.get(c.id) || []).map(o => ({
        id: o.id, textEl: o.textEl, textEn: o.textEn,
        isCorrect: revealed ? o.isCorrect : undefined
      })),
      answer: mine_ ? { optionId: mine_.optionId, isCorrect: mine_.isCorrect, points: mine_.pointsAwarded } : null
    }
  })

  const week = weekDays(today)
  return {
    streak,
    answeredToday: days.has(today),
    // the Mon-Sun grid the scout is working towards
    week: week.map(d => ({ day: d, done: days.has(d), future: d > today })),
    isSunday: weekdayOf(today) === 6,
    bonusEarned: earnedBonus,
    items
  }
})
