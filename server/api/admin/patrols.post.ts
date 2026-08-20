import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'

const EMOJI = ['🦉', '🦅', '🐺', '🐍', '🦊', '🦌', '🐻', '🦫', '🦔', '🐿️']

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ sectionId?: number, nameEl?: string, nameEn?: string, emblem?: string }>(event)
  const sectionId = Number(b?.sectionId)
  const nameEl = String(b?.nameEl || '').trim()
  if (!nameEl || !Number.isInteger(sectionId))
    throw createError({ statusCode: 400, message: 'Name and section required' })
  const secIds = scopedSectionIds(me)
  if (secIds !== null && !secIds.includes(sectionId))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  const db = useDb()
  if (!db.select().from(s.sections).all().some(x => x.id === sectionId))
    throw createError({ statusCode: 400, message: 'Bad section' })
  const existing = db.select().from(s.patrols).all().filter(p => p.sectionId === sectionId)
  const [row] = db.insert(s.patrols).values({
    sectionId, nameEl, nameEn: b?.nameEn || null,
    emblem: b?.emblem || EMOJI[existing.length % EMOJI.length],
    sortOrder: existing.length
  }).returning().all()
  return { id: row.id }
})
