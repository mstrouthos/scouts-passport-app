import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'

/** Public parents' feed for the no-account sections (Αγέλη / Μικρή Αγέλη):
    which sections exist, their troop+section events, published info pages.
    Contains no member names — only event and reference content. */
export default defineEventHandler(async (event) => {
  const db = useDb()
  const slug = String(getQuery(event).section || '')
  const famSections = db.select().from(s.sections).all()
    .filter(x => !x.hasApp).sort((a, b) => a.sortOrder - b.sortOrder)
  const current = famSections.find(x => x.slug === slug) || famSections[0]
  if (!current) throw createError({ statusCode: 404, message: 'No family sections' })

  const events = db.select().from(s.events).all()
    .filter(e => e.scope === 'troop' || (e.scope === 'section' && e.sectionId === current.id))
    .filter(e => new Date(e.endsAt || e.startsAt).getTime() > Date.now() - 86400_000)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  const info = db.select().from(s.infoPages).all()
    .filter(p => p.isPublished).sort((a, b) => a.sortOrder - b.sortOrder)

  return {
    sections: famSections.map(x => ({ slug: x.slug, nameEl: x.nameEl, nameEn: x.nameEn })),
    current: { slug: current.slug, id: current.id, nameEl: current.nameEl, nameEn: current.nameEn },
    events: events.map(e => ({
      id: e.id, scope: e.scope, titleEl: e.titleEl, titleEn: e.titleEn,
      location: e.location, startsAt: e.startsAt, endsAt: e.endsAt, isAllDay: e.isAllDay
    })),
    info: info.map(p => ({ slug: p.slug, icon: p.iconEmoji, titleEl: p.titleEl, titleEn: p.titleEn, summaryEl: p.summaryEl, summaryEn: p.summaryEn }))
  }
})
