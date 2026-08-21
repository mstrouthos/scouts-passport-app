import { eq, and } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireScout, idParam } from '../../../utils/guard'
import { now, isAfter, isAtOrBefore } from '../../../utils/passcode'
import { localDay, bonusEarned } from '../../../utils/streak'
import { pointsAfter } from '../../../utils/scoring'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const id = idParam(event)
  const body = await readBody<{ optionId?: number }>(event)
  const db = (await useDb())
  const t = now()

  const c = (await db.select().from(s.challenges).where(eq(s.challenges.id, id)).limit(1))[0]
  if (!c || !c.isPublished || !c.unlocksAt || isAfter(c.unlocksAt, t))
    throw createError({ statusCode: 404, message: 'Challenge not found' })
  if (isAtOrBefore(c.closesAt, t))
    throw createError({ statusCode: 400, message: 'Challenge closed' })

  if (c.isBonus) {
    // the bonus is only answerable on the Sunday that closed a full week
    const mine = (await db.select().from(s.challengeAnswers).where(eq(s.challengeAnswers.scoutId, me.id)))
    const days = new Set(mine.map(a => localDay(a.answeredAt)).filter(Boolean))
    if (!bonusEarned(days, localDay(new Date())))
      throw createError({ statusCode: 403, message: 'Το μπόνους ξεκλειδώνει με σερί όλης της εβδομάδας' })
  }

  const existing = (await db.select().from(s.challengeAnswers)
    .where(and(eq(s.challengeAnswers.challengeId, id), eq(s.challengeAnswers.scoutId, me.id))).limit(1))[0]
  if (existing) throw createError({ statusCode: 400, message: 'Already answered' })

  const opt = (await db.select().from(s.challengeOptions)
    .where(and(eq(s.challengeOptions.id, Number(body?.optionId)), eq(s.challengeOptions.challengeId, id))).limit(1))[0]
  if (!opt) throw createError({ statusCode: 400, message: 'Bad option' })

  // The clock runs from the moment the options were revealed. Answering without
  // ever calling /reveal (a scripted client) is scored as if no time had passed.
  const rev = (await db.select().from(s.challengeReveals)
    .where(and(eq(s.challengeReveals.challengeId, id), eq(s.challengeReveals.scoutId, me.id))).limit(1))[0]
  const elapsed = rev ? Date.parse(t) - Date.parse(rev.revealedAt) : 0
  const points = opt.isCorrect ? pointsAfter(c.points, elapsed) : 0
  await db.insert(s.challengeAnswers).values({
    challengeId: id, scoutId: me.id, optionId: opt.id,
    isCorrect: opt.isCorrect, pointsAwarded: points, answeredAt: t
  })

  const opts = (await db.select().from(s.challengeOptions).where(eq(s.challengeOptions.challengeId, id)))
  return {
    isCorrect: opt.isCorrect, points, fullPoints: c.points,
    correctOptionId: opts.find(o => o.isCorrect)?.id,
    explanationEl: c.explanationEl, explanationEn: c.explanationEn
  }
})
