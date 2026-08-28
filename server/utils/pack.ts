import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { isAfter } from './passcode'

/** The Αγέλη's and Μικρή Αγέλη's own corner of the app. Those children never
    sign in — everything meant for them is read by their families — so both
    sectors get this and the other two, which run different programmes, do not.
    Each sector keeps its own week: they are not one pack. */
export const PACK_SLUGS = ['ageli', 'mikri-ageli'] as const
export const isPackSlug = (slug: string | null | undefined) =>
  !!slug && (PACK_SLUGS as readonly string[]).includes(slug)

/** The Monday of the week a date falls in, in Cyprus local terms. */
export function weekStartOf(d = new Date()): string {
  const local = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Nicosia' }))
  const dow = (local.getDay() + 6) % 7          // 0 = Monday
  local.setDate(local.getDate() - dow)
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
}

/** Both pack sectors, in programme order. */
export async function packSections() {
  const db = await useDb()
  return (await db.select().from(s.sections))
    .filter(x => isPackSlug(x.slug))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

/** The next meeting on the books for a section, with whatever theme it carries. */
export async function nextMeetingFor(sectionId: number) {
  const db = await useDb()
  const t = new Date().toISOString()
  const upcoming = (await db.select().from(s.events))
    .filter(e => (e.scope === 'troop' || (e.scope === 'section' && e.sectionId === sectionId)))
    .filter(e => isAfter(e.startsAt, t))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  if (!upcoming) return null
  return {
    id: upcoming.id, titleEl: upcoming.titleEl, themeEl: upcoming.themeEl,
    startsAt: upcoming.startsAt, location: upcoming.location, isAllDay: upcoming.isAllDay
  }
}
