import { sql } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { now } from '../../utils/passcode'

/** A Βαθμοφόρος has a poll or an event in front of them — opened from its
    notification, or found on the page. Kept once per person, with the first
    and last time and whether a notification brought them. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ kind?: string, id?: number, via?: string }>(event)
  const kind = b?.kind === 'poll' || b?.kind === 'event' ? b.kind : null
  const refId = Number(b?.id)
  if (!kind || !Number.isInteger(refId)) throw createError({ statusCode: 400, message: 'Bad view' })
  // a hidden test account's look is not anyone's
  if (me.isHidden) return { ok: true }
  const t = now()
  const fromN = b?.via === 'notification' ? t : null
  await (await useDb()).insert(s.contentViews).values({ kind, refId, scoutId: me.id, firstAt: t, lastAt: t, fromNotificationAt: fromN })
    .onConflictDoUpdate({
      target: [s.contentViews.kind, s.contentViews.refId, s.contentViews.scoutId],
      set: { lastAt: t, fromNotificationAt: sql`COALESCE(${s.contentViews.fromNotificationAt}, ${fromN})` }
    })
  return { ok: true }
})
