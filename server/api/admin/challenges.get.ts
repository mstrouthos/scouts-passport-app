import { useDb, schema as s } from '../../db'
import { requireLeader, scopedPatrolIds } from '../../utils/guard'
import { now } from '../../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = useDb()
  const pids = scopedPatrolIds(me)
  const t = now()
  const answers = db.select().from(s.challengeAnswers).all()
  const patrols = db.select().from(s.patrols).all()
  return db.select().from(s.challenges).all()
    .filter(c => pids === null || (c.patrolId != null && pids.includes(c.patrolId)))
    .sort((a, b) => (b.unlocksAt || '9999').localeCompare(a.unlocksAt || '9999'))
    .map(c => {
      const ans = answers.filter(a => a.challengeId === c.id)
      const state = !c.isPublished || !c.unlocksAt ? 'draft'
        : c.unlocksAt > t ? 'scheduled'
        : (c.closesAt && c.closesAt <= t) ? 'done' : 'live'
      const p = c.patrolId ? patrols.find(x => x.id === c.patrolId) : null
      return {
        id: c.id, titleEl: c.titleEl, titleEn: c.titleEn, points: c.points,
        unlocksAt: c.unlocksAt, closesAt: c.closesAt, state,
        sector: p ? { nameEl: p.nameEl, nameEn: p.nameEn, emblem: p.emblem } : null,
        answered: ans.length, correct: ans.filter(a => a.isCorrect).length
      }
    })
})
