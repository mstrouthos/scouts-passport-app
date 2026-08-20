import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, scopedScouts, idParam } from '../../../../utils/guard'
import { now } from '../../../../utils/passcode'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const badgeId = idParam(event)
  const body = await readBody<{ scoutIds?: number[], completedOn?: string }>(event)
  const ids = (body?.scoutIds || []).map(Number).filter(Number.isInteger)
  const completedOn = body?.completedOn || now().slice(0, 10)
  if (!ids.length) throw createError({ statusCode: 400, message: 'No scouts selected' })

  const db = (await useDb())
  if (!(await db.select().from(s.achievements).where(eq(s.achievements.id, badgeId)).limit(1))[0])
    throw createError({ statusCode: 404, message: 'Badge not found' })
  const mine = new Set((await scopedScouts(me)).map(r => r.id))
  let awarded = 0
  for (const scoutId of ids) {
    if (!mine.has(scoutId)) throw createError({ statusCode: 403, message: 'Out of your sector' })
    try {
      await db.insert(s.scoutAchievements).values({ scoutId, achievementId: badgeId, completedOn, awardedBy: me.id })
      awarded++
    } catch { /* already has it — skip */ }
  }
  return { awarded }
})
