import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { sectionOfWith, scopedSectionIds, type SessionScout } from './guard'
import { isAfter, isAtOrBefore } from './passcode'

export type Mission = typeof s.missions.$inferSelect

/** Open for answers right now: published, opened, not yet closed. */
export const isOpen = (m: Mission, t: string) => m.isPublished && !isAfter(m.opensAt, t) && !(m.closesAt && isAtOrBefore(m.closesAt, t))

/** The sector a member belongs to, for which missions are theirs. */
export async function memberSection(me: SessionScout) {
  const db = await useDb()
  return sectionOfWith(me, await db.select().from(s.patrols))
}

/** A mission is a member's when it is for their sector, or for every sector. */
export const isFor = (m: Mission, section: number | null) => m.sectionId == null || m.sectionId === section

/** A Βαθμοφόρος may set and check a mission of a sector they run; one for
    every sector only if they run them all. */
export async function canManage(me: SessionScout, m: { sectionId: number | null }) {
  const secs = await scopedSectionIds(me)
  if (secs === null) return true
  return m.sectionId != null && secs.includes(m.sectionId)
}

export async function missionById(id: number) {
  const db = await useDb()
  const m = (await db.select().from(s.missions).where(eq(s.missions.id, id)).limit(1))[0]
  if (!m) throw createError({ statusCode: 404, message: 'Η αποστολή δεν βρέθηκε' })
  return m
}
