import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, scopedScouts, idParam } from '../../../../utils/guard'
import { challengeInScope } from '../../../../utils/challengeScope'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  // scope by SECTION: challenges are authored per section, so the previous
  // patrol-based check 403'd a sector leader on their own section's questions
  const c = await challengeInScope(me, id)
  const db = (await useDb())

  const opts = (await db.select().from(s.challengeOptions).where(eq(s.challengeOptions.challengeId, id)))
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const ans = (await db.select().from(s.challengeAnswers).where(eq(s.challengeAnswers.challengeId, id)))
  const mine = (await scopedScouts(me)).filter(r => r.isActive)
  const eligible = c.patrolId ? mine.filter(r => r.patrolId === c.patrolId) : mine
  const answeredIds = new Set(ans.map(a => a.scoutId))
  const patrols = new Map((await db.select().from(s.patrols)).map(p => [p.id, p]))

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
