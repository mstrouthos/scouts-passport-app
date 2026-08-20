import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, scopedScouts } from '../../utils/guard'

/** Troop Leader: full roster of Βαθμοφόροι, any section. Section leader (Αρχηγός/
    Υπαρχηγός of one section): only the patrol-level leaders within their own
    section, and only their own section's scouts as appointable candidates. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = useDb()
  const secIds = scopedSectionIds(me)
  if (secIds !== null && !secIds.length)
    throw createError({ statusCode: 403, message: 'Section leaders only' })

  const scopes = db.select().from(s.leaderScopes).all()
  const allLeaders = db.select().from(s.scouts).all().filter(r => r.role !== 'scout')
  const patrols = db.select().from(s.patrols).all()
    .filter(p => secIds === null || secIds.includes(p.sectionId))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (me.role === 'troop_leader') {
    return {
      isTroopLeader: true,
      leaders: allLeaders.map(r => ({
        id: r.id, firstName: r.firstName, lastName: r.lastName,
        firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn, role: r.role, isChief: !!r.isChief,
        isActive: r.isActive, phone: r.phone, idNumber: r.idNumber,
        scopes: scopes.filter(x => x.scoutId === r.id).map(x => ({ id: x.id, scope: x.scope, sectionId: x.sectionId, patrolId: x.patrolId, rank: x.rank }))
      })),
      scouts: db.select().from(s.scouts).all().filter(r => r.role === 'scout' && r.isActive).map(r => ({
        id: r.id, firstName: r.firstName, lastName: r.lastName, firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn
      })),
      sections: db.select().from(s.sections).all().sort((a, b) => a.sortOrder - b.sortOrder)
        .map(x => ({ id: x.id, nameEl: x.nameEl, nameEn: x.nameEn, slug: x.slug })),
      patrols: patrols.map(p => ({ id: p.id, sectionId: p.sectionId, nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem }))
    }
  }

  // section-scope leader: patrol-leader management only, within their own section(s)
  const patrolLeaderRows = scopes.filter(x => x.scope === 'patrol' && patrols.some(p => p.id === x.patrolId))
  return {
    isTroopLeader: false,
    patrols: patrols.map(p => ({
      id: p.id, sectionId: p.sectionId, nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem,
      leaders: patrolLeaderRows.filter(x => x.patrolId === p.id).map(x => {
        const l = allLeaders.find(r => r.id === x.scoutId)
        return l && { id: l.id, firstName: l.firstName, lastName: l.lastName, firstNameEn: l.firstNameEn, lastNameEn: l.lastNameEn, rank: x.rank }
      }).filter(Boolean)
    })),
    scouts: scopedScouts(me).filter(r => r.isActive).map(r => ({
      id: r.id, firstName: r.firstName, lastName: r.lastName, firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn, patrolId: r.patrolId
    }))
  }
})
