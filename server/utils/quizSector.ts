import { useDb, schema as s } from '../db'
import { scopedSectionIds, type SessionScout } from './guard'

/** Resolve the sector a quiz question belongs to.

    Quizzes only exist for sections whose members have app accounts
    (Ομάδα Προσκόπων, Κοινότητα Ανιχνευτών) or troop-wide. Αγέλη / Μικρή
    Αγέλη have no member logins, and there is no Βαθμοφόροι quiz, so both
    are rejected rather than silently accepted. */
export async function resolveQuizSection(me: SessionScout, input: unknown): Promise<number | null> {
  const db = (await useDb())
  const appSections = (await db.select().from(s.sections)).filter(x => x.hasApp)
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
