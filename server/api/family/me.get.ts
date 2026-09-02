import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'
import { sectionOfWith } from '../../utils/guard'

/** The signed-in parent, with each of their children and the sector each is
    in — the page is read one child at a time, since a family may have one in
    the Αγέλη and another in the Ομάδα and the two programmes share nothing. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const db = await useDb()
  const [sections, scouts, patrols] = await Promise.all([
    db.select().from(s.sections), db.select().from(s.scouts), db.select().from(s.patrols)
  ])
  const secOf = (id: number) => sections.find(x => x.id === id)
  const pick = (sec: any) => sec ? { id: sec.id, nameEl: sec.nameEl, nameEn: sec.nameEn, slug: sec.slug } : null
  const children = p.children.map(c => {
    const row = scouts.find(x => x.id === c.id)
    const sid = row ? sectionOfWith(row as any, patrols) : null
    return { id: c.id, firstName: c.firstName, lastName: c.lastName, section: pick(sid != null ? secOf(sid) : null) }
  }).sort((a, b) => (a.section?.id ?? 0) - (b.section?.id ?? 0))
  return {
    name: p.name,
    section: pick(secOf(p.sectionId)),
    children
  }
})
