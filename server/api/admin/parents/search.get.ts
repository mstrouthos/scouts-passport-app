import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds } from '../../../utils/guard'
import { assertCan } from '../../../utils/permissions'
import { childIdsOfParent, sectionsOfParent } from '../../../utils/parents'

/** Look a parent up by name before creating them again. A family is one row
    linked to every child, so the second child's Βαθμοφόρος must be able to
    find a parent first entered by another sector's — but not to read that
    sector's contact details: outside their own sectors the phone and email
    come back masked, enough to tell "which Μαρία" and no more. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'parents.view')
  const q = String(getQuery(event).q || '').trim().toLocaleLowerCase('el')
  if (q.length < 2) return []
  const db = await useDb()
  const [parents, links, scouts, patrols] = await Promise.all([
    db.select().from(s.parents), db.select().from(s.parentChildren),
    db.select().from(s.scouts), db.select().from(s.patrols)
  ])
  const secIds = await scopedSectionIds(me)
  const mask = (v: string | null, keep: number) => v ? '…' + v.slice(-keep) : null
  // accents and the final sigma both drop, so 'μονοσ' finds Μόνος
  const norm = (v: string) => v.toLocaleLowerCase('el').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ')
  const needle = norm(q)
  return parents
    .filter(p => p.isActive && norm(p.name).includes(needle))
    .slice(0, 8)
    .map(p => {
      const secs = sectionsOfParent(p, links, scouts, patrols)
      const mine = secIds === null || secs.some(id => secIds.includes(id))
      const kids = childIdsOfParent(p, links).map(id => scouts.find(x => x.id === id)).filter(Boolean) as any[]
      return {
        id: p.id, name: p.name,
        phone: mine ? p.phone : mask(p.phone, 3),
        email: mine ? p.email : (p.email ? '…@' + p.email.split('@')[1] : null),
        children: kids.map(k => `${k.firstName} ${k.lastName}`),
        childIds: kids.map(k => k.id)
      }
    })
})
