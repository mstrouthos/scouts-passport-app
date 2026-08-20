import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { requireScout, sectionOf } from '../utils/guard'
import { now } from '../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const db = (await useDb())
  const t = now()
  const mySection = await sectionOf(me)

  const rows = (await db.select().from(s.challenges))
    .filter(c => c.isPublished && c.unlocksAt && c.unlocksAt <= t && !c.forLeaders)
    .filter(c => (!c.sectionId && !c.patrolId)
      || (c.patrolId != null ? c.patrolId === me.patrolId : c.sectionId === mySection))
    .sort((a, b) => (b.unlocksAt || '').localeCompare(a.unlocksAt || ''))

  const myAnswers = (await db.select().from(s.challengeAnswers).where(eq(s.challengeAnswers.scoutId, me.id)))
  const ansMap = new Map(myAnswers.map(a => [a.challengeId, a]))

  // all options in one query, grouped by challenge — avoids a query per row
  const allOpts = (await db.select().from(s.challengeOptions)).sort((a, b) => a.sortOrder - b.sortOrder)
  const optsByChallenge = new Map<number, typeof allOpts>()
  for (const o of allOpts) {
    const list = optsByChallenge.get(o.challengeId) || []
    list.push(o); optsByChallenge.set(o.challengeId, list)
  }

  return rows.map(c => {
    const opts = optsByChallenge.get(c.id) || []
    const mine = ansMap.get(c.id)
    const closed = !!(c.closesAt && c.closesAt <= t)
    const revealed = !!mine || closed
    return {
      id: c.id, titleEl: c.titleEl, titleEn: c.titleEn,
      questionEl: c.questionEl, questionEn: c.questionEn,
      imageEmoji: c.imageEmoji, points: c.points,
      closesAt: c.closesAt, closed,
      // never leak the correct option (or the explanation) before answering / closing
      explanationEl: revealed ? c.explanationEl : null,
      explanationEn: revealed ? c.explanationEn : null,
      options: opts.map(o => ({
        id: o.id, textEl: o.textEl, textEn: o.textEn,
        isCorrect: revealed ? o.isCorrect : undefined
      })),
      answer: mine ? { optionId: mine.optionId, isCorrect: mine.isCorrect, points: mine.pointsAwarded } : null
    }
  })
})
