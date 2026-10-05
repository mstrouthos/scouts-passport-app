import { reportError } from '../utils/errorReport'
import { ipHash } from '../utils/seal'

/* An error on someone's phone or computer — in the app or a form — sent here
   by plugins/error-report.client.ts and passed on to Discord. Anyone may send
   one (a form's visitor is signed into nothing), so it is kept small and a
   device that sends too many is ignored for a while. */
const recent = new Map<string, number[]>()

export default defineEventHandler(async (event) => {
  const who = ipHash(getRequestIP(event, { xForwardedFor: true }) || 'unknown')
  const now = Date.now()
  const times = (recent.get(who) || []).filter(t => now - t < 10 * 60_000)
  if (times.length >= 10) return { ok: true }
  times.push(now); recent.set(who, times)
  if (recent.size > 2000) recent.clear()

  const b = await readBody<any>(event).catch(() => null)
  const clip = (v: unknown, n: number) => String(v ?? '').slice(0, n)
  const err = Object.assign(new Error(clip(b?.message, 500) || 'Άγνωστο σφάλμα'), { stack: clip(b?.stack, 3000), name: clip(b?.name, 60) || 'Error' })
  await reportError('Σφάλμα στη συσκευή', err, {
    σελίδα: clip(b?.page, 200), πηγή: clip(b?.source, 80), συσκευή: clip(getHeader(event, 'user-agent'), 180)
  }, event)
  return { ok: true }
})
