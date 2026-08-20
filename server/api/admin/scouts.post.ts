import { useDb, schema as s } from '../../db'
import { requireLeader, scopedPatrolIds } from '../../utils/guard'
import { generatePasscode, hmacPasscode, now } from '../../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const body = await readBody<{ firstName?: string, lastName?: string, patrolId?: number }>(event)
  const firstName = String(body?.firstName || '').trim()
  const lastName = String(body?.lastName || '').trim()
  const patrolId = Number(body?.patrolId)
  if (!firstName || !lastName || !Number.isInteger(patrolId))
    throw createError({ statusCode: 400, message: 'Name and patrol required' })
  const pids = scopedPatrolIds(me)
  if (pids !== null && !pids.includes(patrolId))
    throw createError({ statusCode: 403, message: 'Out of your sector' })

  const passcode = generatePasscode()
  const [row] = useDb().insert(s.scouts).values({
    firstName, lastName, patrolId,
    passcodeHmac: hmacPasscode(passcode), createdAt: now(), joinedOn: now().slice(0, 10)
  }).returning().all()
  return { id: row.id, passcode }
})
