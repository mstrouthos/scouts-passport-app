import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, idParam } from '../../../utils/guard'
import { challengeInScope } from '../../../utils/challengeScope'

/** Full challenge + its options, for the edit form. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const c = await challengeInScope(me, id)
  const db = (await useDb())
  const opts = (await db.select().from(s.challengeOptions).where(eq(s.challengeOptions.challengeId, id)))
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const answers = (await db.select().from(s.challengeAnswers).where(eq(s.challengeAnswers.challengeId, id)))
  return {
    id: c.id, titleEl: c.titleEl, titleEn: c.titleEn,
    questionEl: c.questionEl, questionEn: c.questionEn,
    explanationEl: c.explanationEl, explanationEn: c.explanationEn,
    imageEmoji: c.imageEmoji, points: c.points,
    unlocksAt: c.unlocksAt, closesAt: c.closesAt,
    sectionId: c.sectionId, forLeaders: c.forLeaders, isPublished: c.isPublished,
    // once anyone has answered, changing the options would invalidate their answers
    answeredCount: answers.length,
    options: opts.map(o => ({ id: o.id, textEl: o.textEl, textEn: o.textEn, isCorrect: o.isCorrect }))
  }
})
