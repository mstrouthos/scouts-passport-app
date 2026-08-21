import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { now } from '../../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ nameEl?: string, emoji?: string, sectionId?: number | null }>(event)
  const nameEl = String(b?.nameEl || '').trim()
  if (!nameEl) throw createError({ statusCode: 400, message: 'Name required' })

  const db = (await useDb())
  const secIds = await scopedSectionIds(me)
  let sectionId: number | null = b?.sectionId != null ? Number(b.sectionId) : null
  if (sectionId != null && !(await db.select().from(s.sections)).some(x => x.id === sectionId))
    throw createError({ statusCode: 400, message: 'Bad section' })
  if (secIds !== null) {
    // a sector leader can only create groups inside their own sector
    if (sectionId === null || !secIds.includes(sectionId)) sectionId = secIds[0] ?? null
    if (sectionId === null) throw createError({ statusCode: 403, message: 'No sector assigned' })
  }
  const [row] = (await db.insert(s.notifyGroups).values({
    nameEl, emoji: String(b?.emoji || '🎺').slice(0, 4), sectionId,
    createdBy: me.id, createdAt: now()
  }).returning())
  return { id: row.id }
})
