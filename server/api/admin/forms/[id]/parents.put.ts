import { and, eq, inArray, notInArray } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { idParam } from '../../../../utils/guard'
import { formForLeader, formSections, logAccess } from '../../../../utils/forms'
import { audienceOf } from '../../../../utils/familyForms'
import { now } from '../../../../utils/passcode'

/** Which sectors' parents see the form in the app — saved without telling
    anyone: it appears among their forms to fill in, and notifying them is a
    separate step. A sector taken off takes it out of those parents' list and
    bell (one who also has a child in a sector still on keeps it). */
export default defineEventHandler(async (event) => {
  const { me, f } = await formForLeader(event, idParam(event))
  const b = await readBody<{ sectionIds?: number[] }>(event)
  const allowed = await formSections(me)
  const db = await useDb()
  const real = new Set((await db.select({ id: s.sections.id }).from(s.sections)).map(x => x.id))
  const chosen = [...new Set((Array.isArray(b?.sectionIds) ? b!.sectionIds : []).map(Number))]
    .filter(id => real.has(id) && (allowed === null || allowed.includes(id)))
  const t = now()
  await db.update(s.forms).set({ parentSections: JSON.stringify(chosen), parentsSetAt: t }).where(eq(s.forms.id, f.id))
  const fresh = { ...f, parentSections: JSON.stringify(chosen) }
  const audience = await audienceOf(fresh)
  // those it is no longer for lose it, and its notices, at once
  const gone = (await db.select().from(s.formInvites).where(audience.length
    ? and(eq(s.formInvites.formId, f.id), notInArray(s.formInvites.parentId, audience))
    : eq(s.formInvites.formId, f.id))).map(i => i.parentId)
  if (gone.length) {
    await db.delete(s.formInvites).where(and(eq(s.formInvites.formId, f.id), inArray(s.formInvites.parentId, gone)))
    await db.delete(s.parentNotifications).where(and(inArray(s.parentNotifications.parentId, gone),
      inArray(s.parentNotifications.kind, ['formInvite', 'formReminder']), eq(s.parentNotifications.refId, f.id)))
  }
  await logAccess(f.id, me.id, `parents:${chosen.join(',')}`)
  return { ok: true, sectionIds: chosen, parents: audience.length, removed: gone.length }
})
