import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { resolveQuizSection } from '../../utils/quizSector'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<any>(event)
  if (!b?.questionEl || !Array.isArray(b?.options) || b.options.length < 2)
    throw createError({ statusCode: 400, message: 'Question and at least 2 options required' })
  if (b.options.filter((o: any) => o.isCorrect).length !== 1)
    throw createError({ statusCode: 400, message: 'Exactly one correct option' })

  const sectionId = await resolveQuizSection(me, b.sectionId)

  const db = (await useDb())
  const [row] = (await db.insert(s.challenges).values({
    titleEl: String(b.titleEl || b.questionEl).slice(0, 80), titleEn: b.titleEn || null,
    questionEl: String(b.questionEl), questionEn: b.questionEn || null,
    imageEmoji: b.imageEmoji || null,
    explanationEl: b.explanationEl || '', explanationEn: b.explanationEn || null,
    points: Number(b.points) || 10,
    unlocksAt: b.unlocksAt || null, closesAt: b.closesAt || null,
    sectionId, forLeaders: false, createdBy: me.id, isPublished: !!b.isPublished && !!b.unlocksAt
  }).returning())
  await db.insert(s.challengeOptions).values(
    b.options.map((o: any, i: number) => ({
      challengeId: row.id, textEl: String(o.textEl), textEn: o.textEn || null,
      isCorrect: !!o.isCorrect, sortOrder: i
    }))
  )
  return { id: row.id }
})
