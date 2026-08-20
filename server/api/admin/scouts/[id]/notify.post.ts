import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, assertScoutInScope, assertLeaderInScope, idParam } from '../../../../utils/guard'
import { sendPushTo } from '../../../../utils/push'

/** One-off direct notification to a single scout or leader — separate from
    the announcement/approval flow, since this is the leader's own message to
    one person, not a broadcast that needs Αρχηγός sign-off. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const db = useDb()
  const target = db.select().from(s.scouts).where(eq(s.scouts.id, id)).get()
  if (!target) throw createError({ statusCode: 404, message: 'Not found' })
  if (target.role === 'scout') assertScoutInScope(me, id)
  else assertLeaderInScope(me, id)

  const body = await readBody<{ text?: string }>(event)
  const text = String(body?.text || '').trim()
  if (!text) throw createError({ statusCode: 400, message: 'Message required' })

  const pushed = await sendPushTo([id], {
    title: `${me.firstName} ${me.lastName}`, body: text, kind: 'direct', refId: Date.now()
  })
  return { sent: pushed > 0 }
})
