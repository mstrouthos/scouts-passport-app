import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { assertCan } from '../../../utils/permissions'

/** Put one group's pages in a new order, by dragging.

   A reader sees the troop-wide pages and their own sector's merged into one
   list, and a sector's page stands in for the troop-wide one of the same slug.
   So the order is kept per slug, one order for everyone: the pages dragged
   take the places their slugs already held, in their new order, and every
   other page stays exactly where it was. */
export default defineEventHandler(async (event) => {
  await assertCan(await requireLeader(event), 'info.edit')
  const b = await readBody<{ ids?: number[] }>(event)
  const ids = (b?.ids || []).map(Number)
  const db = await useDb()
  const pages = await db.select().from(s.infoPages)
  const byId = new Map(pages.map(p => [p.id, p]))
  if (!ids.length || ids.some(id => !byId.has(id))) throw createError({ statusCode: 400, message: 'Bad pages' })

  // every slug, in its current order
  const first = new Map<string, number>()
  for (const p of pages) first.set(p.slug, Math.min(first.get(p.slug) ?? Infinity, p.sortOrder))
  const order = [...first.keys()].sort((a, b) => first.get(a)! - first.get(b)! || a.localeCompare(b))

  // the dragged pages' slugs go into the places they held, in the new order
  const moved = [...new Set(ids.map(id => byId.get(id)!.slug))]
  const slots = moved.map(slug => order.indexOf(slug)).sort((a, b) => a - b)
  slots.forEach((slot, i) => { order[slot] = moved[i] })

  const rank = new Map(order.map((slug, i) => [slug, (i + 1) * 10]))
  for (const p of pages) {
    const want = rank.get(p.slug)!
    if (p.sortOrder !== want) await db.update(s.infoPages).set({ sortOrder: want }).where(eq(s.infoPages.id, p.id))
  }
  return { ok: true }
})
