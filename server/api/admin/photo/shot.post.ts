import { and, eq, isNotNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { storeFile } from '../../../utils/storage'
import { canPhoto, activePhotoRound, judgePhoto, logJudgeCost, closeIfAllDone } from '../../../utils/photoGame'
import { photoThing, PHOTO_TRIES, PHOTO_POINTS } from '../../../../utils/photoGame'
import { shortName } from '../../../../utils/shortName'

const MAX = 4 * 1024 * 1024
const busy = new Set<number>()

/** A photo for the round in play, taken with the app's camera. Until the
    three places are taken it is judged, and if the thing is in it the next
    place (5, 4, 3 XP) is theirs; once they are, it is only kept, to show, with
    no judge (nor its cost). Nobody but the sender learns a place until the
    round ends (when everyone has played, or the day is over). Three tries
    each; a try the judge could not answer does not count. Photos are kept a
    week. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (!canPhoto(me)) throw createError({ statusCode: 403, message: 'Δεν παίζεις τα μίνι παιχνίδια 📸' })
  const round = await activePhotoRound()
  if (!round) throw createError({ statusCode: 409, message: 'Δεν υπάρχει πρόκληση τώρα — περίμενε την επόμενη 📸' })
  const thing = photoThing(round.thing)
  if (!thing) throw createError({ statusCode: 409, message: 'Bad round' })
  const db = await useDb()
  const mine = (await db.select().from(s.photoShots).where(eq(s.photoShots.roundId, round.id))).filter(x => x.scoutId === me.id)
  if (mine.some(x => x.ok || !x.judged)) throw createError({ statusCode: 409, message: 'Έστειλες ήδη τη φωτογραφία σου 🎉' })
  if (mine.length >= PHOTO_TRIES) throw createError({ statusCode: 409, message: `Τελείωσαν οι ${PHOTO_TRIES} προσπάθειές σου γι' αυτόν τον γύρο` })
  if (busy.has(me.id)) throw createError({ statusCode: 429, message: 'Ο κριτής κοιτάει ακόμα την προηγούμενη 😄' })
  const b = await readBody<{ dataBase64?: string }>(event)
  const buf = Buffer.from(String(b?.dataBase64 || ''), 'base64')
  if (!buf.length || buf.length > MAX || buf[0] !== 0xFF || buf[1] !== 0xD8) throw createError({ statusCode: 400, message: 'Η φωτογραφία δεν διαβάστηκε — τράβηξέ τη ξανά' })
  const placesTaken = async () => (await db.select().from(s.photoShots).where(and(eq(s.photoShots.roundId, round.id), isNotNull(s.photoShots.place)))).length
  const keep = async (shotId: number) => {
    const name = `photo-${round.id}-${shotId}.jpg`
    const [f] = await db.insert(s.files).values({ name, mime: 'image/jpeg', size: buf.length, data: await storeFile(buf, 'image/jpeg', name, 'photo'), uploadedBy: me.id, createdAt: now() }).returning()
    await db.update(s.photoShots).set({ fileId: f!.id }).where(eq(s.photoShots.id, shotId))
  }
  busy.add(me.id)
  try {
    // the places are taken: the photo is kept to show, unjudged
    if (await placesTaken() >= PHOTO_POINTS.length) {
      const [shot] = await db.insert(s.photoShots).values({ roundId: round.id, scoutId: me.id, createdAt: now(), judged: false }).returning()
      await keep(shot!.id)
      await closeIfAllDone(round.id)
      return { ok: true, kept: true, triesLeft: 0 }
    }
    const verdict = await judgePhoto(buf, thing)
    logJudgeCost(shortName(me), thing, verdict.ok, verdict.use).catch(() => {})
    const [shot] = await db.insert(s.photoShots).values({ roundId: round.id, scoutId: me.id, createdAt: now(), ok: verdict.ok, reason: verdict.reason }).returning()
    const triesLeft = PHOTO_TRIES - mine.length - 1
    if (!verdict.ok) {
      if (!triesLeft) await closeIfAllDone(round.id)
      return { ok: false, reason: verdict.reason, triesLeft }
    }
    // the next place, if one is left (taken once each, even by two at the same moment)
    let place: number | null = null
    for (let k = 0; k < 3 && place == null; k++) {
      const taken = await placesTaken()
      if (taken >= PHOTO_POINTS.length) break
      try {
        await db.update(s.photoShots).set({ place: taken + 1, points: PHOTO_POINTS[taken]! }).where(eq(s.photoShots.id, shot!.id))
        place = taken + 1
      } catch { /* someone took that place this instant: the next one */ }
    }
    await keep(shot!.id)
    await closeIfAllDone(round.id)
    if (place == null) return { ok: true, reason: verdict.reason, kept: true, triesLeft }
    return { ok: true, reason: verdict.reason, place, points: PHOTO_POINTS[place - 1]!, triesLeft }
  } finally { busy.delete(me.id) }
})
