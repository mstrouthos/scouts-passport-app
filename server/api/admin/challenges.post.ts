import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, rankOf } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<any>(event)
  if (!b?.questionEl || !Array.isArray(b?.options) || b.options.length < 2)
    throw createError({ statusCode: 400, message: 'Question and at least 2 options required' })
  if (b.options.filter((o: any) => o.isCorrect).length !== 1)
    throw createError({ statusCode: 400, message: 'Exactly one correct option' })

  const secIds = await scopedSectionIds(me)
  const rank = await rankOf(me)
  let sectionId: number | null = b.sectionId != null ? Number(b.sectionId) : null
  let forLeaders = !!b.forLeaders && rank === 'admin'   // Βαθμοφόροι quizzes: admin only
  if (secIds !== null) {
    // Βαθμοφόροι author for their own sector only
    if (sectionId === null || !secIds.includes(sectionId)) sectionId = secIds[0] ?? null
    if (sectionId === null) throw createError({ statusCode: 403, message: 'No sector assigned' })
    forLeaders = false
  }

  const db = (await useDb())
  const [row] = (await db.insert(s.challenges).values({
    titleEl: String(b.titleEl || b.questionEl).slice(0, 80), titleEn: b.titleEn || null,
    questionEl: String(b.questionEl), questionEn: b.questionEn || null,
    imageEmoji: b.imageEmoji || null,
    explanationEl: b.explanationEl || '', explanationEn: b.explanationEn || null,
    points: Number(b.points) || 10,
    unlocksAt: b.unlocksAt || null, closesAt: b.closesAt || null,
    sectionId, forLeaders, createdBy: me.id, isPublished: !!b.isPublished && !!b.unlocksAt
  }).returning())
  await db.insert(s.challengeOptions).values(
    b.options.map((o: any, i: number) => ({
      challengeId: row.id, textEl: String(o.textEl), textEn: o.textEn || null,
      isCorrect: !!o.isCorrect, sortOrder: i
    }))
  )
  return { id: row.id }
})
