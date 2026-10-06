import { and, eq, inArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { idParam } from '../../../../utils/guard'
import { formForLeader, formSections, logAccess } from '../../../../utils/forms'
import { sectionsOfParent } from '../../../../utils/parents'

/** Take a form back from one sector's parents — sent there by mistake. It
    leaves their list of forms to fill in and their bell; a parent who also
    has a child in a sector it is still sent to keeps it. What anyone has
    already sent stays with the form. */
export default defineEventHandler(async (event) => {
  const { me, f } = await formForLeader(event, idParam(event))
  const sid = Number((await readBody<{ sectionId?: number }>(event))?.sectionId)
  const secs = await formSections(me)
  if (!Number.isInteger(sid) || (secs !== null && !secs.includes(sid))) throw createError({ statusCode: 400, message: 'Διαλέξτε τομέα' })
  const db = await useDb()
  const invites = await db.select().from(s.formInvites).where(eq(s.formInvites.formId, f.id))
  const [parents, links, scouts, patrols] = await Promise.all([
    db.select().from(s.parents), db.select().from(s.parentChildren), db.select().from(s.scouts), db.select().from(s.patrols)])
  const secsOf = new Map(invites.map(i => {
    const p = parents.find(x => x.id === i.parentId)
    return [i.parentId, p ? sectionsOfParent(p, links, scouts, patrols) : []] as const
  }))
  // the sectors it stays sent to: every other one any invited parent is in
  const kept = new Set([...secsOf.values()].flat().filter(x => x !== sid))
  const gone = invites.filter(i => { const ps = secsOf.get(i.parentId) || []; return ps.includes(sid) && !ps.some(x => kept.has(x)) }).map(i => i.parentId)
  if (gone.length) {
    await db.delete(s.formInvites).where(and(eq(s.formInvites.formId, f.id), inArray(s.formInvites.parentId, gone)))
    await db.delete(s.parentNotifications).where(and(inArray(s.parentNotifications.parentId, gone),
      inArray(s.parentNotifications.kind, ['formInvite', 'formReminder']), eq(s.parentNotifications.refId, f.id)))
  }
  await logAccess(f.id, me.id, `unsend-parents:${sid}`)
  return { ok: true, parents: gone.length }
})
