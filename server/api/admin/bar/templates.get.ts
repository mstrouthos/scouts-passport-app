import { useDb, schema as s } from '../../../db'
import { requireBarReader } from '../../../utils/bar'

/** Saved menus, to start the next event from. */
export default defineEventHandler(async (event) => {
  await requireBarReader(event)
  const db = await useDb()
  const items = await db.select().from(s.barMenuTemplateItems)
  return (await db.select().from(s.barMenuTemplates)).sort((a, b) => b.id - a.id)
    .map(t => ({ ...t, items: items.filter(i => i.templateId === t.id).sort((a, b) => a.sort - b.sort) }))
})
