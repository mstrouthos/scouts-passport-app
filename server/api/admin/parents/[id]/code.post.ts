import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, idParam } from '../../../../utils/guard'
import { parentInScope } from '../[id].patch'
import { generatePasscode, hmacPasscode } from '../../../../utils/passcode'
import { sendSms } from '../../../../utils/sms'
import { sendEmails } from '../../../../utils/email'
import { assertCan } from '../../../../utils/permissions'

/** Issue (or re-issue) a parent's access code and optionally deliver it.
    Body: { via: 'sms' | 'email' | 'none' } */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'parents.view')
  const id = idParam(event)
  const db = (await useDb())
  const p = await parentInScope(me, id)

  const b = await readBody<{ via?: string }>(event).catch(() => ({}))
  const via = b?.via === 'sms' ? 'sms' : b?.via === 'email' ? 'email' : 'none'
  if (via === 'sms' && !p.phone) throw createError({ statusCode: 400, message: 'No phone on file' })
  if (via === 'email' && !p.email) throw createError({ statusCode: 400, message: 'No email on file' })

  const passcode = generatePasscode()
  await db.update(s.parents).set({ passcodeHmac: hmacPasscode(passcode) }).where(eq(s.parents.id, id))

  const section = (await db.select().from(s.sections)).find(x => x.id === p.sectionId)
  const origin = getRequestURL(event).origin
  let sent = false
  if (via === 'sms') {
    // kept short: Greek is UCS-2, ~70 chars per SMS part
    sent = (await sendSms([p.phone!], `Πύλη Προσκόπων: κωδικός γονέα ${passcode}. Οδηγίες: ${origin}/install?for=family`)) > 0
  } else if (via === 'email') {
    const body = `Καλησπέρα ${p.name},\n\n` +
      `Ο κωδικός σας για την ενημέρωση γονέων (${section?.nameEl ?? ''}) είναι: ${passcode}\n\n` +
      `Οδηγίες για να βάλετε την εφαρμογή στο κινητό σας: ${origin}/install?for=family\n` +
      `Συνδεθείτε εδώ: ${origin}/family\n\n` +
      `Θα βλέπετε το πρόγραμμα και τις ειδοποιήσεις του τμήματος του παιδιού σας.`
    sent = (await sendEmails([p.email!], 'Κωδικός γονέα — Πύλη Προσκόπων', body)) > 0
  }
  return { passcode, via, sent }
})
