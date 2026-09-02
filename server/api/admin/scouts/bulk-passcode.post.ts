import { eq, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedScouts, scopedSectionIds, sectionOfWith } from '../../../utils/guard'
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

  const b = await readBody<{ scoutIds?: number[], parentIds?: number[], send?: boolean }>(event)
  const ids = [...new Set((b?.scoutIds || []).map(Number).filter(Number.isInteger))]
  const parentIds = [...new Set((b?.parentIds || []).map(Number).filter(Number.isInteger))]
  if (!ids.length && !parentIds.length) throw createError({ statusCode: 400, message: 'Nobody selected' })
  if (ids.length + parentIds.length > 300) throw createError({ statusCode: 400, message: 'Too many at once (max 300)' })

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

  const results: Array<{ id: number, kind: 'scout' | 'parent', name: string, passcode: string, sent: boolean, reason?: string }> = []
  // Every code travels with the install instructions — a code without a way
  // to get the app onto the phone is half a message. Greek is UCS-2, ~70
  // characters per SMS part, so this is kept as tight as it will go.
  const text = (passcode: string) => `Πύλη Προσκόπων: κωδικός ${passcode}. Οδηγίες: ${origin}/install`

  for (const r of rows) {
    const passcode = generatePasscode()
    await db.update(s.scouts).set({ passcodeHmac: hmacPasscode(passcode) }).where(eq(s.scouts.id, r.id))

    let sent = false, reason: string | undefined
    if (b?.send === false) reason = 'notSent'
    else if (!r.phone) reason = 'noPhone'
    else {
      sent = (await sendSms([r.phone], text(passcode))) > 0
      if (!sent) reason = 'smsFailed'
    }
    results.push({ id: r.id, kind: 'scout', name: `${r.firstName} ${r.lastName}`, passcode, sent, reason })
  }

  // Parents hold their own code. A sector leader may reissue for the families
  // of their own sector; the Αρχηγός Συστήματος for anyone.
  if (parentIds.length) {
    const secIds = await scopedSectionIds(me)
    const links = await db.select().from(s.parentChildren)
    const allScouts = await db.select().from(s.scouts)
    const patrols = await db.select().from(s.patrols)
    const prows = (await db.select().from(s.parents)).filter(r => parentIds.includes(r.id) && r.isActive)
    if (prows.length !== parentIds.length) throw createError({ statusCode: 400, message: 'Unknown parent in that list' })
    if (secIds !== null) {
      for (const r of prows) {
        const kidIds = new Set(links.filter(l => l.parentId === r.id).map(l => l.scoutId))
        if (r.scoutId != null) kidIds.add(r.scoutId)
        const sids = [...kidIds]
          .map(cid => allScouts.find(x => x.id === cid))
          .filter(Boolean)
          .map(k => sectionOfWith(k as any, patrols))
          .filter(x => x != null) as number[]
        const reachable = sids.some(sid => secIds.includes(sid)) || secIds.includes(r.sectionId)
        if (!reachable) throw createError({ statusCode: 403, message: 'A family in that list is out of your sector' })
      }
    }
    for (const r of prows) {
      const passcode = generatePasscode()
      await db.update(s.parents).set({ passcodeHmac: hmacPasscode(passcode) }).where(eq(s.parents.id, r.id))
      let sent = false, reason: string | undefined
      if (b?.send === false) reason = 'notSent'
      else if (!r.phone) reason = 'noPhone'
      else {
        sent = (await sendSms([r.phone], text(passcode))) > 0
        if (!sent) reason = 'smsFailed'
      }
      results.push({ id: r.id, kind: 'parent', name: r.name, passcode, sent, reason })
    }
  }

  console.log(`[launch] ${me.firstName} ${me.lastName} reissued ${results.length} codes, ${results.filter(x => x.sent).length} texted`)
  return {
    issued: results.length,
    sent: results.filter(x => x.sent).length,
    results
  }
})
