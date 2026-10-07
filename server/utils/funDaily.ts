import { and, eq, gt, lte } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { sendPushTo } from './push'
import { funAction } from '../../utils/fun'
import { potatoAudience } from './leaderFun'

/* The day's target: at 23:00 every evening, every Βαθμοφόρος who plays is
   told who had the most thrown at them since 23:00 the evening before (all
   of them, if it is a tie) — the one push of the mini-games that comes after
   22:00, because it is the evening's news. The playground shows them, with
   their avatar and the count, until the next one. Kept in settings
   ('fun.daily'), so it is worked out once. */

export type FunDaily = { day: string, at: string, count: number, top: number[] }

const KEY = 'fun.daily'
const cyDay = (at = new Date()) => at.toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })
const cyHour = (at = new Date()) => Number(at.toLocaleString('en-GB', { timeZone: 'Europe/Nicosia', hour: '2-digit', hour12: false }))

export async function funDailyLast(): Promise<FunDaily | null> {
  const db = await useDb()
  const v = (await db.select().from(s.settings).where(eq(s.settings.key, KEY)))[0]?.value
  try { return v ? JSON.parse(v) : null } catch { return null }
}

/** Called by the cron: from 23:00, once a day. */
export async function funDailyTick(force = false): Promise<FunDaily | null> {
  if (!force && cyHour() !== 23) return null
  const day = cyDay()
  const last = await funDailyLast()
  if (last?.day === day) return null
  const db = await useDb()
  const until = new Date()
  const since = last?.at && Date.parse(last.at) > until.getTime() - 36 * 3600_000 ? last.at : new Date(until.getTime() - 24 * 3600_000).toISOString()
  const rows = await db.select().from(s.leaderFun).where(and(gt(s.leaderFun.createdAt, since), lte(s.leaderFun.createdAt, until.toISOString())))
  const per = new Map<number, number>()
  for (const r of rows) if (funAction(r.action)?.motion === 'throw') per.set(r.toId, (per.get(r.toId) || 0) + 1)
  const hidden = new Set((await db.select({ id: s.scouts.id, isHidden: s.scouts.isHidden }).from(s.scouts)).filter(x => x.isHidden).map(x => x.id))
  for (const id of hidden) per.delete(id)
  const count = Math.max(0, ...per.values())
  const result: FunDaily = { day, at: until.toISOString(), count, top: count ? [...per.entries()].filter(([, n]) => n === count).map(([id]) => id) : [] }
  // kept first: two runs at once announce it once
  const saved = await db.insert(s.settings).values({ key: KEY, value: JSON.stringify(result) })
    .onConflictDoUpdate({ target: s.settings.key, set: { value: JSON.stringify(result) }, ...(last ? { setWhere: eq(s.settings.value, JSON.stringify(last)) } : {}) })
    .returning()
  if (!saved.length || !count) return result
  const names = (await db.select({ id: s.scouts.id, firstName: s.scouts.firstName }).from(s.scouts))
    .filter(x => result.top.includes(x.id)).map(x => x.firstName)
  const who = names.length > 1 ? names.slice(0, -1).join(', ') + ' και ' + names.at(-1) : names[0]
  const dayNo = Math.floor(until.getTime() / 86400_000)
  await sendPushTo(await potatoAudience(), {
    title: '🎯 Ο στόχος της ημέρας',
    body: names.length > 1
      ? `${who} — από ${count} πράγματα ο καθένας τους έφαγαν σήμερα! 🍅`
      : `${who} — έφαγε ${count} ${count === 1 ? 'πράγμα' : 'πράγματα'} σήμερα! 🍅`,
    kind: 'fun-daily', refId: dayNo
  })
  return result
}
