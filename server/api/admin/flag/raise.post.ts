import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { kimDay } from '../../../../utils/kim'
import { sunTimes } from '../../../../utils/sun'
import { flagWho, tellFlag } from '../../../utils/flag'

/** The flag goes up: from sunrise until sunset, by whoever is first — the
    day's row is made once, so two pulling at once cannot both have it. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (me.funPref === 'off' || me.isHidden) throw createError({ statusCode: 403, message: 'Δεν παίζεις τα μίνι παιχνίδια' })
  const day = kimDay(), sun = sunTimes(day), t = Date.now()
  if (t < Date.parse(sun.rise)) throw createError({ statusCode: 409, message: 'Ο ήλιος δεν έχει ανατείλει ακόμα 🌙' })
  if (t >= Date.parse(sun.set)) throw createError({ statusCode: 409, message: 'Ο ήλιος έδυσε — η έπαρση γίνεται το πρωί ☀️' })
  const db = await useDb()
  const done = await db.insert(s.flagDays).values({ day, raisedBy: me.id, raisedAt: now() }).onConflictDoNothing().returning()
  if (!done.length) throw createError({ statusCode: 409, message: `Πρόλαβε ${await flagWho(day, 'raised')} 🇬🇷` })
  await tellFlag(me, 'raised', day)
  return { ok: true }
})
