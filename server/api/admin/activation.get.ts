import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, sectionOfWith } from '../../utils/guard'

/* Who has actually got into the app. Only people who hold a code of their own
   appear: the Αγέλη and Μικρή Αγέλη never sign in themselves — their families
   do — so those children are not listed, though their parents are. */
const KIDS_DO_NOT_SIGN_IN = new Set(['ageli', 'mikri-ageli'])

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const secIds = await scopedSectionIds(me)
  const inScope = (sid: number | null) => secIds === null || (sid != null && secIds.includes(sid))

  const sections = await db.select().from(s.sections)
  const patrols = await db.select().from(s.patrols)
  const scouts = (await db.select().from(s.scouts)).filter(r => r.isActive)
  const bySlug = new Map(sections.map(x => [x.id, x.slug]))

  const row = (r: any, kind: 'scout' | 'parent', where: string | null) => ({
    kind, id: r.id,
    name: kind === 'parent' ? r.name : `${r.firstName} ${r.lastName}`,
    firstName: r.firstName ?? null, lastName: r.lastName ?? null,
    firstNameEn: r.firstNameEn ?? null, lastNameEn: r.lastNameEn ?? null,
    where,
    hasPhone: !!r.phone,
    activated: !!r.firstLoginAt,
    lastLoginAt: r.lastLoginAt ?? null
  })

  const out: Array<{ key: string, label: string, people: any[] }> = []

  // Βαθμοφόροι first — they are the ones who need it working before anyone else
  const leaders = scouts
    .filter(r => r.role !== 'scout' && r.passcodeHmac)
    .filter(r => secIds === null || inScope(sectionOfWith(r, patrols)))
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'el'))
  if (leaders.length) out.push({ key: 'leaders', label: 'Βαθμοφόροι', people: leaders.map(r => row(r, 'scout', null)) })

  for (const sec of sections) {
    if (KIDS_DO_NOT_SIGN_IN.has(sec.slug)) continue
    if (!inScope(sec.id)) continue
    const people = scouts
      .filter(r => r.role === 'scout' && r.passcodeHmac && sectionOfWith(r, patrols) === sec.id)
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'el'))
      .map(r => {
        const p = r.patrolId != null ? patrols.find(x => x.id === r.patrolId) : null
        return row(r, 'scout', p ? `${p.emblem} ${p.nameEl}` : null)
      })
    if (people.length) out.push({ key: 's' + sec.id, label: sec.nameEl, people })
  }

  // parents of every sector, including the two whose children never sign in
  const links = await db.select().from(s.parentChildren)
  const parents = (await db.select().from(s.parents)).filter(r => r.isActive && r.passcodeHmac)
  const kidsOf = (pid: number, ownScoutId: number | null) => {
    const ids = new Set(links.filter(l => l.parentId === pid).map(l => l.scoutId))
    if (ownScoutId != null) ids.add(ownScoutId)
    return [...ids].map(cid => scouts.find(x => x.id === cid)).filter(Boolean) as any[]
  }
  const parentRows = parents
    .filter(r => {
      const kids = kidsOf(r.id, r.scoutId)
      const sids = kids.map(k => sectionOfWith(k, patrols)).filter(x => x != null) as number[]
      return secIds === null || sids.some(inScope) || inScope(r.sectionId)
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'el'))
    .map(r => {
      const kids = kidsOf(r.id, r.scoutId)
      const where = kids.length
        ? kids.map(k => k.firstName).join(', ')
        : (bySlug.get(r.sectionId) ? sections.find(x => x.id === r.sectionId)?.nameEl ?? null : null)
      return row(r, 'parent', where)
    })
  if (parentRows.length) out.push({ key: 'parents', label: 'Γονείς', people: parentRows })

  const everyone = out.flatMap(g => g.people)
  return {
    groups: out,
    total: everyone.length,
    activated: everyone.filter(p => p.activated).length
  }
})
