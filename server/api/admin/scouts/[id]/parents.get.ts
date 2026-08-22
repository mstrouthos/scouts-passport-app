import { useDb, schema as s } from '../../../../db'
import { requireLeader, idParam, assertScoutInScope } from '../../../../utils/guard'

/** The parents on one scout's profile. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  if (id !== me.id) await assertScoutInScope(me, id)
  const db = (await useDb())
  return (await db.select().from(s.parents))
    .filter(p => p.scoutId === id)
    .sort((a, b) => a.name.localeCompare(b.name, 'el'))
    .map(p => ({
      id: p.id, name: p.name, email: p.email, phone: p.phone,
      isActive: p.isActive, hasCode: !!p.passcodeHmac
    }))
})
