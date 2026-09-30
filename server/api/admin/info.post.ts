import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { sendPushTo } from '../../utils/push'

/* A page's identifier, made from its Greek title, since nobody should have to
   invent one: "Κόμποι για αρχάριους" → "kompoi-gia-archarious". */
const GREEK: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm',
  ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o'
}
function toSlug(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/ου/g, 'ou').replace(/[α-ω]/g, c => GREEK[c] ?? '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

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
  if (!String(b?.titleEl || '').trim()) throw createError({ statusCode: 400, message: 'Χρειάζεται τίτλος' })
  const db = (await useDb())
  // an existing page keeps its identifier; a new one gets one from its title,
  // made unique — unless an administrator gave one (to write a section's own
  // version of a troop-wide page, which shares its identifier)
  let slug = toSlug(String(b?.slug || ''))
  if (!slug) {
    const taken = new Set((await db.select().from(s.infoPages)).map(p => p.slug))
    const base = toSlug(String(b.titleEl)) || 'selida'
    slug = base
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
  }
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
