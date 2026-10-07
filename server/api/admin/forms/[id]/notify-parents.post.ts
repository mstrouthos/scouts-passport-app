import { eq } from 'drizzle-orm'
import { idParam } from '../../../../utils/guard'
import { formForLeader, isAccepting, logAccess } from '../../../../utils/forms'
import { sendPushToParents, sendPushToParentIds } from '../../../../utils/push'
import { audienceOf, parentSectionsOf } from '../../../../utils/familyForms'
import { useDb, schema as s } from '../../../../db'
import { now } from '../../../../utils/passcode'

/** Tell the parents a form is for that it is waiting for them: a notification
    in the app's bell and on their phones, opening it. Only to the sectors
    chosen for it (saved first, on their own), only while it takes answers,
    and once per parent — a family added since is told when this is pressed
    again; a reminder is a separate thing. */
export default defineEventHandler(async (event) => {
  const { me, f } = await formForLeader(event, idParam(event))
  if (!isAccepting(f)) throw createError({ statusCode: 400, message: 'Ανοίξτε πρώτα τη φόρμα' })
  const secs = parentSectionsOf(f)
  if (!secs?.length) throw createError({ statusCode: 400, message: 'Διαλέξτε πρώτα σε ποιους γονείς απευθύνεται' })
  const db = await useDb()
  const audience = await audienceOf(f)
  const t = now()
  if (audience.length) {
    await db.insert(s.formInvites).values(audience.map(parentId => ({ formId: f.id, parentId, sentAt: t }))).onConflictDoNothing()
  }
  const msg = { title: `📋 ${f.titleEl}`, body: 'Πατήστε για να συμπληρώσετε τη φόρμα.', kind: 'formInvite', refId: f.id }
  // the bell and phones of those who signed in; and the sector-wide
  // subscriptions of phones that never did
  const devices = await sendPushToParentIds(audience, msg) + await sendPushToParents(secs, msg)
  await db.update(s.forms).set({ parentsNotifiedAt: t }).where(eq(s.forms.id, f.id))
  await logAccess(f.id, me.id, `notify-parents:${secs.join(',')}`)
  return { ok: true, parents: audience.length, devices }
})
