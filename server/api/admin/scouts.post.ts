import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { generatePasscode, hmacPasscode, now } from '../../utils/passcode'
import { normalizePhone } from '../../utils/phone'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const body = await readBody<{
    firstName?: string, lastName?: string, phone?: string,
    kind?: string, sectionId?: number, patrolId?: number, scope?: string, rank?: string
  }>(event)
  const firstName = String(body?.firstName || '').trim()
  const lastName = String(body?.lastName || '').trim()
  const phone = normalizePhone(body?.phone)
  if (!firstName || !lastName) throw createError({ statusCode: 400, message: 'Name required' })
  const db = useDb()
  const passcode = generatePasscode()

  // Βαθμοφόροι are added the same way as members, from the same sheet — but
  // only the troop leader may hand out section/troop-level scope (mirrors roles.post.ts).
  if (body?.kind === 'leader') {
    if (me.role !== 'troop_leader')
      throw createError({ statusCode: 403, message: 'Only the troop leader can add Βαθμοφόροι' })
    const rank = body?.rank === 'yparchigos' ? 'yparchigos' : 'archigos'
    const scope = body?.scope === 'section' ? 'section' : 'troop'
    let sectionId: number | null = null
    if (scope === 'section') {
      sectionId = Number(body?.sectionId)
      if (!db.select().from(s.sections).all().some(x => x.id === sectionId))
        throw createError({ statusCode: 400, message: 'Bad section' })
    }
    const [row] = db.insert(s.scouts).values({
      firstName, lastName, phone, role: 'leader',
      passcodeHmac: hmacPasscode(passcode), createdAt: now(), joinedOn: now().slice(0, 10)
    }).returning().all()
    db.insert(s.leaderScopes).values({ scoutId: row.id, scope, sectionId, rank, assignedBy: me.id, assignedAt: now() }).run()
    return { id: row.id, passcode }
  }

  const sectionId = Number(body?.sectionId)
  if (!Number.isInteger(sectionId))
    throw createError({ statusCode: 400, message: 'Name and section required' })
  const sec = db.select().from(s.sections).all().find(x => x.id === sectionId)
  if (!sec) throw createError({ statusCode: 400, message: 'Bad section' })
  const secIds = scopedSectionIds(me)
  if (secIds !== null && !secIds.includes(sectionId))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  let patrolId: number | null = body?.patrolId != null ? Number(body.patrolId) : null
  if (patrolId != null) {
    const p = db.select().from(s.patrols).all().find(x => x.id === patrolId)
    if (!p || p.sectionId !== sectionId) patrolId = null
  }
  const [row] = db.insert(s.scouts).values({
    firstName, lastName, sectionId, patrolId, phone,
    passcodeHmac: hmacPasscode(passcode), createdAt: now(), joinedOn: now().slice(0, 10)
  }).returning().all()
  return { id: row.id, passcode }
})
