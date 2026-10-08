import { eq, inArray, sql } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { now } from '../../../utils/passcode'
import { requireShopManager, centsOf, tillOf } from '../../../utils/shop'

/** A line in the till's book:
    - 'payment': money in, cash or bank, from someone — for items of the shop
      (their prices add up, and fewer are left) or for anything, by a note;
    - 'expense': money out, cash or bank;
    - 'deposit': cash taken to the bank;
    - 'count': the till counted — the line is what the count found against
      what the book says, so the book then agrees. */
export default defineEventHandler(async (event) => {
  const me = await requireShopManager(event)
  const b = await readBody<{ kind?: string, method?: string, amount?: string | number, payer?: string, note?: string, items?: { id: number, qty: number }[] }>(event)
  const kind = String(b?.kind || '')
  if (!['payment', 'expense', 'deposit', 'count'].includes(kind)) throw createError({ statusCode: 400, message: 'Bad kind' })
  const method = kind === 'deposit' ? null : b?.method === 'bank' ? 'bank' : b?.method === 'cash' ? 'cash' : null
  if (kind !== 'deposit' && !method) throw createError({ statusCode: 400, message: 'Μετρητά ή τράπεζα;' })
  const note = String(b?.note || '').trim().slice(0, 300) || null
  const payer = kind === 'payment' ? String(b?.payer || '').trim().slice(0, 120) || null : null
  const db = await useDb()

  // what was sold, at today's prices
  let sold: { id: number, name: string, qty: number, priceCents: number }[] = []
  if (kind === 'payment' && Array.isArray(b?.items) && b!.items.length) {
    const want = b!.items.map(x => ({ id: Number(x.id), qty: Math.max(0, Math.round(Number(x.qty))) })).filter(x => Number.isInteger(x.id) && x.qty > 0)
    const rows = want.length ? await db.select().from(s.shopItems).where(inArray(s.shopItems.id, want.map(x => x.id))) : []
    sold = want.map(w => { const r = rows.find(x => x.id === w.id); return r ? { id: r.id, name: r.name, qty: w.qty, priceCents: r.priceCents } : null })
      .filter((x): x is NonNullable<typeof x> => !!x)
    for (const x of sold) {
      const r = rows.find(y => y.id === x.id)!
      if (r.stock != null && r.stock < x.qty) throw createError({ statusCode: 409, message: `Από «${r.name}» έχουν μείνει μόνο ${r.stock}` })
    }
  }
  let amount: number
  if (kind === 'count') {
    // what was counted, against what the book says: the difference is the line
    const counted = centsOf(b?.amount)
    if (counted == null || counted < 0) throw createError({ statusCode: 400, message: 'Γράψτε πόσα μετρήσατε' })
    const till = await tillOf()
    amount = counted - (method === 'cash' ? till.cash : till.bank)
    if (!amount) return { ok: true, nothing: true }
  } else {
    const total = sold.reduce((n, x) => n + x.qty * x.priceCents, 0)
    const typed = centsOf(b?.amount)
    amount = typed != null && typed > 0 ? typed : total
    if (!(amount > 0) || amount > 10_000_000) throw createError({ statusCode: 400, message: 'Γράψτε το ποσό' })
  }
  const [row] = await db.insert(s.shopEntries).values({
    kind, method, amountCents: amount, payer, note, items: sold.length ? JSON.stringify(sold) : null,
    createdBy: me.id, createdName: `${me.firstName} ${me.lastName}`, createdAt: now()
  }).returning()
  // fewer left of what was sold
  for (const x of sold) await db.update(s.shopItems).set({ stock: sql`${s.shopItems.stock} - ${x.qty}` }).where(eq(s.shopItems.id, x.id))
  return { ok: true, id: row!.id, till: await tillOf() }
})
