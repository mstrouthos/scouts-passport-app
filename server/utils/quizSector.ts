import { useDb, schema as s } from '../db'
import { scopedSectionIds, type SessionScout } from './guard'

/** The quiz belongs to the Ομάδα Προσκόπων and to nobody else. The Αγέλες have
    no member logins at all and read their own weekly challenges at home, the
    Κοινότητα runs the Η.Κ.Α.Δ.Ε., and there is no Βαθμοφόροι quiz — so every
    other sector is rejected rather than silently accepted. */
export const QUIZ_SLUG = 'omada'

/** Sectors that run the quiz — today, exactly one. */
export async function quizSections() {
  const db = (await useDb())
  return (await db.select().from(s.sections)).filter(x => x.slug === QUIZ_SLUG)
}

/** May this leader author or read quiz questions at all? */
export async function canRunQuiz(me: SessionScout): Promise<boolean> {
  const secIds = await scopedSectionIds(me)
  if (secIds === null) return true                       // Αρχηγός Συστήματος / troop scope
  const ids = (await quizSections()).map(x => x.id)
  return ids.some(id => secIds.includes(id))
}

/** Resolve the sector a quiz question belongs to. */
export async function resolveQuizSection(me: SessionScout, input: unknown): Promise<number | null> {
  const appSections = await quizSections()
  const secIds = await scopedSectionIds(me)

  let sectionId: number | null = input != null ? Number(input) : null
  if (sectionId != null && !appSections.some(x => x.id === sectionId))
    throw createError({ statusCode: 400, message: 'That section does not run quizzes' })

  if (secIds !== null) {
    // a sector leader always authors inside their own sector
    const mine = appSections.filter(x => secIds.includes(x.id)).map(x => x.id)
    if (!mine.length) throw createError({ statusCode: 403, message: 'Your sector does not run quizzes' })
    if (sectionId === null || !mine.includes(sectionId)) sectionId = mine[0]
  }
  return sectionId   // null = whole troop (full-access leaders only)
}
