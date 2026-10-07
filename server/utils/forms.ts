import { eq, inArray } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { requireLeader, scopedSectionIds, type SessionScout } from './guard'
import { useDb, schema as s } from '../db'
import { normalizeSpec, type FormSpec } from '../../utils/formSpec'
import { now } from './passcode'

export type FormRow = typeof s.forms.$inferSelect

export function specOf(row: { spec: string }): FormSpec {
  try { return normalizeSpec(JSON.parse(row.spec || '{}')) } catch { return normalizeSpec({}) }
}

/** Taking answers: approved, switched on, and not past its closing time. */
export function isAccepting(f: FormRow) {
  return !f.pendingApproval && f.isOpen && (!f.closesAt || new Date(f.closesAt).getTime() > Date.now())
}

/* Who may see and change a form: the administrators and troop-wide
   Βαθμοφόροι every form; the Βαθμοφόροι of a sector its own. A form for the
   whole troop is the administrators'. What comes back is families' data, so
   nobody else — not even the form's own link — reaches the answers. */
export async function canManageForm(me: SessionScout, f: { sectionId: number | null }) {
  const secs = await scopedSectionIds(me)
  return secs === null || (f.sectionId != null && secs.includes(f.sectionId))
}

/** How far a Βαθμοφόρος reaches one answer: 'manage' — whoever manages its
    form (read it, step through the rest, link, delete); 'read' — for a year's
    registration, the Αρχηγός of a sector one of the children it registers
    belongs to (read it and take its PDF, nothing more); or nothing at all. */
export async function responseAccess(me: SessionScout, f: { sectionId: number | null, registrationYear?: string | null }, responseId: number): Promise<'manage' | 'read' | null> {
  if (await canManageForm(me, f)) return 'manage'
  if (!f.registrationYear) return null
  const db = await useDb()
  const mine = (await db.select().from(s.leaderScopes).where(eq(s.leaderScopes.scoutId, me.id)))
    .filter(sc => sc.rank === 'archigos' && sc.scope === 'section' && sc.sectionId != null).map(sc => sc.sectionId!)
  if (!mine.length) return null
  const kids = (await db.select({ scoutId: s.registrations.scoutId }).from(s.registrations).where(eq(s.registrations.responseId, responseId))).map(x => x.scoutId)
  if (!kids.length) return null
  const theirs = await db.select({ sectionId: s.scouts.sectionId }).from(s.scouts).where(inArray(s.scouts.id, kids))
  return theirs.some(k => k.sectionId != null && mine.includes(k.sectionId)) ? 'read' : null
}

/** The sectors this leader may make a form for; null: any, and the whole troop. */
export const formSections = (me: SessionScout) => scopedSectionIds(me)

/** A form that the signed-in Βαθμοφόρος may handle, or 404 — someone else's
    sector's form is as good as not there. */
export async function formForLeader(event: H3Event, id: number) {
  const me = await requireLeader(event)
  const f = await formById(id)
  if (!(await canManageForm(me, f))) throw createError({ statusCode: 404, message: 'Not found' })
  return { me, f }
}

/** An Αρχηγός of the form's sector (or troop-wide, or an administrator): who
    may open a form without asking, and approve an Υπαρχηγός's. */
export async function isArchigosFor(me: SessionScout, sectionId: number | null) {
  if (me.role === 'troop_leader') return true
  const db = await useDb()
  const scopes = await db.select().from(s.leaderScopes).where(eq(s.leaderScopes.scoutId, me.id))
  return scopes.some(sc => sc.rank === 'archigos' && (sc.scope === 'troop' || (sectionId != null && sc.scope === 'section' && sc.sectionId === sectionId)))
}

/** Who is asked to approve a form: the administrators, and the Αρχηγοί of its
    sector (troop-wide ones included). */
export async function formApprovers(sectionId: number | null): Promise<number[]> {
  const db = await useDb()
  const leaders = (await db.select().from(s.scouts)).filter(r => r.role !== 'scout' && r.isActive)
  const scopes = await db.select().from(s.leaderScopes)
  return leaders.filter(l => l.role === 'troop_leader' || scopes.some(sc => sc.scoutId === l.id && sc.rank === 'archigos'
    && (sc.scope === 'troop' || (sectionId != null && sc.scope === 'section' && sc.sectionId === sectionId)))).map(l => l.id)
}

export async function formById(id: number) {
  const db = await useDb()
  const f = (await db.select().from(s.forms).where(eq(s.forms.id, id)).limit(1))[0]
  if (!f) throw createError({ statusCode: 404, message: 'Not found' })
  return f
}

/** Who looked at which responses, and when — kept, never shown to the sender. */
export async function logAccess(formId: number, scoutId: number, action: string, responseId: number | null = null) {
  const db = await useDb()
  await db.insert(s.formAccessLog).values({ formId, responseId, scoutId, action, at: now() })
}
