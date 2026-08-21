import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, rankOf } from '../../utils/guard'
import { dispatchAnnouncement } from '../../utils/announce'
import { now } from '../../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{
    audience?: string, sectionId?: number, groupId?: number,
    textEl?: string, textEn?: string,
    viaSms?: boolean, scheduledAt?: string
  }>(event)
  const text = String(b?.textEl || '').trim()
  if (!text) throw createError({ statusCode: 400, message: 'Message required' })

  const secs = await scopedSectionIds(me)
  const rank = await rankOf(me)
  const db = (await useDb())
  let audience = ['troop', 'section', 'leaders', 'group'].includes(b?.audience as any) ? b!.audience as any : 'section'
  let sectionId = b?.sectionId != null ? Number(b.sectionId) : null
  let groupId: number | null = null

  if (audience === 'group') {
    groupId = Number(b?.groupId)
    const g = (await db.select().from(s.notifyGroups)).find(x => x.id === groupId)
    if (!g) throw createError({ statusCode: 400, message: 'Bad group' })
    if (secs !== null && (g.sectionId == null || !secs.includes(g.sectionId)))
      throw createError({ statusCode: 403, message: 'Out of your sector' })
    sectionId = null
  } else if (rank !== 'admin') {
    // sector leaders announce to their own section only
    audience = 'section'
    if (sectionId === null || !secs || !secs.includes(sectionId)) sectionId = secs?.[0] ?? null
    if (sectionId === null) throw createError({ statusCode: 403, message: 'No sector assigned' })
  } else if (audience !== 'section') {
    sectionId = null
  }

  // send now, or hold until a chosen time (the cron tick delivers it)
  let scheduledAt: string | null = null
  if (b?.scheduledAt) {
    const when = new Date(String(b.scheduledAt))
    if (Number.isNaN(when.getTime()))
      throw createError({ statusCode: 400, message: 'scheduledAt is not a valid date' })
    if (when.getTime() > Date.now() + 60_000) scheduledAt = when.toISOString()
  }
  const viaSms = !!b?.viaSms

  const canSendWithoutApproval = rank === 'admin' || rank === 'archigos'
  const [row] = (await db.insert(s.announcements).values({
    audience, sectionId, groupId, textEl: text, textEn: b?.textEn || null,
    viaPush: true, viaSms, scheduledAt,
    // scheduled only counts once it is allowed to go out unattended
    status: canSendWithoutApproval && scheduledAt ? 'scheduled' : 'pending',
    createdBy: me.id, createdAt: now()
  }).returning())

  if (canSendWithoutApproval && scheduledAt) return { id: row.id, status: 'scheduled', scheduledAt }
  // Αρχηγός and admin send immediately; Υπαρχηγός waits for approval
  if (canSendWithoutApproval) {
    const result = await dispatchAnnouncement(row, me.id)
    return { id: row.id, status: 'sent', ...result }
  }
  return { id: row.id, status: 'pending' }
})
