import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { idParam } from '../../../../utils/guard'
import { formForLeader } from '../../../../utils/forms'
import { sectionsOfParent } from '../../../../utils/parents'

/** Which sectors' parents a form has been sent to, and how many of them. */
export default defineEventHandler(async (event) => {
  const { f } = await formForLeader(event, idParam(event))
  const db = await useDb()
  const invites = await db.select().from(s.formInvites).where(eq(s.formInvites.formId, f.id))
  if (!invites.length) return []
  const [parents, links, scouts, patrols, sections] = await Promise.all([
    db.select().from(s.parents), db.select().from(s.parentChildren), db.select().from(s.scouts), db.select().from(s.patrols), db.select().from(s.sections)])
  const count = new Map<number, number>()
  for (const i of invites) {
    const p = parents.find(x => x.id === i.parentId)
    if (p) for (const sid of sectionsOfParent(p, links, scouts, patrols)) count.set(sid, (count.get(sid) || 0) + 1)
  }
  return sections.filter(x => count.has(x.id)).map(x => ({ id: x.id, nameEl: x.nameEl, parents: count.get(x.id) }))
})
