import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds } from '../../../utils/guard'
import { assertCan } from '../../../utils/permissions'
import { PACK_SLUG, weekStartOf } from '../../../utils/pack'
import { now } from '../../../utils/passcode'

/** Set a week's challenges, tick one off for a λυκόπουλο, or remove one.
    Marking is a Βαθμοφόρος's job at the συγκέντρωση — families do not tick. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'attendance.record')
  const db = await useDb()
  const section = (await db.select().from(s.sections)).find(x => x.slug === PACK_SLUG)
  if (!section) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = await scopedSectionIds(me)
  if (secIds !== null && !secIds.includes(section.id))
    throw createError({ statusCode: 403, message: 'Out of your sector' })

  const b = await readBody<any>(event)

  if (b?.action === 'mark') {
    const challengeId = Number(b.challengeId), scoutId = Number(b.scoutId)
    const c = (await db.select().from(s.packChallenges).where(eq(s.packChallenges.id, challengeId)).limit(1))[0]
    if (!c || c.sectionId !== section.id) throw createError({ statusCode: 404, message: 'Not found' })
    const existing = (await db.select().from(s.packChallengeDone))
      .find(d => d.challengeId === challengeId && d.scoutId === scoutId)
    if (existing) await db.delete(s.packChallengeDone).where(eq(s.packChallengeDone.id, existing.id))
    else await db.insert(s.packChallengeDone).values({ challengeId, scoutId, markedBy: me.id, markedAt: now() })
    return { ok: true, done: !existing }
  }

  if (b?.action === 'remove') {
    const id = Number(b.challengeId)
    const c = (await db.select().from(s.packChallenges).where(eq(s.packChallenges.id, id)).limit(1))[0]
    if (!c || c.sectionId !== section.id) throw createError({ statusCode: 404, message: 'Not found' })
    await db.transaction(async tx => {
      await tx.delete(s.packChallengeDone).where(eq(s.packChallengeDone.challengeId, id))
      await tx.delete(s.packChallenges).where(eq(s.packChallenges.id, id))
    })
    return { ok: true }
  }

  const textEl = String(b?.textEl || '').trim()
  if (!textEl) throw createError({ statusCode: 400, message: 'Χρειάζεται κείμενο' })
  const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(String(b?.weekStart)) ? String(b.weekStart) : weekStartOf()
  const [row] = await db.insert(s.packChallenges).values({
    sectionId: section.id, textEl: textEl.slice(0, 300),
    emoji: String(b?.emoji || '🌟').slice(0, 4),
    weekStart, createdBy: me.id, createdAt: now()
  }).returning()
  return { id: row.id }
})
