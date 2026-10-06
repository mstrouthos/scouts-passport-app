import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'

/* Showing up, in a row: each meeting or event a Βαθμοφόρος marked present
   adds one; an excused absence neither adds nor breaks it (being ill is not
   giving up); an absence ends it. Counted over the member's own record, in
   the order the events happened. */
export type AttendanceMark = 'present' | 'excused' | 'absent'

export function attendanceStreak(marks: AttendanceMark[]) {
  let best = 0, run = 0
  for (const m of marks) {
    if (m === 'present') best = Math.max(best, ++run)
    else if (m === 'absent') run = 0
  }
  return { current: run, best }
}

/** A member's streak, their record, and their last few marks (newest last). */
export async function attendanceOf(scoutId: number) {
  const db = await useDb()
  const events = new Map((await db.select().from(s.events)).map(e => [e.id, e]))
  const marks = (await db.select().from(s.eventReviews).where(eq(s.eventReviews.scoutId, scoutId)))
    .filter(r => r.attendance && events.has(r.eventId))
    .sort((a, b) => events.get(a.eventId)!.startsAt.localeCompare(events.get(b.eventId)!.startsAt))
    .map(r => r.attendance as AttendanceMark)
  return { ...attendanceStreak(marks), recent: marks.slice(-8), total: marks.filter(m => m === 'present').length }
}
