import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireTroopLeader } from '../../../utils/guard'

/** An administrator approves a page a Βαθμοφόρος submitted: it is published. */
export default defineEventHandler(async (event) => {
  await requireTroopLeader(event)
  const b = await readBody<{ id?: number }>(event)
  const db = await useDb()
  const page = (await db.select().from(s.infoPages).where(eq(s.infoPages.id, Number(b?.id))).limit(1))[0]
  if (!page) throw createError({ statusCode: 404, message: 'Not found' })
  await db.update(s.infoPages).set({ isPublished: true, pendingApproval: false }).where(eq(s.infoPages.id, page.id))
  return { ok: true }
})
