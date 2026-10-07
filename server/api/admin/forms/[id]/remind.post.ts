import { and, eq, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { idParam } from '../../../../utils/guard'
import { formForLeader, isAccepting, logAccess } from '../../../../utils/forms'
import { inviteStatus } from '../../../../utils/familyForms'
import { sendPushToParentIds } from '../../../../utils/push'
import { now } from '../../../../utils/passcode'

const GAP_MS = 20 * 3600_000

/** A reminder to the parents who were sent a form and have not answered it:
    a notification that opens it, at most once a day per form. */
export default defineEventHandler(async (event) => {
  const { me, f } = await formForLeader(event, idParam(event))
  if (!isAccepting(f)) throw createError({ statusCode: 400, message: 'Η φόρμα δεν δέχεται πια απαντήσεις' })
  const st = await inviteStatus(f.id)
  if (st.lastReminder && Date.now() - Date.parse(st.lastReminder) < GAP_MS)
    throw createError({ statusCode: 429, message: 'Στάλθηκε ήδη υπενθύμιση σήμερα — δοκιμάστε αύριο' })
  const ids = st.pending.map(p => p.parentId)
  if (!ids.length) return { ok: true, parents: 0 }
  const db = await useDb()
  // each reminder is a fresh notification: the one before it is let go from
  // the log that otherwise keeps a parent from being told the same thing twice
  await db.delete(s.notificationLog).where(and(
    inArray(s.notificationLog.scoutId, ids.map(id => -1_000_000 - id)),
    eq(s.notificationLog.kind, 'formReminder'), eq(s.notificationLog.refId, f.id)))
  await sendPushToParentIds(ids, { title: `⏰ ${f.titleEl}`, body: 'Υπενθύμιση: η φόρμα περιμένει να τη συμπληρώσετε.', kind: 'formReminder', refId: f.id })
  const t = now()
  await db.insert(s.formInvites).values(ids.map(parentId => ({ formId: f.id, parentId, sentAt: t, remindedAt: t })))
    .onConflictDoUpdate({ target: [s.formInvites.formId, s.formInvites.parentId], set: { remindedAt: t } })
  await logAccess(f.id, me.id, 'remind-parents')
  return { ok: true, parents: ids.length }
})
