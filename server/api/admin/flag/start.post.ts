import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { kimDay } from '../../../../utils/kim'
import { sunTimes } from '../../../../utils/sun'
import { FLAG_TAPS } from '../../../../utils/games'
import { flagWho, startHaul } from '../../../utils/flag'

/** I take the rope: my haul starts now (to raise from sunrise, to lower from
    sunset) — whoever finishes theirs first has the flag. Refused at once if
    it is not time, or it is already done. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (me.funPref === 'off' || me.isHidden) throw createError({ statusCode: 403, message: 'Δεν παίζεις τα μίνι παιχνίδια' })
  const which = (await readBody<{ which?: string }>(event))?.which === 'lower' ? 'lower' : 'raise'
  const day = kimDay(), sun = sunTimes(day), t = Date.now()
  const row = (await (await useDb()).select().from(s.flagDays).where(eq(s.flagDays.day, day)))[0]
  if (which === 'raise') {
    if (t < Date.parse(sun.rise)) throw createError({ statusCode: 409, message: 'Ο ήλιος δεν έχει ανατείλει ακόμα 🌙' })
    if (t >= Date.parse(sun.set)) throw createError({ statusCode: 409, message: 'Ο ήλιος έδυσε — η έπαρση γίνεται το πρωί ☀️' })
    if (row?.raisedBy) throw createError({ statusCode: 409, message: `Πρόλαβε ${await flagWho(day, 'raised')} 🇬🇷` })
  } else {
    if (t < Date.parse(sun.set)) throw createError({ statusCode: 409, message: 'Η υποστολή γίνεται μετά τη δύση 🌇' })
    if (!row?.raisedBy) throw createError({ statusCode: 409, message: 'Σήμερα η σημαία δεν υψώθηκε' })
    if (row.loweredBy) throw createError({ statusCode: 409, message: `Πρόλαβε ${await flagWho(day, 'lowered')} 🌙` })
  }
  startHaul(me.id, day, which)
  return { ok: true, taps: FLAG_TAPS }
})
