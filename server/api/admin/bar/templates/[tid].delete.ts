import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireBarAdmin } from '../../../../utils/bar'

export default defineEventHandler(async (event) => {
  await requireBarAdmin(event)
  const tid = Number(getRouterParam(event, 'tid'))
  const db = await useDb()
  await db.delete(s.barMenuTemplateItems).where(eq(s.barMenuTemplateItems.templateId, tid))
  await db.delete(s.barMenuTemplates).where(eq(s.barMenuTemplates.id, tid))
  return { ok: true }
})
