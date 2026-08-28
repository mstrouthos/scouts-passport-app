import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, idParam, rankOf } from '../../../utils/guard'
import { eventInScope, eventHasData } from '../../../utils/eventScope'
import { assertCan } from '../../../utils/permissions'

/** Remove an event and everything recorded against it.

   A finished event carrying attendance or points is normally kept, since
   deleting it rewrites the leaderboard without saying so. The Αρχηγός
   Συστήματος may delete it anyway — clearing up after a mistake is their job,
   and they are the one who sees the whole troop's scores.

   Children go first, in one transaction: RSVPs reference the event too, and
   forgetting one does not fail quietly — it makes deletion impossible. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'events.edit')
  const id = idParam(event)
  const ev = await eventInScope(me, id)

  if ((await rankOf(me)) !== 'admin') {
    const past = new Date(ev.endsAt || ev.startsAt).getTime() < Date.now()
    const data = await eventHasData(id)
    if (past && data.any)
      throw createError({
        statusCode: 400,
        message: 'This event has already been reviewed — only the Αρχηγός Συστήματος can delete it'
      })
  }

  const db = (await useDb())
  await db.transaction(async tx => {
    await tx.delete(s.eventRsvps).where(eq(s.eventRsvps.eventId, id))
    await tx.delete(s.pointAwards).where(eq(s.pointAwards.eventId, id))
    await tx.delete(s.eventReviews).where(eq(s.eventReviews.eventId, id))
    await tx.delete(s.events).where(eq(s.events.id, id))
  })
  return { ok: true }
})
