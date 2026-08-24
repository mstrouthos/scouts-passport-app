import { and, eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireScout } from '../../utils/guard'
import { isVenture } from '../../utils/venture'
import { now } from '../../utils/passcode'

/** An Ανιχνευτής keeps their own logbooks — in the paper booklet these pages
    are theirs to fill in, not the Α.Κ.Α.'s. Sign-offs remain the leader's. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  if (!(await isVenture(me.id)))
    throw createError({ statusCode: 404, message: 'Not found' })
  const b = await readBody<any>(event)
  const db = await useDb()

  if (b?.remove) {
    // only ever their own rows
    await db.delete(s.ventureLogs)
      .where(and(eq(s.ventureLogs.id, Number(b.logId)), eq(s.ventureLogs.scoutId, me.id)))
    return { ok: true }
  }

  const kind = ['activity', 'exploration', 'bigOutdoor'].includes(b?.kind) ? b.kind : null
  if (!kind) throw createError({ statusCode: 400, message: 'Bad logbook' })
  const formEl = String(b?.formEl || '').trim()
  if (!formEl) throw createError({ statusCode: 400, message: 'Χρειάζεται η μορφή της δράσης' })

  await db.insert(s.ventureLogs).values({
    scoutId: me.id, kind,
    datesEl: String(b?.datesEl || '').slice(0, 200),
    formEl: formEl.slice(0, 400),
    placeEl: String(b?.placeEl || '').slice(0, 200),
    oeEl: String(b?.oeEl || '').slice(0, 200),
    createdAt: now()
  })
  return { ok: true }
})
