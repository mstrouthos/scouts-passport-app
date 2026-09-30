import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { sendPushTo } from '../../utils/push'

/** Create or update an info page (upsert by slug).

   Every Βαθμοφόρος may write one; only an administrator publishes. A page
   written by anyone else is a draft until they submit it, then waits for an
   administrator's approval — who is told it is waiting. A page already
   published is changed by administrators only, so nothing reaches scouts and
   families that one of them has not seen. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const isAdmin = me.role === 'troop_leader'
  const b = await readBody<any>(event)
  const slug = String(b?.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
  if (!slug || !b?.titleEl) throw createError({ statusCode: 400, message: 'Slug and Greek title required' })
  const db = (await useDb())
  const set = {
    iconEmoji: b.iconEmoji || 'ℹ️',
    titleEl: String(b.titleEl), titleEn: b.titleEn || null,
    summaryEl: b.summaryEl || '', summaryEn: b.summaryEn || null,
    bodyEl: b.bodyEl || '', bodyEn: b.bodyEn || null,
    isPublished: isAdmin && !!b.isPublished,
    pendingApproval: !isAdmin && !!b.submitForApproval
  }
  // null = written once for the whole troop; a section id = only that sector
  const sectionId = b?.sectionId == null || b.sectionId === '' ? null : Number(b.sectionId)
  if (sectionId != null && !(await db.select().from(s.sections)).some(x => x.id === sectionId))
    throw createError({ statusCode: 400, message: 'Bad section' })

  // a page is identified by slug *and* sector, so "Στολές" can differ per sector
  const existing = (await db.select().from(s.infoPages))
    .find(x => x.slug === slug && (x.sectionId ?? null) === sectionId)
  // the order is set by dragging: an edit keeps a page's place, a new page
  // takes its slug's place if another sector has it, else goes to the end
  const all = await db.select().from(s.infoPages)
  const sortOrder = all.find(x => x.slug === slug)?.sortOrder ?? (Math.max(0, ...all.map(x => x.sortOrder)) + 10)
  if (existing?.isPublished && !isAdmin)
    throw createError({ statusCode: 403, message: 'Μια δημοσιευμένη σελίδα την αλλάζουν μόνο οι διαχειριστές' })
  let id = existing?.id
  if (existing) await db.update(s.infoPages).set({ ...set, sectionId }).where(eq(s.infoPages.id, existing.id))
  else id = (await db.insert(s.infoPages).values({ slug, sectionId, ...set, sortOrder, createdBy: me.id }).returning())[0].id

  // newly waiting for approval: tell the administrators
  if (set.pendingApproval && !existing?.pendingApproval) {
    try {
      const admins = (await db.select().from(s.scouts)).filter(r => r.role === 'troop_leader' && r.isActive && !r.deletedAt).map(r => r.id)
      await sendPushTo(admins, {
        title: 'Πληροφορίες: προς έγκριση', body: `📄 ${set.titleEl} — από ${me.firstName} ${me.lastName}`,
        kind: 'infoApproval', refId: id!
      })
    } catch (err) { console.error('[info] approval notice failed', err) }
  }
  return { ok: true, slug, sectionId }
})
