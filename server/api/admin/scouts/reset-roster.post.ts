import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { cascadeDeleteScout } from '../../../utils/deleteScout'

/** Troop-leader-only: permanently delete every scout/leader except the caller —
    for clearing the demo roster before onboarding a real one. Sections,
    patrols, and the badge/challenge catalog are untouched. Requires an
    explicit confirm flag so this can never fire from a stray/replayed request. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (me.role !== 'troop_leader') throw createError({ statusCode: 403, message: 'Troop leader only' })
  const body = await readBody<{ confirm?: boolean }>(event).catch(() => ({}))
  if (body?.confirm !== true) throw createError({ statusCode: 400, message: 'Confirmation required' })

  const db = useDb()
  const others = db.select().from(s.scouts).all().filter(r => r.id !== me.id)
  let deleted = 0
  const failed: string[] = []
  for (const r of others) {
    try { cascadeDeleteScout(r.id); deleted++ }
    catch { failed.push(`${r.firstName} ${r.lastName}`) }
  }
  return { deleted, failed }
})
