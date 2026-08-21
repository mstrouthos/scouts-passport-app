import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds, rankOf, idParam } from '../../../utils/guard'
import { challengeInScope } from '../../../utils/challengeScope'

/** Edit a challenge. Text, timing and points can always change. Options may
    only be replaced while nobody has answered — otherwise existing answers
    would point at options that no longer exist. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  await challengeInScope(me, id)
  const b = await readBody<any>(event)
  const db = (await useDb())

  const set: any = {}
  if (b?.titleEl !== undefined) set.titleEl = String(b.titleEl).slice(0, 80)
  if (b?.questionEl !== undefined) {
    const q = String(b.questionEl).trim()
    if (!q) throw createError({ statusCode: 400, message: 'Question required' })
    set.questionEl = q
  }
  if (b?.explanationEl !== undefined) set.explanationEl = String(b.explanationEl || '')
  if (b?.imageEmoji !== undefined) set.imageEmoji = String(b.imageEmoji || '').trim() || null
  if (b?.points !== undefined) set.points = Number(b.points) || 10
  for (const k of ['unlocksAt', 'closesAt'] as const) {
    if (b?.[k] === undefined) continue
    const v = b[k] ? String(b[k]) : null
    if (v && Number.isNaN(Date.parse(v)))
      throw createError({ statusCode: 400, message: `${k} is not a valid date` })
    set[k] = v
  }
  // publication follows the unlock time, exactly as on create/import
  if (set.unlocksAt !== undefined) set.isPublished = !!set.unlocksAt

  // ----- which sector the question is for -----
  if (b?.sectionId !== undefined || b?.forLeaders !== undefined) {
    const secIds = await scopedSectionIds(me)
    const rank = await rankOf(me)
    let sectionId: number | null = b.sectionId != null ? Number(b.sectionId) : null
    let forLeaders = !!b.forLeaders && rank === 'admin'   // Βαθμοφόροι quizzes: admin only
    if (sectionId != null && !(await db.select().from(s.sections)).some(x => x.id === sectionId))
      throw createError({ statusCode: 400, message: 'Bad section' })
    if (secIds !== null) {
      // a sector leader keeps it inside their own sector
      if (sectionId === null || !secIds.includes(sectionId)) sectionId = secIds[0] ?? null
      if (sectionId === null) throw createError({ statusCode: 403, message: 'No sector assigned' })
      forLeaders = false
    }
    set.sectionId = forLeaders ? null : sectionId
    set.forLeaders = forLeaders
  }

  if (Object.keys(set).length)
    await db.update(s.challenges).set(set).where(eq(s.challenges.id, id))

  if (Array.isArray(b?.options)) {
    const answered = (await db.select().from(s.challengeAnswers).where(eq(s.challengeAnswers.challengeId, id))).length
    if (answered)
      throw createError({ statusCode: 400, message: 'Cannot change the options after scouts have answered' })
    const opts = b.options as Array<{ textEl?: string, isCorrect?: boolean }>
    if (opts.length < 2) throw createError({ statusCode: 400, message: 'At least 2 options required' })
    if (opts.some(o => !String(o?.textEl || '').trim()))
      throw createError({ statusCode: 400, message: 'Every option needs text' })
    if (opts.filter(o => o?.isCorrect).length !== 1)
      throw createError({ statusCode: 400, message: 'Exactly one correct option' })
    await db.delete(s.challengeOptions).where(eq(s.challengeOptions.challengeId, id))
    await db.insert(s.challengeOptions).values(opts.map((o, i) => ({
      challengeId: id, textEl: String(o.textEl).trim(), textEn: null, isCorrect: !!o.isCorrect, sortOrder: i
    })))
  }
  return { ok: true }
})
