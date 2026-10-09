import { and, eq, gt, gte, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { isThrowable, giftsNote, GIFTS_PER_DAY, BAG_MAX } from '../../../../utils/fun'
import { take, grant, bagOf } from '../../../utils/funBag'
import { cyprusDayStart, funPaused, tellFun } from '../../../utils/leaderFun'
import { shortName } from '../../../../utils/shortName'

/** A thing from my backpack into someone else's — three a day at most. A
    gift is a kind thing, so it goes to anyone who plays at all (only kind
    things, too), never to myself, and not into a backpack that is full. They
    are told; more from me while they have not looked grows that one note. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (await funPaused()) throw createError({ statusCode: 403, message: 'Η παρέα κάνει διάλειμμα' })
  const b = await readBody<{ to?: number, item?: string }>(event)
  const to = Number(b?.to), item = String(b?.item || '')
  if (!Number.isInteger(to) || !isThrowable(item)) throw createError({ statusCode: 400, message: 'Bad gift' })
  if (to === me.id) throw createError({ statusCode: 400, message: 'Όχι στον εαυτό σου 😄' })
  if (me.funPref === 'off') throw createError({ statusCode: 403, message: 'Έχεις βγει από την παρέα (Ρυθμίσεις παρέας)' })
  const db = await useDb()
  const target = (await db.select().from(s.scouts).where(eq(s.scouts.id, to)).limit(1))[0]
  if (!target || target.role === 'scout' || !target.isActive || target.deletedAt) throw createError({ statusCode: 404, message: 'Not found' })
  if (me.isHidden || target.isHidden) throw createError({ statusCode: 403, message: 'Οι δοκιμαστικοί λογαριασμοί δεν παίζουν με πραγματικούς Βαθμοφόρους' })
  if (target.funPref === 'off') throw createError({ statusCode: 403, message: `${target.firstName} δεν παίζει τώρα` })

  const today = cyprusDayStart()
  const given = (await db.select().from(s.funGifts).where(and(eq(s.funGifts.fromId, me.id), gt(s.funGifts.createdAt, today)))).length
  if (given >= GIFTS_PER_DAY) throw createError({ statusCode: 429, message: `Χάρισες ήδη ${GIFTS_PER_DAY} σήμερα 🎁 Ξανά αύριο!` })
  const theirs = Object.values(await bagOf(to)).reduce((n, x) => n + x, 0)
  if (theirs >= BAG_MAX) throw createError({ statusCode: 409, message: `Το σακίδιο του/της ${target.firstName} είναι γεμάτο 🎒` })
  if (!(await take(me.id, item))) throw createError({ statusCode: 409, message: 'Δεν το έχεις πια στο σακίδιό σου 🎒' })

  const [gift] = await db.insert(s.funGifts).values({ fromId: me.id, toId: to, item, createdAt: now() }).returning()
  const got = await grant(to, { [item]: 1 }, 'gift', String(gift!.id))
  if (!got || !got[item]) {
    // it did not fit after all: back where it came from, and not counted
    await grant(me.id, { [item]: 1 }, 'gift-back', String(gift!.id))
    await db.delete(s.funGifts).where(eq(s.funGifts.id, gift!.id))
    throw createError({ statusCode: 409, message: `Το σακίδιο του/της ${target.firstName} είναι γεμάτο 🎒` })
  }

  // told: one note of mine while they have not looked, growing with each gift
  const since = new Date(Date.now() - 6 * 3600_000).toISOString()
  const open = (await db.select().from(s.notifications).where(and(eq(s.notifications.scoutId, to), eq(s.notifications.kind, 'fun-gift'),
    isNull(s.notifications.readAt), isNull(s.notifications.dismissedAt), gt(s.notifications.createdAt, since)))).sort((a, c) => c.id - a.id)
  let told = false
  for (const n of open) {
    const first = (await db.select().from(s.funGifts).where(eq(s.funGifts.id, n.refId)).limit(1))[0]
    if (!first || first.fromId !== me.id) continue
    const all = await db.select().from(s.funGifts).where(and(eq(s.funGifts.fromId, me.id), eq(s.funGifts.toId, to), gte(s.funGifts.id, first.id)))
    await db.update(s.notifications).set({ body: giftsNote(shortName(me), all.sort((a, c) => a.id - c.id).map(g => g.item)), createdAt: now() }).where(eq(s.notifications.id, n.id))
    told = true
    break
  }
  if (!told) await tellFun(to, { title: '🎁 Σπλατς', kind: 'fun-gift', refId: gift!.id, body: giftsNote(shortName(me), [item]) })
  return { ok: true, bag: await bagOf(me.id), giftsLeft: GIFTS_PER_DAY - given - 1 }
})
