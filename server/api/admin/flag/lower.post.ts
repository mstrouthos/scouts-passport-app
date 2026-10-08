import { and, eq, isNull, isNotNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { kimDay } from '../../../../utils/kim'
import { sunTimes } from '../../../../utils/sun'
import { flagWho, tellFlag } from '../../../utils/flag'

/** The flag comes down: from sunset until the day ends, by whoever is first —
    and only a flag that went up. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (me.funPref === 'off' || me.isHidden) throw createError({ statusCode: 403, message: 'Δεν παίζεις τα μίνι παιχνίδια' })
  const day = kimDay(), sun = sunTimes(day)
  if (Date.now() < Date.parse(sun.set)) throw createError({ statusCode: 409, message: 'Η υποστολή γίνεται μετά τη δύση 🌇' })
  const db = await useDb()
  const done = await db.update(s.flagDays).set({ loweredBy: me.id, loweredAt: now() })
    .where(and(eq(s.flagDays.day, day), isNotNull(s.flagDays.raisedBy), isNull(s.flagDays.loweredBy))).returning()
  if (!done.length) {
    const row = (await db.select().from(s.flagDays).where(eq(s.flagDays.day, day)))[0]
    throw createError({ statusCode: 409, message: !row?.raisedBy ? 'Σήμερα η σημαία δεν υψώθηκε' : `Πρόλαβε ${await flagWho(day, 'lowered')} 🌙` })
  }
  await tellFlag(me, 'lowered', day)
  return { ok: true, both: done[0]!.raisedBy === me.id }
})
