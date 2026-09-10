import { useDb, schema as s } from '../../db'
import { requireTroopLeader } from '../../utils/guard'
import { cascadeDeleteScout } from '../../utils/deleteScout'

/** Empty the trash now, without waiting out the 30 days. Every trashed member
    goes, with all nineteen tables that referenced them. The Αρχηγός
    Συστήματος alone — a sector's leader can still restore or delete one at a
    time, but emptying it is troop-wide and cannot be undone. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const db = (await useDb())
  const due = (await db.select().from(s.scouts)).filter(r => r.deletedAt)
  for (const r of due) await cascadeDeleteScout(r.id)
  console.log(`[trash] ${me.firstName} ${me.lastName} emptied the trash: ${due.length} removed`)
  return { ok: true, deleted: due.length }
})
