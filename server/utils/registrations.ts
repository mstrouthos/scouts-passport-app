import { and, eq, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { now } from './passcode'
import { childIdsOfParent } from './parents'
import { familyOf, parentSectionsOf } from './familyForms'
import { sectionOfWith } from './guard'
import { scoutYear } from '../../utils/scoutYear'

/* Who is registered for the scout year: ticked by a registration form's
   answer (each child it names), or by hand for one on paper. Leaders only. */

type Kid = { id: number, firstName: string, lastName: string, sectionId: number | null }

/** A parent's family's children — the members any parent of the family is
    linked to — still active, and in the form's sectors if it has them. */
export async function familyChildren(parentId: number, form?: typeof s.forms.$inferSelect): Promise<Kid[]> {
  const db = await useDb()
  const family = await familyOf(parentId)
  const [parents, links, scouts, patrols] = await Promise.all([
    db.select().from(s.parents), db.select().from(s.parentChildren), db.select().from(s.scouts), db.select().from(s.patrols)])
  const ids = new Set(parents.filter(p => family.includes(p.id)).flatMap(p => childIdsOfParent(p, links)))
  const secs = form ? parentSectionsOf(form) : null
  return scouts.filter(k => ids.has(k.id) && k.role === 'scout' && k.isActive && !k.deletedAt)
    .map(k => ({ id: k.id, firstName: k.firstName, lastName: k.lastName, sectionId: sectionOfWith(k, patrols) }))
    .filter(k => !secs || (k.sectionId != null && secs.includes(k.sectionId)))
    .sort((a, b) => a.firstName.localeCompare(b.firstName, 'el'))
}

/** Tick these members as registered for the year, from this answer (or by
    hand, `markedBy`). A later registration takes the place of an earlier one. */
export async function registerChildren(scoutIds: number[], year: string, src: { formId?: number | null, responseId?: number | null, markedBy?: number | null }) {
  const db = await useDb()
  const t = now()
  for (const scoutId of [...new Set(scoutIds)]) {
    const row = { formId: src.formId ?? null, responseId: src.responseId ?? null, markedBy: src.markedBy ?? null, createdAt: t }
    await db.insert(s.registrations).values({ scoutId, year, ...row })
      .onConflictDoUpdate({ target: [s.registrations.scoutId, s.registrations.year], set: row })
  }
}

/** The members registered for a year (this one, by default). */
export async function registeredIds(year = scoutYear()): Promise<Set<number>> {
  const db = await useDb()
  return new Set((await db.select({ id: s.registrations.scoutId }).from(s.registrations).where(eq(s.registrations.year, year))).map(r => r.id))
}

/** Whether there is a registration form for this year — the ticks mean
    something only once there is. */
export async function hasRegistrationForm(year = scoutYear()) {
  const db = await useDb()
  return (await db.select({ id: s.forms.id }).from(s.forms).where(eq(s.forms.registrationYear, year))).length > 0
}

/** An answer that goes away takes its ticks with it. */
export async function unregisterResponse(responseIds: number[]) {
  if (!responseIds.length) return
  const db = await useDb()
  await db.delete(s.registrations).where(inArray(s.registrations.responseId, responseIds))
}

/** The members an answer ticked. */
export async function childrenOfResponse(responseId: number) {
  const db = await useDb()
  const rows = await db.select().from(s.registrations).where(eq(s.registrations.responseId, responseId))
  if (!rows.length) return []
  const kids = await db.select({ id: s.scouts.id, firstName: s.scouts.firstName, lastName: s.scouts.lastName }).from(s.scouts)
    .where(inArray(s.scouts.id, rows.map(r => r.scoutId)))
  return kids
}

/** A member's registration for the year, with where it came from. */
export async function registrationOf(scoutId: number, year = scoutYear()) {
  const db = await useDb()
  const r = (await db.select().from(s.registrations).where(and(eq(s.registrations.scoutId, scoutId), eq(s.registrations.year, year))).limit(1))[0]
  if (!r) return null
  const by = r.markedBy ? (await db.select({ firstName: s.scouts.firstName, lastName: s.scouts.lastName }).from(s.scouts).where(eq(s.scouts.id, r.markedBy)).limit(1))[0] : null
  const resp = r.responseId ? (await db.select({ parentId: s.formResponses.parentId }).from(s.formResponses).where(eq(s.formResponses.id, r.responseId)).limit(1))[0] : null
  const parent = resp?.parentId ? (await db.select({ name: s.parents.name }).from(s.parents).where(eq(s.parents.id, resp.parentId)).limit(1))[0] : null
  return {
    at: r.createdAt, formId: r.formId, responseId: r.responseId,
    byHand: !!r.markedBy, markedBy: by ? `${by.firstName} ${by.lastName}` : null,
    parent: parent?.name ?? null
  }
}

/** The members a leader may tick for a registration form: those in the
    form's sectors (all, if it has none) that the leader looks after. */
export async function registrationOptions(me: any, form: typeof s.forms.$inferSelect) {
  const db = await useDb()
  const { scopedSectionIds } = await import('./guard')
  const mine = await scopedSectionIds(me)
  const secs = parentSectionsOf(form)
  const [scouts, patrols, sections] = await Promise.all([db.select().from(s.scouts), db.select().from(s.patrols), db.select().from(s.sections)])
  return scouts.filter(k => k.role === 'scout' && k.isActive && !k.deletedAt && !k.isHidden)
    .map(k => ({ ...k, sectionId: sectionOfWith(k, patrols) }))
    .filter(k => k.sectionId != null && (mine === null || mine.includes(k.sectionId)) && (!secs || secs.includes(k.sectionId)))
    .map(k => ({ id: k.id, name: `${k.firstName} ${k.lastName}`, section: sections.find(x => x.id === k.sectionId)?.nameEl ?? '' }))
    .sort((a, b) => a.section.localeCompare(b.section, 'el') || a.name.localeCompare(b.name, 'el'))
}
