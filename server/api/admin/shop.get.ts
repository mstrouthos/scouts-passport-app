import { asc, desc } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireShopViewer, isShopManager, tillOf, trackStock, shopItemView, shopAudienceOf } from '../../utils/shop'

/** The shop, for a Βαθμοφόρος who may see it: what it sells and for how much
    (nothing can be bought or ordered here), with its pictures. Those who run
    it also get the items that are hidden, the till, and its book; the
    Αρχηγός Συστήματος, who it is open to. */
export default defineEventHandler(async (event) => {
  const me = await requireShopViewer(event, true)
  const manager = isShopManager(me)
  const db = await useDb()
  const counting = await trackStock()
  const items = (await db.select().from(s.shopItems).orderBy(asc(s.shopItems.sortOrder), asc(s.shopItems.name)))
    .filter(i => manager || i.visible)
    .map(i => shopItemView(i, counting))
  // who the shop is open to: the Αρχηγός Συστήματος sets it
  const audience = me.role === 'troop_leader'
    ? { ...await shopAudienceOf(), options: (await db.select().from(s.sections)).filter(x => x.hasApp).sort((a, b) => a.sortOrder - b.sortOrder).map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn })) }
    : null
  if (!manager) return { manager: false, items, audience }
  // (what the stock was when last counted stays kept, for if counting comes back on)
  const entries = await db.select().from(s.shopEntries).orderBy(desc(s.shopEntries.createdAt), desc(s.shopEntries.id))
  return {
    manager: true, items, trackStock: counting, audience,
    till: await tillOf(entries),
    entries: entries.slice(0, 200).map(e => ({
      id: e.id, kind: e.kind, method: e.method, amountCents: e.amountCents, payer: e.payer, note: e.note,
      items: (() => { try { return e.items ? JSON.parse(e.items) : [] } catch { return [] } })(),
      by: e.createdName, at: e.createdAt, voidedAt: e.voidedAt, voidedBy: e.voidedName, voidReason: e.voidReason
    }))
  }
})
