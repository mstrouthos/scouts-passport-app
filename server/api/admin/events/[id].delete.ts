import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, idParam } from '../../../utils/guard'
import { eventInScope, eventHasData } from '../../../utils/eventScope'
import { assertCan } from '../../../utils/permissions'

/** Upcoming events can always be removed. A finished one that already carries
    attendance or awarded points is history and is kept — deleting it would
    silently rewrite the leaderboard. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'events.edit')
  const id = idParam(event)
  const ev = await eventInScope(me, id)
  const past = new Date(ev.endsAt || ev.startsAt).getTime() < Date.now()
  const data = await eventHasData(id)
  if (past && data.any)
    throw createError({
      statusCode: 400,
      message: 'This event has already been reviewed — it cannot be deleted'
    })

  const db = (await useDb())
  await db.delete(s.pointAwards).where(eq(s.pointAwards.eventId, id))
  await db.delete(s.eventReviews).where(eq(s.eventReviews.eventId, id))
  await db.delete(s.events).where(eq(s.events.id, id))
  return { ok: true }
})
