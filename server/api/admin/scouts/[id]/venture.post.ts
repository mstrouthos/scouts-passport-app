import { and, eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, idParam } from '../../../../utils/guard'
import { assertScoutVisible } from '../../../../utils/requirements'
import { assertCanSign, isVenture } from '../../../../utils/venture'
import { notifyAward } from '../../../../utils/celebrate'
import { now } from '../../../../utils/passcode'

/** Sign a requirement off, record a milestone date, or add a logbook entry.
    Body: { action, … } — the Α.Κ.Α. only. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  await assertScoutVisible(me, id)
  if (!(await isVenture(id)))
    throw createError({ statusCode: 400, message: 'Το Η.Κ.Α.Δ.Ε. αφορά μόνο την Κοινότητα Ανιχνευτών' })
  await assertCanSign(me)

  const b = await readBody<any>(event)
  const db = await useDb()
  const day = (v: any) => {
    const d = String(v || '').slice(0, 10) || now().slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw createError({ statusCode: 400, message: 'Bad date' })
    return d
  }

  if (b?.action === 'milestone') {
    const key = String(b.key || '')
    if (!key) throw createError({ statusCode: 400, message: 'Bad milestone' })
    if (b.clear) {
      await db.delete(s.ventureMilestones)
        .where(and(eq(s.ventureMilestones.scoutId, id), eq(s.ventureMilestones.key, key)))
      return { ok: true }
    }
    const onDate = day(b.onDate)
    const existing = (await db.select().from(s.ventureMilestones)
      .where(and(eq(s.ventureMilestones.scoutId, id), eq(s.ventureMilestones.key, key))).limit(1))[0]
    if (existing) await db.update(s.ventureMilestones).set({ onDate, recordedBy: me.id }).where(eq(s.ventureMilestones.id, existing.id))
    else await db.insert(s.ventureMilestones).values({ scoutId: id, key, onDate, recordedBy: me.id })
    return { ok: true, onDate }
  }

  if (b?.action === 'log') {
    if (b.remove) {
      await db.delete(s.ventureLogs).where(and(eq(s.ventureLogs.id, Number(b.logId)), eq(s.ventureLogs.scoutId, id)))
      return { ok: true }
    }
    const kind = ['activity', 'exploration', 'bigOutdoor'].includes(b.kind) ? b.kind : null
    if (!kind) throw createError({ statusCode: 400, message: 'Bad logbook' })
    await db.insert(s.ventureLogs).values({
      scoutId: id, kind,
      datesEl: String(b.datesEl || '').slice(0, 200),
      formEl: String(b.formEl || '').slice(0, 400),
      placeEl: String(b.placeEl || '').slice(0, 200),
      oeEl: String(b.oeEl || '').slice(0, 200),
      createdAt: now()
    })
    return { ok: true }
  }

  // default: sign a requirement off, or take it back
  const requirementId = Number(b?.requirementId)
  if (!Number.isInteger(requirementId)) throw createError({ statusCode: 400, message: 'Bad requirement' })
  const req = (await db.select().from(s.ventureRequirements)
    .where(eq(s.ventureRequirements.id, requirementId)).limit(1))[0]
  if (!req) throw createError({ statusCode: 404, message: 'Not found' })

  if (b?.done === false) {
    await db.delete(s.ventureAwards)
      .where(and(eq(s.ventureAwards.scoutId, id), eq(s.ventureAwards.requirementId, requirementId)))
    return { ok: true, done: false }
  }

  const completedOn = day(b?.completedOn)
  const chosenEl = b?.chosenEl ? String(b.chosenEl).slice(0, 300) : null
  const noteEl = b?.noteEl ? String(b.noteEl).slice(0, 4000) : null
  const existing = (await db.select().from(s.ventureAwards)
    .where(and(eq(s.ventureAwards.scoutId, id), eq(s.ventureAwards.requirementId, requirementId))).limit(1))[0]
  if (existing) {
    await db.update(s.ventureAwards).set({ completedOn, chosenEl, noteEl, awardedBy: me.id })
      .where(eq(s.ventureAwards.id, existing.id))
  } else {
    await db.insert(s.ventureAwards).values({
      scoutId: id, requirementId, completedOn, chosenEl, noteEl, awardedBy: me.id, createdAt: now()
    })
    // only a new sign-off is worth announcing
    try { await notifyAward(id, 'venture', requirementId, req.areaEl) }
    catch (err) { console.error('[venture] notification failed', err) }
  }
  return { ok: true, done: true, completedOn }
})
