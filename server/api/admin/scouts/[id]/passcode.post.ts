import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, assertScoutInScope, idParam } from '../../../../utils/guard'
import { generatePasscode, hmacPasscode, passcodeVersion } from '../../../../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  // any leader may rotate their own passcode; the troop leader may rotate anyone's;
  // sector leaders may rotate their own scouts'
  if (id !== me.id && me.role !== 'troop_leader') await assertScoutInScope(me, id)
  const passcode = generatePasscode()
  const hmac = hmacPasscode(passcode)
  await (await useDb()).update(s.scouts).set({ passcodeHmac: hmac }).where(eq(s.scouts.id, id))
  // Rotating a passcode signs out devices holding the old one. When you rotate
  // your OWN, re-stamp the current session so you are not logged out of the
  // screen that is showing you the new code.
  if (id === me.id)
    await setUserSession(event, { user: { id: me.id, role: me.role, pv: passcodeVersion(hmac) } })
  return { passcode }
})
