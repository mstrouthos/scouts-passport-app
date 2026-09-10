import { sql } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireTroopLeader } from '../../utils/guard'

/** Clearing the practice data before the app goes live.

    Each part is asked for by name and reported back by row count, so nobody
    can wipe more than they meant to. The Αρχηγός Συστήματος alone, and only
    with the confirmation word typed out — this deletes history that no
    backup inside the app can bring back.

    What is deliberately NOT touched: members, Βαθμοφόροι, parents, sectors,
    units, the quiz questions themselves, the badge and requirement
    definitions, and the information pages. Those are the setup, not the
    practice run. */
const PHRASE = 'ΚΑΘΑΡΙΣΜΟΣ'

export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const b = await readBody<{ confirm?: string, what?: string[] }>(event)
  if (String(b?.confirm || '').trim().toLocaleUpperCase('el') !== PHRASE)
    throw createError({ statusCode: 400, message: `Γράψε ${PHRASE} για επιβεβαίωση` })
  const what = new Set(Array.isArray(b?.what) ? b!.what! : [])
  if (!what.size) throw createError({ statusCode: 400, message: 'Διάλεξε τι θα καθαριστεί' })

  const db = (await useDb())
  const done: Record<string, number> = {}
  const wipe = async (tx: any, table: any, key: string) => {
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(table)
    if (n) await tx.delete(table)
    done[key] = (done[key] || 0) + n
  }

  await db.transaction(async tx => {
    // points: the awards, and the quiz answers that also carry points — the
    // reveals go too, so a question starts from a clean clock
    if (what.has('points')) {
      await wipe(tx, s.pointAwards, 'points')
      await wipe(tx, s.challengeAnswers, 'points')
      await wipe(tx, s.challengeReveals, 'points')
    }
    // attendance: who was marked present, absent or in uniform
    if (what.has('attendance')) await wipe(tx, s.eventReviews, 'attendance')
    // notifications: both inboxes and the log that stops a repeat send
    if (what.has('notifications')) {
      await wipe(tx, s.notifications, 'notifications')
      await wipe(tx, s.parentNotifications, 'notifications')
      await wipe(tx, s.notificationLog, 'notifications')
    }
    // announcements: what was sent to members, and the notices posted to families
    if (what.has('announcements')) {
      await wipe(tx, s.announcements, 'announcements')
      await wipe(tx, s.parentPosts, 'announcements')
      await wipe(tx, s.files, 'announcements')
    }
    // events: the diary itself, and everything recorded against it
    if (what.has('events')) {
      await wipe(tx, s.eventRsvps, 'events')
      await wipe(tx, s.eventReviews, 'events')
      await wipe(tx, s.pointAwards, 'events')
      await wipe(tx, s.events, 'events')
    }
    // progress: badges, requirements and the Κοινότητα's booklet
    if (what.has('progress')) {
      await wipe(tx, s.scoutAchievements, 'progress')
      await wipe(tx, s.requirementAwards, 'progress')
      await wipe(tx, s.ventureAwards, 'progress')
      await wipe(tx, s.ventureMilestones, 'progress')
      await wipe(tx, s.ventureLogs, 'progress')
    }
  })
  console.log(`[reset] ${me.firstName} ${me.lastName} cleared`, done)
  return { ok: true, cleared: done }
})
