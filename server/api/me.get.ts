import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout, scopedPatrolIds } from '../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = useDb()
  const patrol = me.patrolId ? db.select().from(s.patrols).where(eq(s.patrols.id, me.patrolId)).get() : null
  const section = patrol ? db.select().from(s.sections).where(eq(s.sections.id, patrol.sectionId)).get() : null
  const pids = me.role === 'scout' ? null : scopedPatrolIds(me)
  const scopePatrols = pids === null ? null
    : db.select().from(s.patrols).all().filter(p => pids.includes(p.id))
  return {
    id: me.id, firstName: me.firstName, lastName: me.lastName,
    firstNameEn: me.firstNameEn, lastNameEn: me.lastNameEn,
    role: me.role, locale: me.locale,
    patrol: patrol && { id: patrol.id, nameEl: patrol.nameEl, nameEn: patrol.nameEn, emblem: patrol.emblem },
    section: section && { id: section.id, nameEl: section.nameEl, nameEn: section.nameEn },
    scopePatrols: scopePatrols?.map(p => ({ id: p.id, nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem })) ?? null
  }
})
