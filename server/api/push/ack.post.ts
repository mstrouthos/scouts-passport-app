import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { ackTest } from '../../utils/pushTest'

/** A phone's service worker, confirming it received a test push. Identified by
    its own subscription endpoint, so no session is needed — and all it can do
    is tick its own row in a test that exists. */
export default defineEventHandler(async (event) => {
  const b = await readBody<{ testId?: string, endpoint?: string }>(event)
  if (!b?.testId || !b?.endpoint) return { ok: false }
  const db = await useDb()
  const sub = (await db.select().from(s.pushSubscriptions).where(eq(s.pushSubscriptions.endpoint, String(b.endpoint))))[0]
  if (sub) ackTest(String(b.testId), sub.id)
  else console.warn('[push-test] ack from an endpoint we do not know', String(b.endpoint).slice(0, 48))
  return { ok: true }
})
