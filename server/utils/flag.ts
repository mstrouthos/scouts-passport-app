import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { shortName } from '../../utils/shortName'
import { tellFun } from './leaderFun'
import { FLAG_MIN_HAUL_MS, FLAG_MAX_HAUL_MS } from '../../utils/games'

/* The haul: whoever taps ⬆️ starts hauling, and the flag is theirs only if
   they finish first — after a real haul, at least FLAG_MIN_HAUL_MS of tapping
   and within FLAG_MAX_HAUL_MS. The starts are kept here, in the one server
   process: a haul cut short by a restart just has to be started again. */
const hauls = new Map<number, { day: string, which: 'raise' | 'lower', at: number }>()
export function startHaul(scoutId: number, day: string, which: 'raise' | 'lower') {
  hauls.set(scoutId, { day, which, at: Date.now() })
}
/** Whether this one's haul may finish now; a reason in Greek if not. */
export function finishHaul(scoutId: number, day: string, which: 'raise' | 'lower'): string | null {
  const h = hauls.get(scoutId)
  if (!h || h.day !== day || h.which !== which || Date.now() - h.at > FLAG_MAX_HAUL_MS) return 'Πάτα ξανά και τράβα το σχοινί από την αρχή'
  if (Date.now() - h.at < FLAG_MIN_HAUL_MS) return 'Πιο γρήγορα κι από τον άνεμο; Τράβα το σχοινί κανονικά 😄'
  hauls.delete(scoutId)
  return null
}

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
