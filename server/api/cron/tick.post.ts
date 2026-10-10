import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { sendPushTo, sendPushToParents, type PushTrace } from '../../utils/push'
import { dispatchAnnouncement } from '../../utils/announce'
import { sectionOf, sectionOfWith } from '../../utils/guard'
import { now, isAfter, isAtOrBefore } from '../../utils/passcode'
import { nextOccurrence } from '../../utils/recur'
import { purgeTrashedScouts } from '../../utils/deleteScout'
import { READ_TTL_MS } from '../../utils/notifyRetention'
import { cyprusTimeOnDayOf } from '../../utils/cyprusTime'
import { localDay, bonusEarned, currentStreak } from '../../utils/streak'
import { deleteFormFiles } from '../../utils/formFiles'
import { eventInSections, eventSectionIds } from '../../utils/eventScope'
import { potatoTick, potatoWeekly, gameDigest } from '../../utils/leaderFun'
import { kimPrizes } from '../../utils/kimRewards'
import { funDailyTick } from '../../utils/funDaily'
import { refillTick } from '../../utils/funBag'
import { photoWeekly, activePhotoRound, photoClearTrial, photoLaunch } from '../../utils/photoGame'

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

  /* The log of this run, by name: for each message sent, who got it on their
     phone, whose phone failed (and why), who has no phone subscribed and saw
     it only in the in-app bell, and who had already been sent it. */
  const names = new Map((await db.select().from(s.scouts)).map(r => [r.id, `${r.firstName} ${r.lastName}`]))
  const sent: any[] = []
  function report(what: string, trace: PushTrace[], parentPushes = 0) {
    const who = (o: PushTrace['outcome']) => trace.filter(x => x.outcome === o).map(x => names.get(x.scoutId) || `#${x.scoutId}`)
    const entry: any = { what, delivered: who('delivered') }
    const failed = trace.filter(x => x.outcome === 'failed')
    if (failed.length) entry.failed = failed.map(x => ({ name: names.get(x.scoutId) || `#${x.scoutId}`, why: [...new Set(x.errors)].join('; ') }))
    const none = who('no-device'); if (none.length) entry.bellOnly_noDevice = none
    const already = who('already-sent'); if (already.length) entry.alreadySent = already
    if (parentPushes) entry.parentDevices = parentPushes
    sent.push(entry)
  }

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
    const trace: PushTrace[] = []
    notified += await sendPushTo(targets.map(r => r.id), {
      title: c.isBonus ? 'Κέρδισες την ερώτηση μπόνους! 🎁' : 'Η σημερινή πρόκληση σε περιμένει! 🎯',
      body: `${c.titleEl} · ${c.points} πόντοι`, kind: 'challenge_unlocked', refId: c.id
    }, trace)
    report(`challenge #${c.id}${c.isBonus ? ' (bonus)' : ''}: ${c.titleEl}`, trace)
    await db.update(s.challenges).set({ notifiedAt: t }).where(eq(s.challenges.id, c.id))
  }

  /* the streak, gently: at 19:00 Cyprus time, a member whose streak is still
     alive (they answered yesterday) but who has not answered today, while
     there is a question open for them, is told once. Never after 21:00 —
     a late run does not wake anyone. One a day, by the day's number. */
  const today = localDay(t)
  const evening = cyprusTimeOnDayOf(t, 19), late = cyprusTimeOnDayOf(t, 21)
  if (!isAfter(evening, t) && isAfter(late, t)) {
    const open = (await db.select().from(s.challenges)).filter(c => c.isPublished && !c.forLeaders
      && c.unlocksAt && isAtOrBefore(c.unlocksAt, t) && !(c.closesAt && isAtOrBefore(c.closesAt, t)))
    const answeredBy = new Set(answered.map(a => `${a.challengeId}:${a.scoutId}`))
    const dayRef = Number(today.replace(/-/g, ''))
    const due: { id: number, streak: number }[] = []
    for (const r of scouts.filter(x => x.role === 'scout')) {
      const days = daysOf.get(r.id) || new Set<string>()
      if (days.has(today)) continue
      const streak = currentStreak(days, today)
      if (!streak) continue
      const mine = open.filter(c => !answeredBy.has(`${c.id}:${r.id}`)
        && (!c.isBonus || bonusEarned(days, today))
        && ((!c.sectionId && !c.patrolId)
          || (c.patrolId != null ? r.patrolId === c.patrolId : sectionOfWith(r as any, patrols) === c.sectionId)))
      if (mine.length) due.push({ id: r.id, streak })
    }
    // one message per streak length, so each reads its own number
    for (const n of [...new Set(due.map(d => d.streak))]) {
      const trace: PushTrace[] = []
      notified += await sendPushTo(due.filter(d => d.streak === n).map(d => d.id), {
        title: `🔥 ${n} ${n === 1 ? 'μέρα' : 'μέρες'} σερί!`,
        body: 'Απάντησε τη σημερινή ερώτηση για να συνεχίσει το σερί σου.',
        kind: 'streak_reminder', refId: dayRef
      }, trace)
      report(`streak reminder (${n} days)`, trace)
    }
  }

  // event reminders due — members with accounts, plus parent subscriptions
  const famSections = (await db.select().from(s.sections)).filter(x => !x.hasApp).map(x => x.id)
  for (const e of await db.select().from(s.events)) {
    if (!e.remindAt || isAfter(e.remindAt, t) || isAtOrBefore(e.startsAt, t)) continue
    // reminders follow what a member may actually see
    const targets = scouts.filter(r => r.role === 'scout').filter(r =>
      e.scope === 'troop'
      || (e.scope === 'patrol' && r.patrolId === e.patrolId)
      || (e.scope === 'section' && eventInSections(e, [sectionOfWith(r as any, patrols) as number])))
    const msg = {
      title: 'Υπενθύμιση 📅',
      body: `Αύριο: ${e.titleEl}${e.location ? ' · ' + e.location : ''}`, kind: 'event_reminder', refId: e.id
    }
    const trace: PushTrace[] = []
    notified += await sendPushTo(targets.map(r => r.id), msg, trace)
    let parentPushes = 0
    if (e.scope === 'troop') parentPushes = await sendPushToParents(null, msg)
    else if (e.scope === 'section') {
      // the families of each sector it is for whose children never sign in
      const fam = eventSectionIds(e).filter(x => famSections.includes(x))
      if (fam.length) parentPushes = await sendPushToParents(fam, msg)
    }
    notified += parentPushes
    report(`event reminder #${e.id}: ${e.titleEl}`, trace, parentPushes)
  }
  // scheduled announcements whose time has come
  let announced = 0
  for (const a of await db.select().from(s.announcements)) {
    if (a.status !== 'scheduled' || !a.scheduledAt || isAfter(a.scheduledAt, t)) continue
    const trace: PushTrace[] = []
    const res = await dispatchAnnouncement(a, a.createdBy, trace)
    announced++
    notified += res.pushed
    report(`announcement #${a.id}: ${a.textEl.slice(0, 60)}`, trace, res.pushed - trace.reduce((n, x) => n + x.delivered, 0))
    // a repeating one is queued again for its next time; the sent row stays
    // as history, so the list shows what went out and what is still to come
    if (a.repeat) {
      await db.insert(s.announcements).values({
        audience: a.audience, sectionId: a.sectionId, groupId: a.groupId, targets: a.targets,
        textEl: a.textEl, textEn: a.textEn, status: 'scheduled',
        viaPush: a.viaPush, viaSms: a.viaSms, toParents: a.toParents, parentsOnly: a.parentsOnly,
        scheduledAt: nextOccurrence(a.scheduledAt, a.repeat as any), repeat: a.repeat,
        createdBy: a.createdBy, createdAt: t, approvedBy: a.approvedBy
      })
    }
  }

  // members trashed 30 days ago go for good, with everything that referenced them
  const purgedWho = await purgeTrashedScouts(t)

  // form files no one needs any more: uploads whose form was never sent,
  // after a day; spreadsheets and PDFs made for download, after a week
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString()
  await deleteFormFiles((await db.select().from(s.formFiles)).filter(f =>
    (f.kind === 'upload' && !f.responseId && f.createdAt < dayAgo) || (f.kind === 'export' && f.createdAt < weekAgo)))

  // the hot potato: it bursts when its secret moment has come; and the
  // week's round is thrown by the app to someone at random when its moment comes
  const potato = await potatoTick()
  const potatoStarted = await potatoWeekly()
  // Το Ταψί του Κιμ: yesterday's best, and on Mondays last week's
  const kimPrize = await kimPrizes()
  // 23:00: who had the most thrown at them today, told to everyone
  const funDaily = await funDailyTick()
  // the photo game: twice a week a photo is asked for; a round whose day is over closes
  const photoTrialCleared = await photoClearTrial()
  // and, once, everyone who plays told it is here
  const launchTrace: PushTrace[] = []
  if (await photoLaunch(launchTrace) != null) report('🎉 Νέο παιχνίδι: Φωτογραφικό κυνήγι', launchTrace)
  await activePhotoRound()
  const photoStarted = await photoWeekly()
  // Σπλατς: the backpacks refilled at 06:00 and 15:00
  const refill = await refillTick()
  // the mini-games' held news, bundled into one push each
  const gameBundles = await gameDigest()

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

  // the counts first, as before; then, by name, what this run actually did
  return {
    ok: true, notified, announced, purged: purgedWho.length, swept, at: t,
    ...(potato ? { potato } : {}),
    ...(potatoStarted ? { potatoStarted } : {}),
    ...(kimPrize.length ? { kimPrize } : {}),
    ...(funDaily ? { funDaily } : {}),
    ...(gameBundles.length ? { gameBundles: gameBundles.length } : {}),
    ...(refill?.given ? { refill } : {}),
    ...(photoStarted ? { photoStarted } : {}),
    ...(photoTrialCleared != null ? { photoTrialCleared } : {}),
    ...(sent.length ? { sent } : {}),
    ...(purgedWho.length ? { purgedWho } : {})
  }
})
