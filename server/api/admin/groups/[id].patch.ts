import { and, eq, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds, scopedScouts, idParam } from '../../../utils/guard'

async function groupInScope(me: any, id: number) {
  const db = (await useDb())
  const g = (await db.select().from(s.notifyGroups).where(eq(s.notifyGroups.id, id)).limit(1))[0]
  if (!g) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = await scopedSectionIds(me)
  if (secIds !== null && (g.sectionId == null || !secIds.includes(g.sectionId)))
    throw createError({ statusCode: 403, message: 'Out of your sector' })
  return g
}

/** Rename a group and/or replace its membership. Only people the leader
    actually manages can be added. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  await groupInScope(me, id)
  const b = await readBody<{ nameEl?: string, emoji?: string, memberIds?: number[] }>(event)
  const db = (await useDb())

  const set: any = {}
  if (b?.nameEl !== undefined) {
    const v = String(b.nameEl).trim()
    if (!v) throw createError({ statusCode: 400, message: 'Name required' })
    set.nameEl = v
  }
  if (b?.emoji !== undefined) set.emoji = String(b.emoji || '🎺').slice(0, 4)
  if (Object.keys(set).length) await db.update(s.notifyGroups).set(set).where(eq(s.notifyGroups.id, id))

  if (Array.isArray(b?.memberIds)) {
    const allowed = new Set([
      ...(await scopedScouts(me)).map(r => r.id),
      ...(await db.select().from(s.scouts)).filter(r => r.role !== 'scout').map(r => r.id)
    ])
    const ids = [...new Set(b.memberIds.map(Number).filter(n => Number.isInteger(n)))]
    const bad = ids.find(n => !allowed.has(n))
    if (bad) throw createError({ statusCode: 403, message: 'Someone in that list is out of your sector' })
    await db.delete(s.notifyGroupMembers).where(eq(s.notifyGroupMembers.groupId, id))
    if (ids.length)
      await db.insert(s.notifyGroupMembers).values(ids.map(scoutId => ({ groupId: id, scoutId })))
  }
  return { ok: true }
})
