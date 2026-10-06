import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout } from '../utils/guard'
import { now } from '../utils/passcode'
import { isOpenFor, isFor, memberSection } from '../utils/missions'

/** The member's missions: those open now, and those they have sent a photo
    for, with where each photo stands. Newest first. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = await useDb()
  const t = now()
  const section = await memberSection(me)
  const mine = new Map((await db.select().from(s.missionSubmissions).where(eq(s.missionSubmissions.scoutId, me.id))).map(x => [x.missionId, x]))
  return (await db.select().from(s.missions))
    .filter(m => isFor(m, section) && (m.isPublished || me.isHidden) && (isOpenFor(m, t, me) || mine.has(m.id)))
    .sort((a, b) => b.opensAt.localeCompare(a.opensAt))
    .map(m => {
      const sub = mine.get(m.id)
      return {
        id: m.id, titleEl: m.titleEl, descriptionEl: m.descriptionEl, emoji: m.emoji, points: m.points,
        closesAt: m.closesAt, open: isOpenFor(m, t, me), draft: !m.isPublished,
        submission: sub ? {
          status: sub.status, note: sub.note, reviewNote: sub.reviewNote, createdAt: sub.createdAt,
          photo: `/api/missions/photo/${sub.id}?v=${sub.fileId}`
        } : null
      }
    })
})
