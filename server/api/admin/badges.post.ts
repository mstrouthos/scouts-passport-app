import { useDb, schema as s } from '../../db'
import { requireTroopLeader } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  await requireTroopLeader(event)
  const b = await readBody<any>(event)
  if (!b?.titleEl) throw createError({ statusCode: 400, message: 'Greek title required' })
  const [row] = useDb().insert(s.achievements).values({
    titleEl: String(b.titleEl), titleEn: b.titleEn || null,
    descriptionEl: b.descriptionEl || '', descriptionEn: b.descriptionEn || null,
    iconEmoji: b.iconEmoji || '🏅', sortOrder: Number(b.sortOrder) || 99
  }).returning().all()
  return { id: row.id }
})
