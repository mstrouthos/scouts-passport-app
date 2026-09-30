import { eq, and, isNull, isNotNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds, idParam } from '../../../utils/guard'
import { assertCan } from '../../../utils/permissions'
import { now, isAfter } from '../../../utils/passcode'

/** Delete a unit (ενωμοτία, όμιλος, εξάδα).

   Only what would really be lost stops it: members still in it, and its
   meetings still to come — both named, so it is clear what to move first.
   Everything else that pointed at it is kept and handed to its section:
   past meetings and challenges become the section's, points stay with the
   scouts who earned them, and a member in the trash simply loses the unit.
   Before, any of these made the delete fail, so a unit that had ever been
   used could not be deleted at all — and none could: it also tried to clear
   leader scopes by a patrol column those no longer have (scopes are per
   section now), which failed every delete. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'roster.edit')
  const id = idParam(event)
  const db = (await useDb())
  const patrol = (await db.select().from(s.patrols).where(eq(s.patrols.id, id)).limit(1))[0]
  if (!patrol) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = await scopedSectionIds(me)
  if (secIds !== null && !secIds.includes(patrol.sectionId))
    throw createError({ statusCode: 403, message: 'Out of your sector' })

  const members = (await db.select().from(s.scouts)).filter(r => r.patrolId === id && !r.deletedAt)
  if (members.length)
    throw createError({ statusCode: 400, message: `Μετακίνησε πρώτα τα μέλη της σε άλλη μονάδα: ${members.map(r => `${r.firstName} ${r.lastName}`).join(', ')}` })
  const t = now()
  const upcoming = (await db.select().from(s.events)).filter(e => e.patrolId === id && isAfter(e.startsAt, t))
  if (upcoming.length)
    throw createError({ statusCode: 400, message: `Έχει προγραμματισμένες συναντήσεις — διάγραψέ τες ή άλλαξέ τες πρώτα: ${upcoming.map(e => e.titleEl).join(', ')}` })

  await db.transaction(async (tx) => {
    // members in the trash lose the unit; restored, they are simply unassigned
    await tx.update(s.scouts).set({ patrolId: null, patrolRole: null }).where(and(eq(s.scouts.patrolId, id), isNotNull(s.scouts.deletedAt)))
    // its past meetings and its challenges become the section's
    await tx.update(s.events).set({ scope: 'section', sectionId: patrol.sectionId, patrolId: null }).where(eq(s.events.patrolId, id))
    await tx.update(s.challenges).set({ sectionId: patrol.sectionId, patrolId: null }).where(and(eq(s.challenges.patrolId, id), isNull(s.challenges.sectionId)))
    await tx.update(s.challenges).set({ patrolId: null }).where(eq(s.challenges.patrolId, id))
    // points stay with the scouts who earned them
    await tx.update(s.pointAwards).set({ patrolId: null }).where(eq(s.pointAwards.patrolId, id))
    await tx.delete(s.patrols).where(eq(s.patrols.id, id))
  })
  return { ok: true }
})
