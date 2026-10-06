import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, idParam } from '../../../../utils/guard'
import { now } from '../../../../utils/passcode'
import { canManage } from '../../../../utils/missions'
import { sendPushTo } from '../../../../utils/push'
import { noteError } from '../../../../utils/errorReport'

/** A Βαθμοφόρος checks a photo: approved, and the mission's points are
    given; or not, with a word on why, and the member may send another. The
    member is told either way. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const sub = (await db.select().from(s.missionSubmissions).where(eq(s.missionSubmissions.id, idParam(event))).limit(1))[0]
  if (!sub) throw createError({ statusCode: 404, message: 'Δεν βρέθηκε' })
  const m = (await db.select().from(s.missions).where(eq(s.missions.id, sub.missionId)).limit(1))[0]
  if (!m || !(await canManage(me, m))) throw createError({ statusCode: 403, message: 'Δεν είναι στον τομέα σας' })
  if (sub.status !== 'pending') throw createError({ statusCode: 400, message: 'Έχει ήδη ελεγχθεί' })
  const b = await readBody<{ approve?: boolean, note?: string }>(event)
  const note = String(b?.note || '').trim().slice(0, 500) || null
  const t = now()
  if (b?.approve) {
    const [award] = await db.insert(s.pointAwards).values({
      scoutId: sub.scoutId, kind: 'mission', points: m.points, reasonEl: `${m.emoji} ${m.titleEl}`, awardedBy: me.id, awardedAt: t
    }).returning({ id: s.pointAwards.id })
    await db.update(s.missionSubmissions).set({ status: 'approved', reviewNote: note, reviewedBy: me.id, reviewedAt: t, awardId: award.id })
      .where(eq(s.missionSubmissions.id, sub.id))
  } else {
    if (!note) throw createError({ statusCode: 400, message: 'Γράψτε γιατί δεν εγκρίθηκε' })
    await db.update(s.missionSubmissions).set({ status: 'rejected', reviewNote: note, reviewedBy: me.id, reviewedAt: t })
      .where(eq(s.missionSubmissions.id, sub.id))
  }
  try {
    await sendPushTo([sub.scoutId], b?.approve
      ? { title: `📸 Εγκρίθηκε! +${m.points} πόντοι`, body: m.titleEl, kind: 'mission', refId: sub.fileId }
      : { title: '📸 Δοκίμασε ξανά', body: `${m.titleEl} · ${note}`, kind: 'mission', refId: sub.fileId })
  } catch (e) { noteError('Αποστολές — ειδοποίηση μέλους', e, { submission: sub.id }) }
  return { ok: true }
})
