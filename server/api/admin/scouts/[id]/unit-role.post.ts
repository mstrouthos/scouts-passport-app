import { eq, and } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, idParam, assertScoutInScope, sectionOfWith } from '../../../../utils/guard'
import { assertCan } from '../../../../utils/permissions'
import { unitNames } from '../../../../utils/unitNames'

/** Name a scout as the head of their own ενωμοτία / όμιλος / εξάδα, or their
    deputy. It is a title within the unit — it grants nothing in the app — and
    only a member of that unit can hold it. Body: { role: 'head'|'deputy'|null } */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  await assertCan(me, 'roster.edit')
  await assertScoutInScope(me, id)

  const b = await readBody<{ role?: string | null }>(event)
  const role = b?.role === 'head' ? 'head' : b?.role === 'deputy' ? 'deputy' : null

  const db = await useDb()
  const kid = (await db.select().from(s.scouts).where(eq(s.scouts.id, id)).limit(1))[0]
  if (!kid) throw createError({ statusCode: 404, message: 'Not found' })
  if (kid.role !== 'scout')
    throw createError({ statusCode: 400, message: 'Ο επικεφαλής είναι μέλος της ομάδας, όχι βαθμοφόρος' })
  if (role && kid.patrolId == null) {
    const patrols = await db.select().from(s.patrols)
    const sectionId = sectionOfWith(kid as any, patrols)
    const sec = (await db.select().from(s.sections)).find(x => x.id === sectionId)
    const n = unitNames(sec?.slug)
    throw createError({ statusCode: 400, message: `Δεν ανήκει σε ${n.unitEl.toLowerCase()}` })
  }

  // one head and one deputy per unit: appointing a new one stands the old down
  if (role && kid.patrolId != null) {
    await db.update(s.scouts).set({ patrolRole: null })
      .where(and(eq(s.scouts.patrolId, kid.patrolId), eq(s.scouts.patrolRole, role)))
  }
  await db.update(s.scouts).set({ patrolRole: role }).where(eq(s.scouts.id, id))
  return { ok: true, role }
})
