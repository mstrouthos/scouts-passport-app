import webpush from 'web-push'
import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { now } from './passcode'
import { linkForNotification } from './celebrate'

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

async function deliver(subs: Array<typeof s.pushSubscriptions.$inferSelect>, payload: string): Promise<number> {
  if (!subs.length || !ensureConfigured()) return 0
  const db = (await useDb())
  let sent = 0
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
      sent++
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410)
        await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.id, sub.id))
    }
  }))
  return sent
}

/** Push to member accounts, deduplicated via notification_log. Every deduped
    recipient also gets a row in their in-app inbox (`notifications`), so the
    message survives even when push isn't enabled or fails to deliver. */
export async function sendPushTo(scoutIds: number[], msg: { title: string, body: string, kind: string, refId: number }): Promise<number> {
  if (!scoutIds.length) return 0
  const db = (await useDb())
  const fresh: number[] = []
  for (const id of scoutIds) {
    try {
      await db.insert(s.notificationLog).values({ scoutId: id, kind: msg.kind, refId: msg.refId, sentAt: now() })
      fresh.push(id)
    } catch { /* already notified */ }
  }
  if (!fresh.length) return 0
  const sentAt = now()
  await db.insert(s.notifications).values(fresh.map(id => ({
    scoutId: id, kind: msg.kind, refId: msg.refId, title: msg.title, body: msg.body, createdAt: sentAt
  })))
  const subs = (await db.select().from(s.pushSubscriptions)).filter(x => x.scoutId != null && fresh.includes(x.scoutId))
  const url = linkForNotification(msg.kind, msg.refId)
  return deliver(subs, JSON.stringify({ title: msg.title, body: msg.body, url: url || '/' }))
}

/** Push to named parents — the ones linked to the scouts a message went to.
    Deduped per parent, so a parent with two kids in the group hears once. */
export async function sendPushToParentIds(parentIds: number[], msg: { title: string, body: string, kind: string, refId: number }): Promise<number> {
  if (!parentIds.length) return 0
  const db = (await useDb())
  const ids = new Set(parentIds)
  const subs = (await db.select().from(s.pushSubscriptions)).filter(x => x.parentId != null && ids.has(x.parentId))
  if (!subs.length) return 0
  // negative keys keep parent rows from colliding with scout ids in the log
  const fresh: number[] = []
  for (const pid of [...new Set(subs.map(x => x.parentId!))]) {
    try {
      await db.insert(s.notificationLog).values({ scoutId: -1_000_000 - pid, kind: msg.kind, refId: msg.refId, sentAt: now() })
      fresh.push(pid)
    } catch { /* already sent to this parent */ }
  }
  if (!fresh.length) return 0
  return deliver(subs.filter(x => fresh.includes(x.parentId!)), JSON.stringify({ title: msg.title, body: msg.body }))
}

/** Push to anonymous parent subscriptions. sectionIds null = every parent sub.
    Dedupe via notification_log rows keyed on the negative section id. */
export async function sendPushToParents(sectionIds: number[] | null, msg: { title: string, body: string, kind: string, refId: number }): Promise<number> {
  const db = (await useDb())
  const subs = (await db.select().from(s.pushSubscriptions))
    // parents who signed in are reached by id instead, so skip them here
    .filter(x => x.scoutId == null && x.parentId == null && x.sectionId != null)
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
  return deliver(subs.filter(x => fresh.includes(x.sectionId!)), JSON.stringify({ title: msg.title, body: msg.body }))
}
