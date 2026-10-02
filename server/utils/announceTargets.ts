import { schema as s } from '../db'

/** Who an announcement is for, as a list of targets, any number at once:
    'troop' (everyone), 'leaders' (every Βαθμοφόρος), 's:<id>' (a section's
    scouts) and 'g:<id>' (a notification group). Several are joined — the
    Ομάδα and the Βαθμοφόροι together — and anyone in two of them hears once.

    Rows from before targets were kept as a list name one target in their
    audience, section and group columns; they read the same way. */
type Ann = Pick<typeof s.announcements.$inferSelect, 'audience' | 'sectionId' | 'groupId' | 'targets'>
type Group = typeof s.notifyGroups.$inferSelect
type Section = typeof s.sections.$inferSelect

export function targetsOf(a: Ann): string[] {
  if (a.targets) {
    try { const t = JSON.parse(a.targets); if (Array.isArray(t)) return t.map(String) } catch { /* fall through */ }
  }
  if (a.audience === 'troop') return ['troop']
  if (a.audience === 'leaders') return ['leaders']
  if (a.audience === 'group') return a.groupId != null ? [`g:${a.groupId}`] : []
  return a.sectionId != null ? [`s:${a.sectionId}`] : []
}

export const sectionTargets = (t: string[]) => t.filter(x => x.startsWith('s:')).map(x => Number(x.slice(2)))
export const groupTargets = (t: string[]) => t.filter(x => x.startsWith('g:')).map(x => Number(x.slice(2)))
/** Only Βαθμοφόροι: no one in it has parents to tell. */
export const onlyLeaders = (t: string[]) => t.length > 0 && t.every(x => x === 'leaders')

/** The old single-target columns, still filled in: one target as before,
    several as 'multi' with the first section they touch. */
export function legacyColumns(t: string[], groups: Group[]) {
  if (t.length === 1) {
    const [x] = t
    if (x === 'troop' || x === 'leaders') return { audience: x, sectionId: null, groupId: null }
    if (x.startsWith('g:')) return { audience: 'group' as const, sectionId: null, groupId: Number(x.slice(2)) }
    return { audience: 'section' as const, sectionId: Number(x.slice(2)), groupId: null }
  }
  const sec = sectionTargets(t)[0] ?? groups.find(g => groupTargets(t).includes(g.id))?.sectionId ?? null
  return { audience: 'multi' as const, sectionId: sec, groupId: null }
}

/** Whether every target lies inside these sections (null = the whole troop):
    what a sector's Αρχηγός may approve, and what a sector leader may send. */
export function withinSections(t: string[], secs: number[] | null, groups: Group[]) {
  if (secs === null) return true
  if (!t.length || t.includes('troop') || t.includes('leaders')) return false
  return sectionTargets(t).every(id => secs.includes(id)) &&
    groupTargets(t).every(id => { const g = groups.find(x => x.id === id); return !!g && g.sectionId != null && secs.includes(g.sectionId) })
}

/** Whether any target touches these sections — enough to see it in the list. */
export function touchesSections(t: string[], secs: number[] | null, groups: Group[]) {
  if (secs === null) return true
  return sectionTargets(t).some(id => secs.includes(id)) ||
    groupTargets(t).some(id => { const g = groups.find(x => x.id === id); return g?.sectionId != null && secs.includes(g.sectionId) })
}

/** Each target named, for the list and the delivery report. */
export function targetNames(t: string[], sections: Section[], groups: Group[]) {
  return t.map(x => {
    if (x === 'troop') return { kind: 'troop', nameEl: 'Όλο το Σύστημα', nameEn: 'Whole system', emoji: '' }
    if (x === 'leaders') return { kind: 'leaders', nameEl: 'Βαθμοφόροι', nameEn: 'Leaders', emoji: '' }
    const id = Number(x.slice(2))
    if (x.startsWith('g:')) {
      const g = groups.find(y => y.id === id)
      return { kind: 'group', nameEl: g?.nameEl ?? '—', nameEn: g?.nameEn ?? g?.nameEl ?? '—', emoji: g?.emoji ?? '' }
    }
    const sec = sections.find(y => y.id === id)
    return { kind: 'section', nameEl: sec?.nameEl ?? '—', nameEn: sec?.nameEn ?? sec?.nameEl ?? '—', emoji: '' }
  })
}
