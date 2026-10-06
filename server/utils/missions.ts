import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { sectionOfWith, scopedSectionIds, type SessionScout } from './guard'
import { isAfter, isAtOrBefore } from './passcode'

export type Mission = typeof s.missions.$inferSelect

/** Open for answers right now: published, opened, not yet closed. */
export const isOpen = (m: Mission, t: string) => m.isPublished && !isAfter(m.opensAt, t) && !(m.closesAt && isAtOrBefore(m.closesAt, t))
/** Open for this member: as above, or — for a hidden test account — a draft
    not yet published, to try it out first. */
export const isOpenFor = (m: Mission, t: string, me: { isHidden: boolean }) =>
  (m.isPublished || me.isHidden) && !isAfter(m.opensAt, t) && !(m.closesAt && isAtOrBefore(m.closesAt, t))

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

/* A photo must be taken with the app's own camera, there and then: opening
   the camera for a mission hands out a ticket, signed and good for a few
   minutes, which the photo must come back with. A photo from the gallery,
   or sent some other way, has none. */
import { createHmac, timingSafeEqual } from 'node:crypto'
const TICKET_MS = 15 * 60_000
const sign = (body: string) => createHmac('sha256', String(useRuntimeConfig().passcodePepper)).update('camera:' + body).digest('hex')
export function cameraTicket(scoutId: number, missionId: number) {
  const at = Date.now()
  return `${at}.${sign(`${scoutId}:${missionId}:${at}`)}`
}
export function checkCameraTicket(ticket: unknown, scoutId: number, missionId: number) {
  const [at, mac] = String(ticket || '').split('.')
  const when = Number(at)
  if (!when || !mac || Date.now() - when > TICKET_MS || when > Date.now() + 60_000) return false
  const want = Buffer.from(sign(`${scoutId}:${missionId}:${when}`))
  const got = Buffer.from(mac)
  return want.length === got.length && timingSafeEqual(want, got)
}
