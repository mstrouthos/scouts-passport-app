import { and, eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireScout, idParam } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { storeFile, deleteStored } from '../../../utils/storage'
import { isOpenFor, isFor, memberSection, missionById, checkCameraTicket } from '../../../utils/missions'
import { leadersOfSections } from '../../../utils/polls'
import { sendPushTo } from '../../../utils/push'
import { noteError } from '../../../utils/errorReport'

/** A member sends their photo for a mission — or a new one, while the first
    is still waiting or after it was not approved. Only a photo taken with the
    app's camera for this mission, minutes ago, is taken: it carries the
    ticket the camera was opened with. The sector's Βαθμοφόροι are told. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  if (me.role !== 'scout') throw createError({ statusCode: 403, message: 'Μόνο για μέλη' })
  const m = await missionById(idParam(event))
  const t = now()
  if (!isFor(m, await memberSection(me))) throw createError({ statusCode: 404, message: 'Η αποστολή δεν βρέθηκε' })
  if (!isOpenFor(m, t, me)) throw createError({ statusCode: 400, message: 'Η αποστολή έχει κλείσει' })

  const b = await readBody<{ mime?: string, dataBase64?: string, note?: string, ticket?: string }>(event)
  if (!checkCameraTicket(b?.ticket, me.id, m.id)) throw createError({ statusCode: 400, message: 'Η φωτογραφία πρέπει να τραβηχτεί με την κάμερα της εφαρμογής' })
  if (b?.mime !== 'image/jpeg') throw createError({ statusCode: 400, message: 'Μόνο φωτογραφία' })
  const buf = Buffer.from(String(b?.dataBase64 || ''), 'base64')
  if (!buf.length || buf[0] !== 0xFF || buf[1] !== 0xD8) throw createError({ statusCode: 400, message: 'Μη έγκυρη φωτογραφία' })
  if (buf.length > 4 * 1024 * 1024) throw createError({ statusCode: 400, message: 'Η φωτογραφία είναι πολύ μεγάλη' })
  const note = String(b?.note || '').trim().slice(0, 500) || null

  const db = await useDb()
  const prev = (await db.select().from(s.missionSubmissions)
    .where(and(eq(s.missionSubmissions.missionId, m.id), eq(s.missionSubmissions.scoutId, me.id))).limit(1))[0]
  if (prev?.status === 'approved') throw createError({ statusCode: 400, message: 'Έχει ήδη εγκριθεί' })

  const name = `mission-${m.id}-${me.id}.jpg`
  const [f] = await db.insert(s.files).values({
    name, mime: 'image/jpeg', size: buf.length, data: await storeFile(buf, 'image/jpeg', name, 'missions'), uploadedBy: me.id, createdAt: t
  }).returning()
  if (prev) {
    await db.update(s.missionSubmissions).set({ fileId: f.id, note, status: 'pending', reviewNote: null, reviewedBy: null, reviewedAt: null, createdAt: t })
      .where(eq(s.missionSubmissions.id, prev.id))
    // the photo it replaces goes, from the bucket too
    const old = (await db.select().from(s.files).where(eq(s.files.id, prev.fileId)).limit(1))[0]
    if (old) { await deleteStored(old.data).catch(() => {}); await db.delete(s.files).where(eq(s.files.id, old.id)) }
  } else {
    await db.insert(s.missionSubmissions).values({ missionId: m.id, scoutId: me.id, fileId: f.id, note, createdAt: t })
  }

  // the sector's Βαθμοφόροι hear of it — once per photo
  try {
    const section = await memberSection(me)
    await sendPushTo(await leadersOfSections(m.sectionId ?? section), {
      title: '📸 Νέα φωτογραφία για έλεγχο',
      body: `${me.firstName} ${me.lastName} · ${m.titleEl}`, kind: 'missionSubmitted', refId: f.id
    })
  } catch (e) { noteError('Αποστολές — ειδοποίηση Βαθμοφόρων', e, { mission: m.id }) }
  return { ok: true }
})
