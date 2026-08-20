import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { generatePasscode, hmacPasscode, now } from '../../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const body = await readBody<{ firstName?: string, lastName?: string, sectionId?: number, patrolId?: number, phone?: string }>(event)
  const firstName = String(body?.firstName || '').trim()
  const lastName = String(body?.lastName || '').trim()
  const phone = String(body?.phone || '').trim() || null
  const sectionId = Number(body?.sectionId)
  if (!firstName || !lastName || !Number.isInteger(sectionId))
    throw createError({ statusCode: 400, message: 'Name and section required' })
  const db = useDb()
  const sec = db.select().from(s.sections).all().find(x => x.id === sectionId)
  if (!sec || !sec.hasApp)
    throw createError({ statusCode: 400, message: 'Members exist only in app sections' })
  const secIds = scopedSectionIds(me)
  if (secIds !== null && !secIds.includes(sectionId))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  let patrolId: number | null = body?.patrolId != null ? Number(body.patrolId) : null
  if (patrolId != null) {
    const p = db.select().from(s.patrols).all().find(x => x.id === patrolId)
    if (!p || p.sectionId !== sectionId) patrolId = null
  }
  const passcode = generatePasscode()
  const [row] = db.insert(s.scouts).values({
    firstName, lastName, sectionId, patrolId, phone,
    passcodeHmac: hmacPasscode(passcode), createdAt: now(), joinedOn: now().slice(0, 10)
  }).returning().all()
  return { id: row.id, passcode }
})
