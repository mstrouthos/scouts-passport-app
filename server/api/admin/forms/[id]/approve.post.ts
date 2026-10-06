import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { idParam } from '../../../../utils/guard'
import { formForLeader, isArchigosFor } from '../../../../utils/forms'
import { now } from '../../../../utils/passcode'
import { sendPushTo } from '../../../../utils/push'
import { noteError } from '../../../../utils/errorReport'

/** The sector's Αρχηγός (or an administrator) approves a form an Υπαρχηγός
    made: it may now be opened. Whoever made it is told. */
export default defineEventHandler(async (event) => {
  const { me, f } = await formForLeader(event, idParam(event))
  if (!(await isArchigosFor(me, f.sectionId))) throw createError({ statusCode: 403, message: 'Την εγκρίνει ο Αρχηγός του τομέα' })
  if (!f.pendingApproval) return { ok: true }
  const db = await useDb()
  await db.update(s.forms).set({ pendingApproval: false, approvedBy: me.id, approvedAt: now() }).where(eq(s.forms.id, f.id))
  if (f.createdBy && f.createdBy !== me.id) {
    try {
      await sendPushTo([f.createdBy], { title: '✅ Η φόρμα εγκρίθηκε', body: f.titleEl, kind: 'formApproved', refId: f.id })
    } catch (e) { noteError('Φόρμες — ειδοποίηση έγκρισης', e, { form: f.id }) }
  }
  return { ok: true }
})
