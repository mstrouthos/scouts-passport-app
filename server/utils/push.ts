import webpush from 'web-push'
import { eq, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { now } from './passcode'

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

/** Push to scout ids, deduplicated via notification_log. Returns count actually pushed. */
export async function sendPushTo(scoutIds: number[], msg: { title: string, body: string, kind: string, refId: number }): Promise<number> {
  if (!scoutIds.length) return 0
  const db = useDb()
  // dedupe first, so announcements are logged even when push isn't configured
  const fresh: number[] = []
  for (const id of scoutIds) {
    try {
      db.insert(s.notificationLog).values({ scoutId: id, kind: msg.kind, refId: msg.refId, sentAt: now() }).run()
      fresh.push(id)
    } catch { /* already notified */ }
  }
  if (!fresh.length || !ensureConfigured()) return 0
  const subs = db.select().from(s.pushSubscriptions).all().filter(x => fresh.includes(x.scoutId))
  let sent = 0
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: msg.title, body: msg.body })
      )
      sent++
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.id, sub.id)).run()
      }
    }
  }))
  return sent
}
