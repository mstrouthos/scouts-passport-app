import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, assertScoutInScope, idParam } from '../../../../utils/guard'
import { generatePasscode, hmacPasscode } from '../../../../utils/passcode'
import { sendSms } from '../../../../utils/sms'

/** Text a scout's login passcode to their phone on file. If the exact current
    passcode is supplied (e.g. right after creation, while it's still known in
    plaintext) it's sent as-is; otherwise a fresh one is generated and sent —
    this is also how "send/resend the invite later" works from the scout's
    own page, since only the HMAC of the passcode is ever stored. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  if (id !== me.id && me.role !== 'troop_leader') assertScoutInScope(me, id)
  const body = await readBody<{ passcode?: string }>(event).catch(() => ({}))

  const db = useDb()
  const row = db.select().from(s.scouts).where(eq(s.scouts.id, id)).get()
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  if (!row.phone) throw createError({ statusCode: 400, message: 'No phone on file' })

  let passcode = body?.passcode
  if (!passcode || hmacPasscode(passcode) !== row.passcodeHmac) {
    passcode = generatePasscode()
    db.update(s.scouts).set({ passcodeHmac: hmacPasscode(passcode) }).where(eq(s.scouts.id, id)).run()
  }

  // Kept short on purpose: Greek text is sent as UCS-2, which fits only ~70
  // characters per SMS part, so a longer message costs (and can fail) double.
  const message = row.locale === 'en'
    ? `Scout Passport: your login code is ${passcode}`
    : `Πύλη Προσκόπων: ο κωδικός εισόδου σου είναι ${passcode}`
  const sent = (await sendSms([row.phone], message)) > 0

  return { passcode, sent }
})
