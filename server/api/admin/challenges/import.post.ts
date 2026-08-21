import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { toUtcIso } from '../../../utils/passcode'
import { resolveQuizSection } from '../../../utils/quizSector'

type InOption = { textEl?: string, textEn?: string, isCorrect?: boolean }
type InQuestion = {
  titleEl?: string, titleEn?: string,
  questionEl?: string, questionEn?: string,
  imageEmoji?: string,
  explanationEl?: string, explanationEn?: string,
  points?: number,
  unlocksAt?: string, closesAt?: string,
  options?: InOption[]
}

/** Bulk import of quiz questions pasted as JSON. Applies exactly the same
    validation and sector rules as creating one by hand, per question — a bad
    row is reported and skipped rather than failing the whole batch. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const body = await readBody<any>(event)

  // accept either a bare array or { questions: [...] }, and a JSON string.
  // The sector is chosen once for the whole batch in the UI rather than asked
  // of the AI, which has no way to know the section ids.
  let raw: any = body
  let batchSectionId: number | null | undefined
  if (typeof raw === 'string') { try { raw = JSON.parse(raw) } catch { raw = null } }
  if (raw && !Array.isArray(raw) && Array.isArray(raw.questions)) {
    if ('sectionId' in raw) batchSectionId = raw.sectionId == null ? null : Number(raw.sectionId)
    raw = raw.questions
  }
  if (!Array.isArray(raw) || !raw.length)
    throw createError({ statusCode: 400, message: 'Expected a JSON array of questions' })
  if (raw.length > 200)
    throw createError({ statusCode: 400, message: 'Too many questions in one import (max 200)' })

  // one sector for the whole batch — the AI never picks it
  const batchSection = await resolveQuizSection(me, batchSectionId ?? null)
  const db = (await useDb())

  const errors: string[] = []
  let imported = 0

  for (const [i, q] of (raw as InQuestion[]).entries()) {
    const at = `#${i + 1}`
    const questionEl = String(q?.questionEl || '').trim()
    const options = Array.isArray(q?.options) ? q.options : []
    if (!questionEl) { errors.push(`${at}: missing questionEl`); continue }
    if (options.length < 2) { errors.push(`${at}: needs at least 2 options`); continue }
    if (options.some(o => !String(o?.textEl || '').trim())) { errors.push(`${at}: an option has no textEl`); continue }
    if (options.filter(o => o?.isCorrect).length !== 1) { errors.push(`${at}: exactly one option must be isCorrect`); continue }

    // normalise to UTC so every stored timestamp has the same shape
    if (q.unlocksAt && Number.isNaN(Date.parse(String(q.unlocksAt)))) { errors.push(`${at}: unlocksAt is not a valid date`); continue }
    if (q.closesAt && Number.isNaN(Date.parse(String(q.closesAt)))) { errors.push(`${at}: closesAt is not a valid date`); continue }
    const unlocksAt = toUtcIso(q.unlocksAt)
    const closesAt = toUtcIso(q.closesAt)

    const [row] = (await db.insert(s.challenges).values({
      titleEl: String(q.titleEl || questionEl).slice(0, 80), titleEn: q.titleEn || null,
      questionEl, questionEn: q.questionEn || null,
      imageEmoji: q.imageEmoji || null,
      explanationEl: q.explanationEl || '', explanationEn: q.explanationEn || null,
      points: Number(q.points) || 10,
      unlocksAt, closesAt,
      sectionId: batchSection, forLeaders: false, createdBy: me.id,
      // published only when it has an unlock time, mirroring single creation
      isPublished: !!unlocksAt
    }).returning())

    await db.insert(s.challengeOptions).values(
      options.map((o, n) => ({
        challengeId: row.id, textEl: String(o.textEl).trim(), textEn: o.textEn || null,
        isCorrect: !!o.isCorrect, sortOrder: n
      }))
    )
    imported++
  }

  return { imported, skipped: errors.length, errors: errors.slice(0, 20) }
})
