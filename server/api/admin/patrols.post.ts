import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { assertCan } from '../../utils/permissions'

const EMOJI = ['🦉', '🦅', '🐺', '🐍', '🦊', '🦌', '🐻', '🦫', '🦔', '🐿️']

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'roster.edit')
  const b = await readBody<{ sectionId?: number, nameEl?: string, nameEn?: string, emblem?: string }>(event)
  const sectionId = Number(b?.sectionId)
  const nameEl = String(b?.nameEl || '').trim()
  if (!nameEl || !Number.isInteger(sectionId))
    throw createError({ statusCode: 400, message: 'Name and section required' })
  const secIds = await scopedSectionIds(me)
  if (secIds !== null && !secIds.includes(sectionId))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  const db = (await useDb())
  if (!(await db.select().from(s.sections)).some(x => x.id === sectionId))
    throw createError({ statusCode: 400, message: 'Bad section' })
  const existing = (await db.select().from(s.patrols)).filter(p => p.sectionId === sectionId)
  const [row] = (await db.insert(s.patrols).values({
    sectionId, nameEl, nameEn: b?.nameEn || null,
    emblem: b?.emblem || EMOJI[existing.length % EMOJI.length],
    sortOrder: existing.length
  }).returning())
  return { id: row.id }
})
