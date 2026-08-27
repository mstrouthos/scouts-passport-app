import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { sendPushTo, sendPushToParents } from '../../utils/push'
import { dispatchAnnouncement } from '../../utils/announce'
import { sectionOf, sectionOfWith } from '../../utils/guard'
import { now, isAfter, isAtOrBefore } from '../../utils/passcode'

/** Hit by host cron every few minutes with the token:
    curl -X POST -H "x-cron-token: $TOKEN" https://.../api/cron/tick */
export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig()
  if (getHeader(event, 'x-cron-token') !== cfg.cronToken)
    throw createError({ statusCode: 401, message: 'Bad token' })
  const db = (await useDb())
  const t = now()
  const scouts = (await db.select().from(s.scouts)).filter(r => r.isActive)
  const patrols = (await db.select().from(s.patrols))
  let notified = 0

  // challenges that just unlocked
  for (const c of await db.select().from(s.challenges)) {
    if (!c.isPublished || !c.unlocksAt || isAfter(c.unlocksAt, t) || c.notifiedAt) continue
    const pool = c.forLeaders ? scouts.filter(r => r.role !== 'scout') : scouts.filter(r => r.role === 'scout')
    const targets = pool.filter(r =>
      (!c.sectionId && !c.patrolId)
      || (c.patrolId != null ? r.patrolId === c.patrolId : sectionOfWith(r as any, patrols) === c.sectionId))
    notified += await sendPushTo(targets.map(r => r.id), {
      title: 'Νέα πρόκληση! 🎯',
      body: `${c.titleEl} · ${c.points} πόντοι`, kind: 'challenge_unlocked', refId: c.id
    })
    await db.update(s.challenges).set({ notifiedAt: t }).where(eq(s.challenges.id, c.id))
  }

  // event reminders due — members with accounts, plus parent subscriptions
  const famSections = (await db.select().from(s.sections)).filter(x => !x.hasApp).map(x => x.id)
  for (const e of await db.select().from(s.events)) {
    if (!e.remindAt || isAfter(e.remindAt, t) || isAtOrBefore(e.startsAt, t)) continue
    // reminders follow what a member may actually see: their own sector's
    // programme and their unit's, never troop-wide or Βαθμοφόροι events
    const targets = scouts.filter(r => r.role === 'scout').filter(r =>
      (e.scope === 'patrol' && r.patrolId === e.patrolId)
      || (e.scope === 'section' && sectionOfWith(r as any, patrols) === e.sectionId))
    const msg = {
      title: 'Υπενθύμιση 📅',
      body: `Αύριο: ${e.titleEl}${e.location ? ' · ' + e.location : ''}`, kind: 'event_reminder', refId: e.id
    }
    notified += await sendPushTo(targets.map(r => r.id), msg)
    if (e.scope === 'troop') notified += await sendPushToParents(null, msg)
    else if (e.scope === 'section' && e.sectionId != null && famSections.includes(e.sectionId))
      notified += await sendPushToParents([e.sectionId], msg)
  }
  // scheduled announcements whose time has come
  let announced = 0
  for (const a of await db.select().from(s.announcements)) {
    if (a.status !== 'scheduled' || !a.scheduledAt || isAfter(a.scheduledAt, t)) continue
    const res = await dispatchAnnouncement(a, a.createdBy)
    announced++
    notified += res.pushed
  }

  return { ok: true, notified, announced, at: t }
})
