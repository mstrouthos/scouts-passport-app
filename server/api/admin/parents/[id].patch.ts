import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds, idParam } from '../../../utils/guard'
import { normalizePhone } from '../../../utils/phone'
import { sectionOfParent } from '../../../utils/parents'
import { assertCan } from '../../../utils/permissions'

/** A parent is in scope when their child's section is. Scoping on the child
    means a scout moving up carries their parents' visibility with them. */
export async function parentInScope(me: any, id: number) {
  const db = (await useDb())
  const p = (await db.select().from(s.parents).where(eq(s.parents.id, id)).limit(1))[0]
  if (!p) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = await scopedSectionIds(me)
  if (secIds !== null) {
    const sec = sectionOfParent(p, await db.select().from(s.scouts), await db.select().from(s.patrols))
    if (sec == null || !secIds.includes(sec))
      throw createError({ statusCode: 403, message: 'Out of your sector' })
  }
  return p
}

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'parents.view')
  const id = idParam(event)
  await parentInScope(me, id)
  const b = await readBody<any>(event)
  const db = (await useDb())
  const set: any = {}
  if (b?.name !== undefined) {
    const v = String(b.name).trim()
    if (!v) throw createError({ statusCode: 400, message: 'Name required' })
    set.name = v
  }
  if (b?.email !== undefined) {
    const v = String(b.email || '').trim() || null
    if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) throw createError({ statusCode: 400, message: 'Bad email' })
    set.email = v
  }
  if (b?.phone !== undefined) set.phone = normalizePhone(b.phone)
  if (typeof b?.isActive === 'boolean') set.isActive = b.isActive
  if (Object.keys(set).length) await db.update(s.parents).set(set).where(eq(s.parents.id, id))
  return { ok: true }
})
