import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { shortName } from '../../utils/shortName'
import { tellFun } from './leaderFun'

/** Who raised (or lowered) the day's flag, by name — for "beaten to it by …". */
export async function flagWho(day: string, which: 'raised' | 'lowered') {
  const db = await useDb()
  const row = (await db.select().from(s.flagDays).where(eq(s.flagDays.day, day)))[0]
  const id = which === 'raised' ? row?.raisedBy : row?.loweredBy
  if (!id) return 'κάποιος άλλος'
  const p = (await db.select().from(s.scouts).where(eq(s.scouts.id, id)))[0]
  return shortName(p) || 'κάποιος άλλος'
}

/** Everyone else hears it — after the fact, never as a reminder: "Μιχάλης Σ.
    ύψωσε τη σημαία. Καλημέρα!". The games' push rules apply (one by one at
    first, then bundled; at night it waits — a dawn raise reaches phones with
    the 08:00 bundle), and it waits in the flag's own 🔔. */
export async function tellFlag(me: { id: number, firstName: string, lastName: string }, which: 'raised' | 'lowered', day: string) {
  const db = await useDb()
  const others = (await db.select().from(s.scouts))
    .filter(r => r.role !== 'scout' && r.isActive && !r.deletedAt && !r.isHidden && r.funPref !== 'off' && r.id !== me.id)
  // one id a day for each, so a push is never sent twice
  const dayNo = Math.floor(Date.parse(`${day}T12:00:00Z`) / 86400_000)
  const who = shortName(me)
  for (const r of others) {
    await tellFun(r.id, which === 'raised'
      ? { title: '🇬🇷 Έπαρση Σημαίας', kind: 'flag', refId: dayNo * 2, body: `🇬🇷 ${who} ύψωσε τη σημαία. Καλημέρα! ☀️` }
      : { title: '🇬🇷 Υποστολή Σημαίας', kind: 'flag', refId: dayNo * 2 + 1, body: `🌙 ${who} κατέβασε τη σημαία. Καληνύχτα!` })
  }
}
