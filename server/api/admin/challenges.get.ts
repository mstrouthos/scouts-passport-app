import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { now, isAfter, isAtOrBefore } from '../../utils/passcode'
import { canRunQuiz } from '../../utils/quizSector'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  // the quiz is the Ομάδα's; a leader of another sector has no business here
  if (!(await canRunQuiz(me))) return []
  const db = (await useDb())
  const secIds = await scopedSectionIds(me)
  const t = now()
  const answers = (await db.select().from(s.challengeAnswers))
  const sections = new Map((await db.select().from(s.sections)).map(x => [x.id, x]))
  return (await db.select().from(s.challenges))
    .filter(c => secIds === null || c.createdBy === me.id || (c.sectionId != null && secIds.includes(c.sectionId)))
    .sort((a, b) => (b.unlocksAt || '9999').localeCompare(a.unlocksAt || '9999'))
    .map(c => {
      const ans = answers.filter(a => a.challengeId === c.id)
      const state = !c.isPublished || !c.unlocksAt ? 'draft'
        : isAfter(c.unlocksAt, t) ? 'scheduled'
        : isAtOrBefore(c.closesAt, t) ? 'done' : 'live'
      const sec = c.sectionId != null ? sections.get(c.sectionId) : null
      return {
        id: c.id, titleEl: c.titleEl, titleEn: c.titleEn, points: c.points,
        unlocksAt: c.unlocksAt, closesAt: c.closesAt, state, forLeaders: c.forLeaders, isBonus: c.isBonus,
        sectionEl: sec?.nameEl ?? null, sectionEn: sec?.nameEn ?? null,
        answered: ans.length, correct: ans.filter(a => a.isCorrect).length
      }
    })
})
