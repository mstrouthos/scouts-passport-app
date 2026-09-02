import { useDb, schema as s } from '../../../../db'
import { requireLeader, idParam, assertScoutInScope } from '../../../../utils/guard'
import { assertCan } from '../../../../utils/permissions'
import { childIdsOfParent } from '../../../../utils/parents'

/** The parents on one scout's profile — everyone linked to this child, not
    only whoever was entered against them first. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'parents.view')
  const id = idParam(event)
  if (id !== me.id) await assertScoutInScope(me, id)
  const db = (await useDb())
  const links = await db.select().from(s.parentChildren)
  return (await db.select().from(s.parents))
    .filter(p => childIdsOfParent(p, links).includes(id))
    .sort((a, b) => a.name.localeCompare(b.name, 'el'))
    .map(p => ({
      id: p.id, name: p.name, email: p.email, phone: p.phone,
      isActive: p.isActive, hasCode: !!p.passcodeHmac,
      // how many children they have in all — removing from this one is not
      // the same as deleting the family
      children: childIdsOfParent(p, links).length
    }))
})
