import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, rankOf } from '../../utils/guard'
import { dispatchAnnouncement } from '../../utils/announce'
import { now } from '../../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ audience?: string, sectionId?: number, textEl?: string, textEn?: string }>(event)
  const text = String(b?.textEl || '').trim()
  if (!text) throw createError({ statusCode: 400, message: 'Message required' })

  const secs = await scopedSectionIds(me)
  const rank = await rankOf(me)
  let audience = ['troop', 'section', 'leaders'].includes(b?.audience as any) ? b!.audience as any : 'section'
  let sectionId = b?.sectionId != null ? Number(b.sectionId) : null

  if (rank !== 'admin') {
    // sector leaders announce to their own section only
    audience = 'section'
    if (sectionId === null || !secs || !secs.includes(sectionId)) sectionId = secs?.[0] ?? null
    if (sectionId === null) throw createError({ statusCode: 403, message: 'No sector assigned' })
  } else if (audience !== 'section') {
    sectionId = null
  }

  const [row] = (await (await useDb()).insert(s.announcements).values({
    audience, sectionId, textEl: text, textEn: b?.textEn || null,
    status: 'pending', createdBy: me.id, createdAt: now()
  }).returning())

  // Αρχηγός and admin send immediately; Υπαρχηγός waits for approval
  if (rank === 'admin' || rank === 'archigos') {
    const result = await dispatchAnnouncement(row, me.id)
    return { id: row.id, status: 'sent', ...result }
  }
  return { id: row.id, status: 'pending' }
})
