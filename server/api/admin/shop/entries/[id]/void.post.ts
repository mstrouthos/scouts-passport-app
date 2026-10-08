import { and, eq, isNull, sql } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../../db'
import { idParam } from '../../../../../utils/guard'
import { now } from '../../../../../utils/passcode'
import { requireShopManager, tillOf } from '../../../../../utils/shop'

/** A wrong line cancelled, with why: it stays in the book, struck out, and
    stops counting; what it sold goes back on the shelf. */
export default defineEventHandler(async (event) => {
  const me = await requireShopManager(event)
  const id = idParam(event)
  const reason = String((await readBody<{ reason?: string }>(event))?.reason || '').trim().slice(0, 300)
  if (!reason) throw createError({ statusCode: 400, message: 'Γράψτε γιατί ακυρώνεται' })
  const db = await useDb()
  const [row] = await db.update(s.shopEntries).set({ voidedAt: now(), voidedBy: me.id, voidedName: `${me.firstName} ${me.lastName}`, voidReason: reason })
    .where(and(eq(s.shopEntries.id, id), isNull(s.shopEntries.voidedAt))).returning()
  if (!row) throw createError({ statusCode: 409, message: 'Έχει ήδη ακυρωθεί' })
  let sold: { id: number, qty: number, counted?: boolean }[] = []
  try { sold = row.items ? JSON.parse(row.items) : [] } catch {}
  // only what was taken off the shelf goes back on it
  for (const x of sold) if (x.counted) await db.update(s.shopItems).set({ stock: sql`${s.shopItems.stock} + ${x.qty}` }).where(and(eq(s.shopItems.id, x.id), sql`${s.shopItems.stock} is not null`))
  return { ok: true, till: await tillOf() }
})
