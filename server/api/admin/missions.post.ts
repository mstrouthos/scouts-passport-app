import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { now } from '../../utils/passcode'
import { canManage } from '../../utils/missions'

/** A new mission, open from now (or from when it says) until it closes. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<any>(event)
  const fields = clean(b)
  if (!(await canManage(me, fields))) throw createError({ statusCode: 403, message: 'Δεν είναι στον τομέα σας' })
  const db = await useDb()
  const t = now()
  const [row] = await db.insert(s.missions).values({ ...fields, opensAt: fields.opensAt || t, createdBy: me.id, createdAt: t }).returning({ id: s.missions.id })
  return { id: row.id }
})

export function clean(b: any) {
  const titleEl = String(b?.titleEl || '').trim().slice(0, 200)
  if (!titleEl) throw createError({ statusCode: 400, message: 'Χρειάζεται τίτλος' })
  const date = (v: any) => {
    if (!v) return null
    const d = new Date(String(v))
    if (Number.isNaN(d.getTime())) throw createError({ statusCode: 400, message: 'Μη έγκυρη ημερομηνία' })
    return d.toISOString()
  }
  return {
    titleEl,
    descriptionEl: String(b?.descriptionEl || '').trim().slice(0, 3000),
    emoji: [...String(b?.emoji || '📸').trim()].slice(0, 2).join('') || '📸',
    points: Math.max(0, Math.min(500, Math.round(Number(b?.points) || 0))),
    sectionId: b?.sectionId ? Number(b.sectionId) : null,
    opensAt: date(b?.opensAt) as string,
    closesAt: date(b?.closesAt),
    isPublished: b?.isPublished !== false
  }
}
