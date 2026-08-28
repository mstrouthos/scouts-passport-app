import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { isAfter } from './passcode'

/** The Αγέλη's own corner of the app. Kept to that sector deliberately: the
    other sectors run different programmes and asked for none of this. */
export const PACK_SLUG = 'ageli'

/** The Monday of the week a date falls in, in Cyprus local terms. */
export function weekStartOf(d = new Date()): string {
  const local = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Nicosia' }))
  const dow = (local.getDay() + 6) % 7          // 0 = Monday
  local.setDate(local.getDate() - dow)
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
}

export async function packSectionId(): Promise<number | null> {
  const db = await useDb()
  return (await db.select().from(s.sections)).find(x => x.slug === PACK_SLUG)?.id ?? null
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
