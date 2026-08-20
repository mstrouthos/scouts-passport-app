import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, assertScoutInScope, idParam } from '../../../../utils/guard'
import { generatePasscode, hmacPasscode } from '../../../../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  assertScoutInScope(me, id)
  const passcode = generatePasscode()
  useDb().update(s.scouts).set({ passcodeHmac: hmacPasscode(passcode) }).where(eq(s.scouts.id, id)).run()
  return { passcode }
})
