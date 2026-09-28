import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, scopedScouts, idParam } from '../../../../utils/guard'
import { challengeInScope } from '../../../../utils/challengeScope'
import { onSurface } from '../../../../utils/push'

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
  // who would hear a reminder on their phone, and who only in the in-app bell
  const pushOn = new Set((await db.select().from(s.pushSubscriptions))
    .filter(x => x.scoutId != null && onSurface(x, 'scouts')).map(x => x.scoutId))
  const patrolOf = (r: typeof mine[number]) => ({
    push: pushOn.has(r.id),
    patrolEl: r.patrolId ? patrols.get(r.patrolId)?.nameEl : '', patrolEn: r.patrolId ? patrols.get(r.patrolId)?.nameEn : ''
  })

  /* Who answered what — for administrators only. Everyone else sees the
     counts per option, not which scout chose which. */
  let responses: any[] | undefined
  if (me.role === 'troop_leader') {
    const byId = new Map(mine.map(r => [r.id, r]))
    const reveals = new Map((await db.select().from(s.challengeReveals).where(eq(s.challengeReveals.challengeId, id)))
      .map(r => [r.scoutId, r.revealedAt]))
    responses = ans
      .filter(a => byId.has(a.scoutId))
      .sort((a, b) => a.answeredAt.localeCompare(b.answeredAt))
      .map(a => {
        const r = byId.get(a.scoutId)!
        const shown = reveals.get(a.scoutId)
        return {
          id: r.id, firstName: r.firstName, lastName: r.lastName, firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn,
          ...patrolOf(r),
          optionIndex: opts.findIndex(o => o.id === a.optionId),
          isCorrect: a.isCorrect, points: a.pointsAwarded, answeredAt: a.answeredAt,
          // from the options appearing to the answer
          tookMs: shown ? Math.max(0, Date.parse(a.answeredAt) - Date.parse(shown)) : null
        }
      })
  }

  return {
    challenge: { id: c.id, titleEl: c.titleEl, titleEn: c.titleEn, questionEl: c.questionEl, questionEn: c.questionEn, points: c.points },
    options: opts.map(o => ({
      id: o.id, textEl: o.textEl, textEn: o.textEn, isCorrect: o.isCorrect,
      count: ans.filter(a => a.optionId === o.id).length
    })),
    answered: ans.length, eligible: eligible.length, responses,
    missing: eligible.filter(r => !answeredIds.has(r.id)).map(r => ({
      id: r.id, firstName: r.firstName, lastName: r.lastName,
      firstNameEn: r.firstNameEn, lastNameEn: r.lastNameEn, ...patrolOf(r)
    }))
  }
})
