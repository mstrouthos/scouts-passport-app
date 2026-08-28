import { eq, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedScouts } from '../../../utils/guard'
import { assertCan } from '../../../utils/permissions'
import { generatePasscode, hmacPasscode, now } from '../../../utils/passcode'
import { sendSms } from '../../../utils/sms'

/** Issue fresh access codes to a batch of people and text them out.

    Built for the launch: everyone gets a code and a link telling them how to
    put the app on their phone. Reissuing invalidates whatever they had, so the
    result reports exactly who was texted and who has no number on file. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'roster.edit')

  const b = await readBody<{ scoutIds?: number[], includeInstall?: boolean, send?: boolean }>(event)
  const ids = [...new Set((b?.scoutIds || []).map(Number).filter(Number.isInteger))]
  if (!ids.length) throw createError({ statusCode: 400, message: 'Nobody selected' })
  if (ids.length > 300) throw createError({ statusCode: 400, message: 'Too many at once (max 300)' })

  // everyone in the batch must be someone this leader manages, or a Βαθμοφόρος
  // if they are the Αρχηγός Συστήματος
  const db = await useDb()
  const mine = new Set((await scopedScouts(me)).map(r => r.id))
  if (me.role === 'troop_leader')
    for (const r of await db.select().from(s.scouts)) mine.add(r.id)
  const outsider = ids.find(id => !mine.has(id))
  if (outsider) throw createError({ statusCode: 403, message: 'Someone in that list is out of your sector' })

  const origin = getRequestURL(event).origin
  const rows = (await db.select().from(s.scouts)).filter(r => ids.includes(r.id) && r.isActive)

  const results: Array<{ id: number, name: string, passcode: string, sent: boolean, reason?: string }> = []
  for (const r of rows) {
    const passcode = generatePasscode()
    await db.update(s.scouts).set({ passcodeHmac: hmacPasscode(passcode) }).where(eq(s.scouts.id, r.id))

    let sent = false, reason: string | undefined
    if (b?.send === false) reason = 'notSent'
    else if (!r.phone) reason = 'noPhone'
    else {
      // Greek is UCS-2, ~70 characters per SMS part — keep it to one where we can
      const text = b?.includeInstall
        ? `Πύλη Προσκόπων: κωδικός ${passcode}. Οδηγίες: ${origin}/install`
        : `Πύλη Προσκόπων: ο κωδικός σου είναι ${passcode}`
      sent = (await sendSms([r.phone], text)) > 0
      if (!sent) reason = 'smsFailed'
    }
    results.push({ id: r.id, name: `${r.firstName} ${r.lastName}`, passcode, sent, reason })
  }

  console.log(`[launch] ${me.firstName} ${me.lastName} reissued ${results.length} codes, ${results.filter(x => x.sent).length} texted`)
  return {
    issued: results.length,
    sent: results.filter(x => x.sent).length,
    results
  }
})
