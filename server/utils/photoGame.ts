import { and, eq, inArray, isNull, isNotNull } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { now } from './passcode'
import { tellFun, isQuietHour } from './leaderFun'
import { sendPushTo, type PushTrace } from './push'
import { postGamesLog } from './deliveryLog'
import { deleteStored } from './storage'
import type { SessionScout } from './guard'
import { PHOTO_THINGS, PHOTO_PER_WEEK, PHOTO_HOURS, PHOTO_TRIES, photoThing, type PhotoThing } from '../../utils/photoGame'

/* Φωτογραφικό κυνήγι (utils/photoGame.ts), for every Βαθμοφόρος who plays
   the games (not «εκτός παρέας»). */

/** Whether this person plays the photo game. */
export const canPhoto = (me: SessionScout) => me.role !== 'scout' && me.funPref !== 'off'

/** Those who play: active Βαθμοφόροι, not out of the games. */
export async function photoPlayers() {
  const db = await useDb()
  return (await db.select().from(s.scouts)).filter(r => r.role !== 'scout' && r.isActive && !r.deletedAt && r.funPref !== 'off')
}

/** Each check's cost in the games' Discord channel, with the month's total so far. */
export async function logJudgeCost(who: string, thing: PhotoThing, ok: boolean, use: JudgeUse) {
  const db = await useDb()
  const month = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' }).slice(0, 7), key = `photo.cost.${month}`
  const before = Number((await db.select().from(s.settings).where(eq(s.settings.key, key)))[0]?.value) || 0
  const total = before + (use.usd || 0)
  await db.insert(s.settings).values({ key, value: String(total) }).onConflictDoUpdate({ target: s.settings.key, set: { value: String(total) } })
  const usd = (n: number) => `$${n.toFixed(n < 0.01 ? 5 : 4)}`
  await postGamesLog({
    title: '📸 Φωτογραφικό κυνήγι · έλεγχος', color: ok ? 0x2FA36B : 0xE5484D,
    description: `${who} → ${thing.emoji} ${thing.el}: ${ok ? '✅ σωστό' : '❌ όχι'}`,
    fields: [
      { name: 'Μοντέλο', value: use.model, inline: true },
      { name: 'Tokens', value: `${use.tokensIn} μέσα · ${use.tokensOut} έξω`, inline: true },
      { name: 'Κόστος', value: use.usd == null ? '— (άγνωστη τιμή μοντέλου)' : usd(use.usd), inline: true },
      { name: `Σύνολο ${month}`, value: usd(total), inline: true }
    ]
  })
}

/** Once, when it opened to all: the trial's rounds, photos and news wiped,
    so the table starts from zero. Run by the cron; claimed first, so it runs once. */
export async function photoClearTrial(): Promise<number | null> {
  const db = await useDb()
  const claimed = await db.insert(s.settings).values({ key: 'photo.trial-cleared', value: now() }).onConflictDoNothing().returning()
  if (!claimed.length) return null
  const shots = await db.select().from(s.photoShots)
  const fileIds = shots.map(x => x.fileId).filter((x): x is number => !!x)
  const files = fileIds.length ? await db.select().from(s.files).where(inArray(s.files.id, fileIds)) : []
  await db.delete(s.photoShots)
  const rounds = await db.delete(s.photoRounds).returning()
  for (const f of files) await deleteStored(f.data)
  if (fileIds.length) await db.delete(s.files).where(inArray(s.files.id, fileIds))
  await db.delete(s.notifications).where(inArray(s.notifications.kind, ['photo', 'photo-win']))
  return rounds.length
}

/** Once, when it opened to all: everyone who plays told there is a new game
    — the push opens it on the video that explains it. Not at night: then
    the next morning's cron run says it. Claimed first, so it is said once. */
export async function photoLaunch(trace?: PushTrace[]): Promise<number | null> {
  if (isQuietHour()) return null
  const db = await useDb()
  const claimed = await db.insert(s.settings).values({ key: 'photo.launched', value: now() }).onConflictDoNothing().returning()
  if (!claimed.length) return null
  const to = (await photoPlayers()).map(p => p.id)
  await sendPushTo(to, { title: '🎉 Νέο παιχνίδι: Φωτογραφικό κυνήγι!', kind: 'photo-launch', refId: 1,
    body: '📸 Δύο φορές τη βδομάδα ζητείται μια φωτογραφία — οι 3 πρώτοι κερδίζουν. Πάτα να δεις πώς παίζεται!' }, trace)
  return to.length
}

/* Cyprus time, with one formatter made once */
const CY_HOUR = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Nicosia', hour: '2-digit', hour12: false })
const cyHour = (at: Date) => Number(CY_HOUR.format(at)) % 24
const cyDay = (at: Date) => at.toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })
const dowOf = (day: string) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7          // Monday = 0
const shiftDay = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400_000).toISOString().slice(0, 10)
/** Midnight at the end of a Cyprus day (+03:00 in summer, +02:00 in winter). */
function endOfDay(day: string) {
  const next = shiftDay(day, 1)
  for (const off of ['+03:00', '+02:00']) {
    const t = Date.parse(`${next}T00:00:00${off}`)
    if (cyHour(new Date(t)) === 0) return t
  }
  return Date.parse(`${next}T00:00:00+02:00`)
}

/** The round in play, if one is; one whose day is over is closed first. */
export async function activePhotoRound() {
  const db = await useDb()
  const open = await db.select().from(s.photoRounds).where(isNull(s.photoRounds.endedAt))
  let live: typeof open[number] | null = null
  for (const r of open) {
    if (Date.parse(r.endsAt) <= Date.now()) await closePhotoRound(r.id, r.endsAt)
    else live = r
  }
  return live
}

/** Who has played a round out: a photo in (right, or kept once the places
    were taken), or every try used. */
export async function photoDoneIds(roundId: number) {
  const db = await useDb()
  const shots = await db.select().from(s.photoShots).where(eq(s.photoShots.roundId, roundId))
  const by = new Map<number, typeof shots>()
  for (const x of shots) by.set(x.scoutId, [...(by.get(x.scoutId) || []), x])
  return new Set([...by.entries()].filter(([, xs]) => xs.length >= PHOTO_TRIES || xs.some(x => x.ok || !x.judged)).map(([id]) => id))
}

/** Close a round when everyone who plays has played it out. */
export async function closeIfAllDone(roundId: number) {
  const done = await photoDoneIds(roundId)
  if ((await photoPlayers()).every(p => done.has(p.id))) await closePhotoRound(roundId, now())
}

/** The round ends — once, whoever gets here first — and its places, kept
    hidden till now, are told to everyone who plays. */
export async function closePhotoRound(roundId: number, at: string) {
  const db = await useDb()
  const [r] = await db.update(s.photoRounds).set({ endedAt: at })
    .where(and(eq(s.photoRounds.id, roundId), isNull(s.photoRounds.endedAt))).returning()
  if (!r) return
  const thing = photoThing(r.thing)
  const people = new Map((await db.select().from(s.scouts)).map(p => [p.id, p]))
  const name = (id: number) => { const p = people.get(id); return p ? `${p.firstName} ${p.lastName?.[0] || ''}.` : '—' }
  const winners = await photoWinners(r.id)
  const sent = (await db.select().from(s.photoShots).where(eq(s.photoShots.roundId, r.id))).filter(x => x.fileId).length
  const podium = winners.map(w => `${['🥇', '🥈', '🥉'][w.place! - 1]} ${name(w.scoutId)}`).join(' · ')
  const body = `${thing?.emoji || '📸'} ${thing?.el || ''}: ${winners.length ? podium : 'κανείς δεν το βρήκε αυτή τη φορά'}${sent ? ` — δες τις ${sent} φωτογραφίες` : ''}`
  for (const p of await photoPlayers()) await tellFun(p.id, { title: '📸 Φωτογραφικό κυνήγι · αποτελέσματα', kind: 'photo-result', refId: r.id, body })
}

/** The photos are kept a week, then let go (the places and points stay). */
export async function photoPurge() {
  const db = await useDb()
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString()
  const old = (await db.select().from(s.photoShots).where(isNotNull(s.photoShots.fileId))).filter(x => x.createdAt < weekAgo)
  if (!old.length) return 0
  const ids = old.map(x => x.fileId!)
  for (const f of await db.select().from(s.files).where(inArray(s.files.id, ids))) await deleteStored(f.data)
  await db.update(s.photoShots).set({ fileId: null }).where(inArray(s.photoShots.id, old.map(x => x.id)))
  await db.delete(s.files).where(inArray(s.files.id, ids))
  return old.length
}

/** A new round now: a thing not asked for lately, open until everyone has
    played or the day is over, and everyone who plays told at once. Null if
    one is in play. */
export async function startPhotoRound(byId: number | null) {
  if (await activePhotoRound()) return null
  const db = await useDb()
  const recent = (await db.select().from(s.photoRounds)).sort((a, b) => b.id - a.id).slice(0, 15).map(r => r.thing)
  const pool = PHOTO_THINGS.filter(x => !recent.includes(x.key))
  const thing = (pool.length ? pool : PHOTO_THINGS)[Math.floor(Math.random() * (pool.length || PHOTO_THINGS.length))]!
  const at = new Date()
  const [round] = await db.insert(s.photoRounds).values({
    thing: thing.key, startedAt: now(), endsAt: new Date(endOfDay(cyDay(at))).toISOString(), startedBy: byId
  }).returning()
  for (const p of await photoPlayers()) {
    await tellFun(p.id, { title: '📸 Φωτογραφικό κυνήγι', kind: 'photo', refId: round!.id,
      body: `${thing.emoji} Φωτογράφισε ${thing.el}! Οι 3 πρώτοι παίρνουν 5, 4 και 3 XP — η κατάταξη βγαίνει όταν κλείσει ο γύρος.` }, true)
  }
  return { round: round!, thing }
}

/* Twice a week, Monday to Friday, on different days, at random moments between
   PHOTO_HOURS — drawn the first time the week is looked at, and kept. */
const PLAN_KEY = (monday: string) => `photo.plan.${monday}`
type PhotoPlan = { at: string[], done: string[] }
async function photoPlan(at = new Date()): Promise<{ key: string, plan: PhotoPlan }> {
  const today = cyDay(at), monday = shiftDay(today, -dowOf(today)), key = PLAN_KEY(monday)
  const db = await useDb()
  const raw = (await db.select().from(s.settings).where(eq(s.settings.key, key)))[0]?.value
  if (raw) { try { return { key, plan: JSON.parse(raw) } } catch {} }
  // the days left this week (Monday to Friday), and on each the moments left between the hours
  const STEP = 5 * 60_000
  const days: number[][] = []
  for (let d = dowOf(today); d <= 4; d++) {
    const day = shiftDay(monday, d), slots: number[] = []
    for (let t = Date.parse(`${day}T00:00:00Z`) - 3 * 3600_000; t < endOfDay(day); t += STEP) {
      const h = cyHour(new Date(t))
      if (t > at.getTime() && cyDay(new Date(t)) === day && h >= PHOTO_HOURS[0]! && h < PHOTO_HOURS[1]!) slots.push(t)
    }
    if (slots.length) days.push(slots)
  }
  const chosen = days.sort(() => Math.random() - .5).slice(0, PHOTO_PER_WEEK)
  const plan: PhotoPlan = { at: chosen.map(sl => new Date(sl[Math.floor(Math.random() * sl.length)]!).toISOString()).sort(), done: [] }
  await db.insert(s.settings).values({ key, value: JSON.stringify(plan) }).onConflictDoNothing()
  const kept = (await db.select().from(s.settings).where(eq(s.settings.key, key)))[0]?.value
  try { return { key, plan: kept ? JSON.parse(kept) : plan } } catch { return { key, plan } }
}
/** The week's rounds, each when its moment comes — the only way a round
    starts. Run by the cron. */
export async function photoWeekly(at = new Date()): Promise<string | null> {
  const { key, plan } = await photoPlan(at)
  const due = plan.at.find(x => !plan.done.includes(x) && Date.parse(x) <= at.getTime())
  if (!due) return null
  const db = await useDb()
  // claimed first, so two runs at once start one round
  const next = { ...plan, done: [...plan.done, due] }
  const claimed = await db.update(s.settings).set({ value: JSON.stringify(next) })
    .where(and(eq(s.settings.key, key), eq(s.settings.value, JSON.stringify(plan)))).returning()
  if (!claimed.length) return null
  const started = await startPhotoRound(null)
  return started ? started.thing.key : null
}

/** Places taken so far in a round (1–3). */
export async function photoWinners(roundId: number) {
  const db = await useDb()
  return (await db.select().from(s.photoShots).where(and(eq(s.photoShots.roundId, roundId), isNotNull(s.photoShots.place))))
    .sort((a, b) => a.place! - b.place!)
}

/** The judge: is the thing really in the photo — the thing itself, not a
    picture of it on a screen? Gemini looks (NUXT_GEMINI_API_KEY; the model is
    NUXT_GEMINI_MODEL, gemini-3.5-flash-lite unless set). */
/** What Google charges per million tokens (paid tier), read and written
    (thinking counts as written): https://ai.google.dev/gemini-api/docs/pricing */
const GEMINI_PRICE: Record<string, [number, number]> = {
  'gemini-3.5-flash-lite': [0.30, 2.50],
  'gemini-3.8-flash': [0.75, 3.75]
}
export type JudgeUse = { model: string, tokensIn: number, tokensOut: number, usd: number | null }
export async function judgePhoto(jpeg: Buffer, thing: PhotoThing): Promise<{ ok: boolean, reason: string, use: JudgeUse }> {
  const c = useRuntimeConfig()
  const key = c.geminiApiKey || process.env.NUXT_GEMINI_API_KEY
  if (!key) throw createError({ statusCode: 503, message: 'Ο έλεγχος φωτογραφιών δεν έχει ρυθμιστεί ακόμα' })
  const model = c.geminiModel || 'gemini-3.5-flash-lite'
  const prompt = `You are the judge of a scavenger-hunt photo game. The player was asked to take a photo of ${thing.en}.
Look at the photo and answer:
- found: true only if ${thing.en} is clearly visible in the photo (a reasonable everyday example counts).
- real: false if what is shown is a picture of it on a screen, monitor, phone, or a printed photo, rather than the real thing in front of the camera; otherwise true.
- reason_el: one short, friendly sentence in Greek telling the player what you see — if it is not found, what the photo shows instead.`
  let res: any
  try {
    res = await $fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', timeout: 25_000,
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: {
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: jpeg.toString('base64') } }, { text: prompt }] }],
        generationConfig: {
          temperature: 0, responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties: { found: { type: 'BOOLEAN' }, real: { type: 'BOOLEAN' }, reason_el: { type: 'STRING' } }, required: ['found', 'real', 'reason_el'] }
        }
      }
    })
  } catch (err: any) {
    console.warn('[photo] gemini failed', err?.statusCode || err?.status, err?.data?.error?.message || err?.message)
    throw createError({ statusCode: 502, message: 'Ο κριτής δεν απάντησε — η προσπάθεια δεν μετράει, δοκίμασε ξανά' })
  }
  let v: any = null
  try { v = JSON.parse(res?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || 'null') } catch {}
  if (!v || typeof v.found !== 'boolean') throw createError({ statusCode: 502, message: 'Ο κριτής δεν κατάλαβε τη φωτογραφία — η προσπάθεια δεν μετράει, δοκίμασε ξανά' })
  const u = res?.usageMetadata || {}
  const tokensIn = Number(u.promptTokenCount) || 0
  const tokensOut = (Number(u.candidatesTokenCount) || 0) + (Number(u.thoughtsTokenCount) || 0)
  const price = GEMINI_PRICE[model]
  const use: JudgeUse = { model, tokensIn, tokensOut, usd: price ? (tokensIn * price[0] + tokensOut * price[1]) / 1e6 : null }
  return { ok: v.found && v.real !== false, reason: String(v.reason_el || '').slice(0, 240), use }
}
