import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { now } from '../../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = useDb()
  const secIds = scopedSectionIds(me)
  const t = now()
  const answers = db.select().from(s.challengeAnswers).all()
  const sections = new Map(db.select().from(s.sections).all().map(x => [x.id, x]))
  return db.select().from(s.challenges).all()
    .filter(c => secIds === null || c.createdBy === me.id || (c.sectionId != null && secIds.includes(c.sectionId)))
    .sort((a, b) => (b.unlocksAt || '9999').localeCompare(a.unlocksAt || '9999'))
    .map(c => {
      const ans = answers.filter(a => a.challengeId === c.id)
      const state = !c.isPublished || !c.unlocksAt ? 'draft'
        : c.unlocksAt > t ? 'scheduled'
        : (c.closesAt && c.closesAt <= t) ? 'done' : 'live'
      const sec = c.sectionId != null ? sections.get(c.sectionId) : null
      return {
        id: c.id, titleEl: c.titleEl, titleEn: c.titleEn, points: c.points,
        unlocksAt: c.unlocksAt, closesAt: c.closesAt, state, forLeaders: c.forLeaders,
        sectionEl: sec?.nameEl ?? null, sectionEn: sec?.nameEn ?? null,
        answered: ans.length, correct: ans.filter(a => a.isCorrect).length
      }
    })
})
