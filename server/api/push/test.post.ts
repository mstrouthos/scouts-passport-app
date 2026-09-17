import { useDb, schema as s } from '../../db'
import { eq } from 'drizzle-orm'
import { deliverTo } from '../../utils/push'

/** "Did that work?" — a push to this very device, whoever is signed in. */
export default defineEventHandler(async (event) => {
  const session: any = await getUserSession(event)
  const b = await readBody<{ endpoint?: string }>(event)
  const endpoint = String(b?.endpoint || '')
  if (!endpoint) throw createError({ statusCode: 400, message: 'No subscription' })
  if (!session?.user?.id && !session?.parent?.id && !session?.bar?.staffId) throw createError({ statusCode: 401, message: 'Not signed in' })
  const db = await useDb()
  const sub = (await db.select().from(s.pushSubscriptions).where(eq(s.pushSubscriptions.endpoint, endpoint)))[0]
  if (!sub) throw createError({ statusCode: 404, message: 'Η συσκευή δεν είναι εγγεγραμμένη' })
  // deliver to this one row only, whichever identity it carries
  const sent = await deliverTo([sub], JSON.stringify({ title: '🔔 Δοκιμή', body: 'Οι ειδοποιήσεις δουλεύουν σε αυτή τη συσκευή.', url: '/' }))
  return { sent }
})
