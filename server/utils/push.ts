import webpush from 'web-push'
import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { now } from './passcode'
import { linkForNotification } from './notifyLinks'
import { logMembers, logParents, logAnonymousParents } from './deliveryLog'

let configured: boolean | null = null
function ensureConfigured(): boolean {
  if (configured !== null) return configured
  const cfg = useRuntimeConfig()
  if (cfg.public.vapidPublicKey && cfg.vapidPrivateKey) {
    webpush.setVapidDetails(cfg.vapidSubject || 'mailto:admin@example.org', cfg.public.vapidPublicKey, cfg.vapidPrivateKey)
    configured = true
  } else {
    configured = false
  }
  return configured
}

type Sub = typeof s.pushSubscriptions.$inferSelect
/** Does this endpoint belong to the app the message is for? A row from
    before surfaces were recorded belongs to everything it is filed under. */
export const onSurface = (x: Sub, want: 'scouts' | 'bar') =>
  !x.surfaces || x.surfaces.split(',').includes(want)

/** Exposed for the test push, which targets one known row. */
export const deliverTo = (subs: Array<typeof s.pushSubscriptions.$inferSelect>, payload: string) => deliver(subs, payload)

/* How each push travels. `urgency: high` is what gets it through at once on
   Android: at the default, normal, the phone's push service holds messages
   while the phone is idle or saving battery — Samsung's more than most — and
   hands them over hours later, when the screen next comes on, which looks
   exactly like "notifications don't arrive". TTL is how long the push service
   keeps trying a phone that is off or out of signal: half a day for the
   troop's news, a few minutes for the bar, where an order is stale by then. */
const NEWS = { urgency: 'high' as const, TTL: 12 * 3600 }
const BAR = { urgency: 'high' as const, TTL: 5 * 60 }

/** What became of one member's push, for the scheduled job's log:
    delivered to at least one of their devices, failed on all of them, sent to
    the bell only because they have no device subscribed, or skipped because
    they had already been sent this very message. */
export type PushTrace = {
  scoutId: number
  outcome: 'delivered' | 'failed' | 'no-device' | 'already-sent'
  devices: number, delivered: number, errors: string[]
}

async function deliver(subs: Array<typeof s.pushSubscriptions.$inferSelect>, payload: string,
  onResult?: (sub: Sub, ok: boolean, why?: string) => void, how: { urgency: 'high', TTL: number } = NEWS): Promise<number> {
  // say why nothing went out: a silent zero here is indistinguishable from
  // "nobody was subscribed", which is what made a broken push hard to see
  if (!subs.length) { console.log('[push] nothing sent — no subscriptions for these recipients'); return 0 }
  if (!ensureConfigured()) { console.warn('[push] nothing sent — VAPID keys are not configured'); return 0 }
  const db = (await useDb())
  let sent = 0
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, how)
      sent++
      onResult?.(sub, true)
    } catch (err: any) {
      console.warn(`[push] delivery failed (${err?.statusCode ?? '?'}) for ${sub.endpoint.slice(0, 48)}`, err?.body || err?.message || '')
      const gone = err?.statusCode === 404 || err?.statusCode === 410
      if (gone) await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.id, sub.id))
      onResult?.(sub, false, gone
        ? `subscription expired (${err.statusCode}), removed — needs to enable notifications again`
        : `error ${err?.statusCode ?? ''} ${String(err?.body || err?.message || '').slice(0, 80)}`.trim())
    }
  }))
  return sent
}

/** Push to member accounts, deduplicated via notification_log. Every deduped
    recipient also gets a row in their in-app inbox (`notifications`), so the
    message survives even when push isn't enabled or fails to deliver. */
export async function sendPushTo(scoutIds: number[], msg: { title: string, body: string, kind: string, refId: number },
  trace?: PushTrace[]): Promise<number> {
  if (!scoutIds.length) return 0
  const db = (await useDb())
  const fresh: number[] = []
  for (const id of scoutIds) {
    try {
      await db.insert(s.notificationLog).values({ scoutId: id, kind: msg.kind, refId: msg.refId, sentAt: now() })
      fresh.push(id)
    } catch { /* already notified */
      trace?.push({ scoutId: id, outcome: 'already-sent', devices: 0, delivered: 0, errors: [] })
    }
  }
  if (!fresh.length) return 0
  const sentAt = now()
  await db.insert(s.notifications).values(fresh.map(id => ({
    scoutId: id, kind: msg.kind, refId: msg.refId, title: msg.title, body: msg.body, createdAt: sentAt
  })))
  const subs = (await db.select().from(s.pushSubscriptions))
    .filter(x => x.scoutId != null && fresh.includes(x.scoutId) && onSurface(x, 'scouts'))
  const url = linkForNotification(msg.kind, msg.refId)
  const per = new Map<number, PushTrace>(fresh.map(id => [id, { scoutId: id, outcome: 'no-device', devices: 0, delivered: 0, errors: [] }]))
  for (const x of subs) per.get(x.scoutId!)!.devices++
  const sent = await deliver(subs, JSON.stringify({ title: msg.title, body: msg.body, url: url || '/' }), (sub, ok, why) => {
    const p = per.get(sub.scoutId!)!
    if (ok) p.delivered++; else p.errors.push(why || 'failed')
  })
  for (const p of per.values()) {
    if (p.devices && !p.delivered && !p.errors.length) p.errors.push('push is not configured on the server (VAPID keys)')
    p.outcome = !p.devices ? 'no-device' : p.delivered ? 'delivered' : 'failed'
    trace?.push(p)
  }
  logMembers(msg, [...per.values()].map(p => ({ id: p.scoutId, outcome: p.outcome as any, errors: p.errors })))
  return sent
}

/** A buzz to the bar crew's phones: no inbox, no dedupe — an order is news
    exactly once, and it is stale a minute later. */
export async function sendPushToBarStaff(staffIds: number[], msg: { title: string, body: string, url?: string }): Promise<number> {
  if (!staffIds.length) return 0
  const db = (await useDb())
  const mine = (await db.select().from(s.pushSubscriptions)).filter(x => x.barStaffId != null && staffIds.includes(x.barStaffId))
  // the bar app's own endpoints; a crew member who never installed it is
  // still buzzed on whatever they do have
  const subs = staffIds.flatMap(id => {
    const theirs = mine.filter(x => x.barStaffId === id)
    const barOnly = theirs.filter(x => onSurface(x, 'bar'))
    return barOnly.length ? barOnly : theirs
  })
  return deliver(subs, JSON.stringify({ title: msg.title, body: msg.body, url: msg.url || '/bar' }), undefined, BAR)
}

/** Push to named parents — the ones linked to the scouts a message went to.
    Deduped per parent, so a parent with two kids in the group hears once. */
export async function sendPushToParentIds(parentIds: number[], msg: { title: string, body: string, kind: string, refId: number }): Promise<number> {
  if (!parentIds.length) return 0
  const db = (await useDb())
  // negative keys keep parent rows from colliding with scout ids in the log;
  // the dedupe runs over every named parent, subscribed or not, because the
  // inbox row below must be written exactly once as well
  const fresh: number[] = []
  for (const pid of [...new Set(parentIds)]) {
    try {
      await db.insert(s.notificationLog).values({ scoutId: -1_000_000 - pid, kind: msg.kind, refId: msg.refId, sentAt: now() })
      fresh.push(pid)
    } catch { /* already sent to this parent */ }
  }
  if (!fresh.length) return 0
  // the bell: the message is there to read whether or not a push got through
  const sentAt = now()
  await db.insert(s.parentNotifications).values(fresh.map(pid => ({
    parentId: pid, kind: msg.kind, refId: msg.refId, title: msg.title, body: msg.body, createdAt: sentAt
  })))
  const subs = (await db.select().from(s.pushSubscriptions))
    .filter(x => x.parentId != null && fresh.includes(x.parentId) && onSurface(x, 'scouts'))
  const per = new Map(fresh.map(id => [id, { id, devices: 0, delivered: 0, errors: [] as string[] }]))
  for (const x of subs) per.get(x.parentId!)!.devices++
  const url = linkForNotification(msg.kind, msg.refId) || '/family'
  const sent = subs.length ? await deliver(subs, JSON.stringify({ title: msg.title, body: msg.body, url }), (sub, ok, why) => {
    const p = per.get(sub.parentId!)!
    if (ok) p.delivered++; else p.errors.push(why || 'failed')
  }) : 0
  logParents(msg, [...per.values()].map(p => ({ id: p.id, errors: p.errors,
    outcome: !p.devices ? 'no-device' as const : p.delivered ? 'delivered' as const : 'failed' as const })))
  return sent
}

/** Push to anonymous parent subscriptions. sectionIds null = every parent sub.
    Dedupe via notification_log rows keyed on the negative section id. */
export async function sendPushToParents(sectionIds: number[] | null, msg: { title: string, body: string, kind: string, refId: number }): Promise<number> {
  const db = (await useDb())
  const subs = (await db.select().from(s.pushSubscriptions))
    // parents who signed in are reached by id instead, so skip them here
    .filter(x => x.scoutId == null && x.parentId == null && x.sectionId != null && onSurface(x, 'scouts'))
    .filter(x => sectionIds === null || sectionIds.includes(x.sectionId!))
  if (!subs.length) return 0
  const targetSections = [...new Set(subs.map(x => x.sectionId!))]
  const fresh: number[] = []
  for (const sid of targetSections) {
    try {
      await db.insert(s.notificationLog).values({ scoutId: -sid, kind: msg.kind, refId: msg.refId, sentAt: now() })
      fresh.push(sid)
    } catch { /* already sent to this section */ }
  }
  if (!fresh.length) return 0
  const url = linkForNotification(msg.kind, msg.refId) || '/family'
  const to = subs.filter(x => fresh.includes(x.sectionId!))
  const sent = await deliver(to, JSON.stringify({ title: msg.title, body: msg.body, url }))
  logAnonymousParents(msg, sent, to.length)
  return sent
}
