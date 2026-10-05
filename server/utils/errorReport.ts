import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'

/* Something went wrong: tell Discord, with what is needed to find it — where
   in the app, which request, who was signed in, the error and the first lines
   of its trace, and anything the caller adds (a bucket's error code, a form's
   link…). Never form answers, passcodes or request bodies.

   It goes to NUXT_DISCORD_ERRORS_WEBHOOK_URL, or to NUXT_DISCORD_WEBHOOK_URL
   when there is no separate channel for errors; without either, only the
   server log has it. The same error again within ten minutes is counted, not
   posted again, so one broken thing cannot flood the channel. Reporting
   itself never throws. */

const WINDOW_MS = 10 * 60_000
const seen = new Map<string, { at: number, suppressed: number }>()

type Ctx = Record<string, unknown>

function webhook(): string {
  const c = useRuntimeConfig() as any
  return c.discordErrorsWebhookUrl || process.env.NUXT_DISCORD_ERRORS_WEBHOOK_URL || c.discordWebhookUrl || ''
}

const clip = (v: unknown, n: number) => {
  const s = String(v ?? '')
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

/** Who was signed in, as a name, when the request says so. */
async function whoOf(event?: H3Event): Promise<string> {
  if (!event) return '—'
  try {
    const session: any = await getUserSession(event)
    const db = await useDb()
    if (session?.user?.id) {
      const r = (await db.select().from(s.scouts).where(eq(s.scouts.id, session.user.id)).limit(1))[0]
      return r ? `${r.firstName} ${r.lastName} (#${r.id}, ${r.role})` : `#${session.user.id}`
    }
    if (session?.parent?.id) {
      const p = (await db.select().from(s.parents).where(eq(s.parents.id, session.parent.id)).limit(1))[0]
      return p ? `Γονέας: ${p.name} (#${p.id})` : `Γονέας #${session.parent.id}`
    }
    if (session?.bar?.staffId) return `Μπαρ #${session.bar.staffId}`
  } catch { /* the session or the database may be what failed */ }
  return 'κανείς (δημόσιο)'
}

/** What an error carries that helps: an HTTP status, an S3 or Postgres code. */
function detailsOf(err: any): string[] {
  const out: string[] = []
  const status = err?.statusCode ?? err?.status ?? err?.$metadata?.httpStatusCode
  if (status) out.push(`status ${status}`)
  if (err?.Code || err?.code) out.push(`code ${err.Code || err.code}`)
  if (err?.name && err.name !== 'Error') out.push(err.name)
  if (err?.$metadata?.requestId) out.push(`request ${err.$metadata.requestId}`)
  if (err?.data && typeof err.data === 'object' && !Array.isArray(err.data)) out.push(clip(JSON.stringify(err.data), 200))
  return out
}

export async function reportError(where: string, err: unknown, ctx: Ctx = {}, event?: H3Event) {
  const e: any = err ?? {}
  const message = clip(e?.message || e?.statusMessage || String(err), 400)
  console.error(`[error] ${where}:`, err, Object.keys(ctx).length ? ctx : '')
  const url = webhook()
  if (!url) return
  // reported from deep inside a request (storage, push…): find that request
  if (!event) { try { event = useEvent() } catch { /* not inside a request: the cron, a timer */ } }

  const key = `${where}|${message}`
  const now = Date.now()
  const prev = seen.get(key)
  if (prev && now - prev.at < WINDOW_MS) { prev.suppressed++; return }
  const suppressed = prev?.suppressed || 0
  seen.set(key, { at: now, suppressed: 0 })
  if (seen.size > 500) for (const [k, v] of seen) if (now - v.at > WINDOW_MS) seen.delete(k)

  try {
    const req = event ? `${event.method} ${(event.path || '').split('?')[0]}` : '—'
    const host = event ? (getRequestHost(event, { xForwardedHost: true }) || '—') : '—'
    const stack = String(e?.stack || '').split('\n').slice(1, 9).map((l: string) => l.trim()).join('\n')
    const fields = [
      { name: 'Πού', value: clip(where, 200), inline: true },
      { name: 'Αίτημα', value: clip(req, 200), inline: true },
      { name: 'Ποιος', value: clip(await whoOf(event), 200), inline: true },
      { name: 'Σφάλμα', value: clip(message, 1000) || '—' }
    ]
    const det = detailsOf(e)
    if (det.length) fields.push({ name: 'Λεπτομέρειες', value: clip(det.join(' · '), 1000) })
    const extra = Object.entries(ctx).filter(([, v]) => v !== undefined && v !== null && v !== '')
    if (extra.length) fields.push({ name: 'Πλαίσιο', value: clip(extra.map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n'), 1000) })
    if (stack) fields.push({ name: 'Ίχνος', value: '```\n' + clip(stack, 980) + '\n```' })
    if (suppressed) fields.push({ name: 'Επαναλήψεις', value: `+${suppressed} ίδια σφάλματα τα προηγούμενα 10 λεπτά` })
    await $fetch(url, {
      method: 'POST',
      body: {
        username: 'Πύλη Προσκόπων · Σφάλματα',
        embeds: [{
          title: `🔴 ${clip(where, 200)}`, color: 0xD8543C, fields,
          footer: { text: `${host} · ${process.env.SOURCE_COMMIT ? 'έκδοση ' + String(process.env.SOURCE_COMMIT).slice(0, 7) : 'Πύλη Προσκόπων'}` },
          timestamp: new Date().toISOString()
        }]
      },
      timeout: 8000
    })
  } catch (postErr: any) {
    console.warn('[error] could not post to Discord', postErr?.message)
  }
}

/** Fire and forget, for the places that carry on after a failure. */
export function noteError(where: string, err: unknown, ctx: Ctx = {}, event?: H3Event) {
  reportError(where, err, ctx, event).catch(() => {})
}
