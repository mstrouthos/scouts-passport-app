import { eq, and } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireScout, idParam } from '../../../utils/guard'
import { now } from '../../../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const id = idParam(event)
  const body = await readBody<{ optionId?: number }>(event)
  const db = useDb()
  const t = now()

  const c = db.select().from(s.challenges).where(eq(s.challenges.id, id)).get()
  if (!c || !c.isPublished || !c.unlocksAt || c.unlocksAt > t)
    throw createError({ statusCode: 404, message: 'Challenge not found' })
  if (c.closesAt && c.closesAt <= t)
    throw createError({ statusCode: 400, message: 'Challenge closed' })

  const existing = db.select().from(s.challengeAnswers)
    .where(and(eq(s.challengeAnswers.challengeId, id), eq(s.challengeAnswers.scoutId, me.id))).get()
  if (existing) throw createError({ statusCode: 400, message: 'Already answered' })

  const opt = db.select().from(s.challengeOptions)
    .where(and(eq(s.challengeOptions.id, Number(body?.optionId)), eq(s.challengeOptions.challengeId, id))).get()
  if (!opt) throw createError({ statusCode: 400, message: 'Bad option' })

  const points = opt.isCorrect ? c.points : 0
  db.insert(s.challengeAnswers).values({
    challengeId: id, scoutId: me.id, optionId: opt.id,
    isCorrect: opt.isCorrect, pointsAwarded: points, answeredAt: t
  }).run()

  const opts = db.select().from(s.challengeOptions).where(eq(s.challengeOptions.challengeId, id)).all()
  return {
    isCorrect: opt.isCorrect, points,
    correctOptionId: opts.find(o => o.isCorrect)?.id,
    explanationEl: c.explanationEl, explanationEn: c.explanationEn
  }
})
