import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, scopedPatrolIds, scopedScouts, idParam } from '../../../../utils/guard'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const db = useDb()
  const c = db.select().from(s.challenges).where(eq(s.challenges.id, id)).get()
  if (!c) throw createError({ statusCode: 404, message: 'Not found' })
  const pids = scopedPatrolIds(me)
  if (pids !== null && !(c.patrolId != null && pids.includes(c.patrolId)))
    throw createError({ statusCode: 403, message: 'Out of your sector' })

  const opts = db.select().from(s.challengeOptions).where(eq(s.challengeOptions.challengeId, id)).all()
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const ans = db.select().from(s.challengeAnswers).where(eq(s.challengeAnswers.challengeId, id)).all()
  const mine = scopedScouts(me).filter(r => r.isActive)
  const eligible = c.patrolId ? mine.filter(r => r.patrolId === c.patrolId) : mine
  const answeredIds = new Set(ans.map(a => a.scoutId))
  const patrols = new Map(db.select().from(s.patrols).all().map(p => [p.id, p]))

  return {
    challenge: { id: c.id, titleEl: c.titleEl, titleEn: c.titleEn, questionEl: c.questionEl, questionEn: c.questionEn, points: c.points },
    options: opts.map(o => ({
      id: o.id, textEl: o.textEl, textEn: o.textEn, isCorrect: o.isCorrect,
      count: ans.filter(a => a.optionId === o.id).length
    })),
    answered: ans.length, eligible: eligible.length,
    missing: eligible.filter(r => !answeredIds.has(r.id)).map(r => ({
      id: r.id, firstName: r.firstName, lastName: r.lastName,
      firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn,
      patrolEl: r.patrolId ? patrols.get(r.patrolId)?.nameEl : '', patrolEn: r.patrolId ? patrols.get(r.patrolId)?.nameEn : ''
    }))
  }
})
