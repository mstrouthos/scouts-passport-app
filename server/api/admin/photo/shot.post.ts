import { and, eq, isNotNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { storeFile } from '../../../utils/storage'
import { tellFun } from '../../../utils/leaderFun'
import { canPhoto, activePhotoRound, judgePhoto, photoPlayers } from '../../../utils/photoGame'
import { photoThing, PHOTO_TRIES, PHOTO_POINTS } from '../../../../utils/photoGame'
import { shortName } from '../../../../utils/shortName'

const MAX = 4 * 1024 * 1024
const busy = new Set<number>()

/** A photo for the round in play, taken with the app's camera: judged, and if
    the thing is in it, the next of the three places (5, 4, 3 XP) is theirs,
    the photo kept and everyone told. Three tries each; a try the judge could
    not answer does not count. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (!canPhoto(me)) throw createError({ statusCode: 403, message: 'Το παιχνίδι φωτογραφίας έρχεται σύντομα 📸' })
  const round = await activePhotoRound()
  if (!round) throw createError({ statusCode: 409, message: 'Δεν υπάρχει πρόκληση τώρα — περίμενε την επόμενη 📸' })
  const thing = photoThing(round.thing)
  if (!thing) throw createError({ statusCode: 409, message: 'Bad round' })
  const db = await useDb()
  const mine = (await db.select().from(s.photoShots).where(eq(s.photoShots.roundId, round.id))).filter(x => x.scoutId === me.id)
  if (mine.some(x => x.place)) throw createError({ statusCode: 409, message: 'Το βρήκες ήδη! 🎉' })
  if (mine.length >= PHOTO_TRIES) throw createError({ statusCode: 409, message: `Τελείωσαν οι ${PHOTO_TRIES} προσπάθειές σου γι' αυτόν τον γύρο` })
  if (busy.has(me.id)) throw createError({ statusCode: 429, message: 'Ο κριτής κοιτάει ακόμα την προηγούμενη 😄' })
  const b = await readBody<{ dataBase64?: string }>(event)
  const buf = Buffer.from(String(b?.dataBase64 || ''), 'base64')
  if (!buf.length || buf.length > MAX || buf[0] !== 0xFF || buf[1] !== 0xD8) throw createError({ statusCode: 400, message: 'Η φωτογραφία δεν διαβάστηκε — τράβηξέ τη ξανά' })
  busy.add(me.id)
  try {
    const verdict = await judgePhoto(buf, thing)
    const [shot] = await db.insert(s.photoShots).values({ roundId: round.id, scoutId: me.id, createdAt: now(), ok: verdict.ok, reason: verdict.reason }).returning()
    const triesLeft = PHOTO_TRIES - mine.length - 1
    if (!verdict.ok) return { ok: false, reason: verdict.reason, triesLeft }
    // the next place, if one is left (taken once each, even by two at the same moment)
    let place: number | null = null
    for (let k = 0; k < 3 && place == null; k++) {
      const taken = (await db.select().from(s.photoShots).where(and(eq(s.photoShots.roundId, round.id), isNotNull(s.photoShots.place)))).length
      if (taken >= PHOTO_POINTS.length) break
      try {
        await db.update(s.photoShots).set({ place: taken + 1, points: PHOTO_POINTS[taken]! }).where(eq(s.photoShots.id, shot!.id))
        place = taken + 1
      } catch { /* someone took that place this instant: the next one */ }
    }
    if (place == null) return { ok: true, reason: verdict.reason, late: true, triesLeft }
    const points = PHOTO_POINTS[place - 1]!
    // the winning photo is kept, to show
    const [f] = await db.insert(s.files).values({ name: `photo-${round.id}-${place}.jpg`, mime: 'image/jpeg', size: buf.length, data: await storeFile(buf, 'image/jpeg', `photo-${round.id}-${place}.jpg`, 'photo'), uploadedBy: me.id, createdAt: now() }).returning()
    await db.update(s.photoShots).set({ fileId: f!.id }).where(eq(s.photoShots.id, shot!.id))
    if (place >= PHOTO_POINTS.length) await db.update(s.photoRounds).set({ endedAt: now() }).where(eq(s.photoRounds.id, round.id))
    const left = PHOTO_POINTS.length - place
    for (const p of (await photoPlayers()).filter(x => x.id !== me.id)) {
      await tellFun(p.id, { title: '📸 Φωτογραφικό κυνήγι', kind: 'photo-win', refId: shot!.id,
        body: `${thing.emoji} ${shortName(me)} φωτογράφισε ${thing.el}! ${place}η θέση · +${points} XP${left ? ` — μένουν ${left} θέσεις` : ' — ο γύρος έκλεισε'}` })
    }
    return { ok: true, reason: verdict.reason, place, points, triesLeft }
  } finally { busy.delete(me.id) }
})
