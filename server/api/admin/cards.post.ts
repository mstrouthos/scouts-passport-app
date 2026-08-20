import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader, scopedScouts } from '../../utils/guard'
import { generatePasscode, hmacPasscode } from '../../utils/passcode'

/** Regenerates passcodes for the requested scouts (voiding old ones) and
    returns plaintexts once, for the printable card sheet. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const body = await readBody<{ scoutIds?: number[] }>(event)
  const ids = (body?.scoutIds || []).map(Number).filter(Number.isInteger)
  if (!ids.length) throw createError({ statusCode: 400, message: 'No scouts selected' })
  const mine = new Map((await scopedScouts(me)).map(r => [r.id, r]))
  const db = (await useDb())
  const patrols = new Map((await db.select().from(s.patrols)).map(p => [p.id, p]))
  const out = []
  for (const id of ids) {
    const r = mine.get(id)
    if (!r) throw createError({ statusCode: 403, message: 'Out of your sector' })
    const passcode = generatePasscode()
    await db.update(s.scouts).set({ passcodeHmac: hmacPasscode(passcode) }).where(eq(s.scouts.id, id))
    const p = r.patrolId ? patrols.get(r.patrolId) : null
    out.push({
      id, firstName: r.firstName, lastName: r.lastName,
      patrolEl: p?.nameEl ?? '', patrolEn: p?.nameEn ?? '', emblem: p?.emblem ?? '⚜️', passcode
    })
  }
  return out
})
