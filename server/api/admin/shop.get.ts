import { asc, desc } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { isShopManager, tillOf } from '../../utils/shop'

/** The shop: what it sells and for how much, for every Βαθμοφόρος (nothing
    can be bought or ordered here). Those who run it also get the items that
    are hidden, the till, and its book. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const manager = isShopManager(me)
  const db = await useDb()
  const items = (await db.select().from(s.shopItems).orderBy(asc(s.shopItems.sortOrder), asc(s.shopItems.name)))
    .filter(i => manager || i.visible)
    .map(i => ({ id: i.id, name: i.name, description: i.description, priceCents: i.priceCents, stock: i.stock, visible: i.visible, sortOrder: i.sortOrder }))
  if (!manager) return { manager: false, items }
  const entries = await db.select().from(s.shopEntries).orderBy(desc(s.shopEntries.createdAt), desc(s.shopEntries.id))
  return {
    manager: true, items,
    till: await tillOf(entries),
    entries: entries.slice(0, 200).map(e => ({
      id: e.id, kind: e.kind, method: e.method, amountCents: e.amountCents, payer: e.payer, note: e.note,
      items: (() => { try { return e.items ? JSON.parse(e.items) : [] } catch { return [] } })(),
      by: e.createdName, at: e.createdAt, voidedAt: e.voidedAt, voidedBy: e.voidedName, voidReason: e.voidReason
    }))
  }
})
