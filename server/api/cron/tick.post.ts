import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { sendPushTo, sendPushToParents } from '../../utils/push'
import { dispatchAnnouncement } from '../../utils/announce'
import { sectionOf, sectionOfWith } from '../../utils/guard'
import { now, isAfter, isAtOrBefore } from '../../utils/passcode'
import { nextOccurrence } from '../../utils/recur'
import { purgeTrashedScouts } from '../../utils/deleteScout'
import { READ_TTL_MS } from '../../utils/notifyRetention'
import { cyprusTimeOnDayOf } from '../../utils/cyprusTime'
import { localDay, bonusEarned } from '../../utils/streak'

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

  // today's challenge: not announced the moment it unlocks (that is usually
  // midnight, and these are children) but at 15:00 Cyprus time, as a reminder
  // to those who have not answered it yet. One that unlocks after 15:00 is
  // announced as it unlocks; one that has already closed is not announced.
  const answered = await db.select({ challengeId: s.challengeAnswers.challengeId, scoutId: s.challengeAnswers.scoutId, answeredAt: s.challengeAnswers.answeredAt })
    .from(s.challengeAnswers)
  // the local days each scout has answered on, for the bonus: only those whose
  // full Mon-Sun week has earned it are reminded of it
  const daysOf = new Map<number, Set<string>>()
  for (const a of answered) {
    const set = daysOf.get(a.scoutId) || new Set<string>()
    set.add(localDay(a.answeredAt)); daysOf.set(a.scoutId, set)
  }
  for (const c of await db.select().from(s.challenges)) {
    if (!c.isPublished || !c.unlocksAt || c.notifiedAt) continue
    const remindAt = [c.unlocksAt, cyprusTimeOnDayOf(c.unlocksAt, 15)].sort((a, b) => Date.parse(a) - Date.parse(b))[1]
    if (isAfter(remindAt, t)) continue
    if (c.closesAt && isAtOrBefore(c.closesAt, t)) {
      await db.update(s.challenges).set({ notifiedAt: t }).where(eq(s.challenges.id, c.id))
      continue
    }
    const done = new Set(answered.filter(a => a.challengeId === c.id).map(a => a.scoutId))
    const pool = c.forLeaders ? scouts.filter(r => r.role !== 'scout') : scouts.filter(r => r.role === 'scout')
    const targets = pool.filter(r => !done.has(r.id))
      .filter(r => !c.isBonus || bonusEarned(daysOf.get(r.id) || [], localDay(t)))
      .filter(r =>
      (!c.sectionId && !c.patrolId)
      || (c.patrolId != null ? r.patrolId === c.patrolId : sectionOfWith(r as any, patrols) === c.sectionId))
    notified += await sendPushTo(targets.map(r => r.id), {
      title: c.isBonus ? 'Κέρδισες την ερώτηση μπόνους! 🎁' : 'Η σημερινή πρόκληση σε περιμένει! 🎯',
      body: `${c.titleEl} · ${c.points} πόντοι`, kind: 'challenge_unlocked', refId: c.id
    })
    await db.update(s.challenges).set({ notifiedAt: t }).where(eq(s.challenges.id, c.id))
  }

  // event reminders due — members with accounts, plus parent subscriptions
  const famSections = (await db.select().from(s.sections)).filter(x => !x.hasApp).map(x => x.id)
  for (const e of await db.select().from(s.events)) {
    if (!e.remindAt || isAfter(e.remindAt, t) || isAtOrBefore(e.startsAt, t)) continue
    // reminders follow what a member may actually see
    const targets = scouts.filter(r => r.role === 'scout').filter(r =>
      e.scope === 'troop'
      || (e.scope === 'patrol' && r.patrolId === e.patrolId)
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
    // a repeating one is queued again for its next time; the sent row stays
    // as history, so the list shows what went out and what is still to come
    if (a.repeat) {
      await db.insert(s.announcements).values({
        audience: a.audience, sectionId: a.sectionId, groupId: a.groupId,
        textEl: a.textEl, textEn: a.textEn, status: 'scheduled',
        viaPush: a.viaPush, viaSms: a.viaSms, toParents: a.toParents,
        scheduledAt: nextOccurrence(a.scheduledAt, a.repeat as any), repeat: a.repeat,
        createdBy: a.createdBy, createdAt: t, approvedBy: a.approvedBy
      })
    }
  }

  // members trashed 30 days ago go for good, with everything that referenced them
  const purged = await purgeTrashedScouts(t)

  // opened notifications, a day old: swept out so the bell stays the news
  const cutoff = new Date(Date.now() - READ_TTL_MS).toISOString()
  const old = (n: { readAt: string | null }) => !!n.readAt && n.readAt <= cutoff
  let swept = 0
  for (const n of (await db.select().from(s.notifications)).filter(old)) {
    await db.delete(s.notifications).where(eq(s.notifications.id, n.id)); swept++
  }
  for (const n of (await db.select().from(s.parentNotifications)).filter(old)) {
    await db.delete(s.parentNotifications).where(eq(s.parentNotifications.id, n.id)); swept++
  }

  return { ok: true, notified, announced, purged, swept, at: t }
})
