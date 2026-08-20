import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { sendPushTo } from '../../utils/push'
import { now } from '../../utils/passcode'

/** Hit by host cron every few minutes with the token:
    curl -X POST -H "x-cron-token: $TOKEN" https://.../api/cron/tick */
export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig()
  if (getHeader(event, 'x-cron-token') !== cfg.cronToken)
    throw createError({ statusCode: 401, message: 'Bad token' })
  const db = useDb()
  const t = now()
  const scouts = db.select().from(s.scouts).all().filter(r => r.isActive)
  const patrols = db.select().from(s.patrols).all()
  let notified = 0

  // challenges that just unlocked
  for (const c of db.select().from(s.challenges).all()) {
    if (!c.isPublished || !c.unlocksAt || c.unlocksAt > t || c.notifiedAt) continue
    const targets = scouts.filter(r =>
      (!c.sectionId && !c.patrolId)
      || (c.patrolId && r.patrolId === c.patrolId)
      || (c.sectionId && r.patrolId && patrols.find(p => p.id === r.patrolId)?.sectionId === c.sectionId))
    notified += await sendPushTo(targets.map(r => r.id), {
      title: 'Νέα πρόκληση! 🎯',
      body: `${c.titleEl} · ${c.points} πόντοι`, kind: 'challenge_unlocked', refId: c.id
    })
    db.update(s.challenges).set({ notifiedAt: t }).where(eq(s.challenges.id, c.id)).run()
  }

  // event reminders due
  for (const e of db.select().from(s.events).all()) {
    if (!e.remindAt || e.remindAt > t || e.startsAt <= t) continue
    const targets = scouts.filter(r =>
      e.scope === 'troop'
      || (e.scope === 'patrol' && r.patrolId === e.patrolId)
      || (e.scope === 'section' && r.patrolId && patrols.find(p => p.id === r.patrolId)?.sectionId === e.sectionId))
    notified += await sendPushTo(targets.map(r => r.id), {
      title: 'Υπενθύμιση 📅',
      body: `Αύριο: ${e.titleEl}${e.location ? ' · ' + e.location : ''}`, kind: 'event_reminder', refId: e.id
    })
  }
  return { ok: true, notified, at: t }
})
