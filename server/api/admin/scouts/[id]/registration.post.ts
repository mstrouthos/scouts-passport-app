import { and, eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, assertScoutInScope, idParam } from '../../../../utils/guard'
import { registerChildren } from '../../../../utils/registrations'
import { scoutYear } from '../../../../../utils/scoutYear'

/** A member registered for this scout year by hand — a registration made on
    paper — or that mark taken off again. One that came from a form's answer
    is changed from the answer itself. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  await assertScoutInScope(me, id)
  const on = !!(await readBody<{ on?: boolean }>(event))?.on
  const db = await useDb()
  const year = scoutYear()
  const cur = (await db.select().from(s.registrations).where(and(eq(s.registrations.scoutId, id), eq(s.registrations.year, year))).limit(1))[0]
  if (on) {
    if (!cur) await registerChildren([id], year, { markedBy: me.id })
  } else if (cur) {
    if (!cur.markedBy) throw createError({ statusCode: 400, message: 'Η εγγραφή έγινε με φόρμα — αλλάζει από την απάντηση της φόρμας' })
    await db.delete(s.registrations).where(eq(s.registrations.id, cur.id))
  }
  return { ok: true }
})
