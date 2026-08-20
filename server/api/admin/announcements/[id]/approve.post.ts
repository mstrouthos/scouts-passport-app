import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, scopedSectionIds, rankOf, idParam } from '../../../../utils/guard'
import { dispatchAnnouncement } from '../../../../utils/announce'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const db = (await useDb())
  const a = (await db.select().from(s.announcements).where(eq(s.announcements.id, id)).limit(1))[0]
  if (!a) throw createError({ statusCode: 404, message: 'Not found' })
  if (a.status !== 'pending') throw createError({ statusCode: 400, message: 'Already sent' })

  const rank = await rankOf(me)
  const secs = await scopedSectionIds(me)
  const allowed = rank === 'admin' ||
    (rank === 'archigos' && a.sectionId != null && (secs === null || secs.includes(a.sectionId)))
  if (!allowed) throw createError({ statusCode: 403, message: 'Only the Αρχηγός of this sector can approve' })

  const result = await dispatchAnnouncement(a, me.id)
  return { id, status: 'sent', ...result }
})
