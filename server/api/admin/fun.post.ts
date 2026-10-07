import { and, eq, gt } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { now } from '../../utils/passcode'
import { sendPushTo } from '../../utils/push'
import { funAction, funAllowed } from '../../../utils/fun'
import { FUN_LIMIT_DAY, FUN_PER_TARGET_DAY, FUN_COOLDOWN_MS, FUN_PUSH_GAP_MS, isQuietHour, cyprusDayStart, funPaused } from '../../utils/leaderFun'

/** One Βαθμοφόρος does something to another — a tomato, a high five — and
    the other is told. The guardrails, so it stays a laugh and never a
    nuisance: never to oneself; ten a day, three at any one person; not the
    same thing at the same person twice in a breath; nothing they have opted
    out of (tomatoes, or all of it); a phone buzzes for the first in an hour,
    and never at night — the rest wait in the bell; and the Αρχηγός
    Συστήματος can pause it all. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (await funPaused()) throw createError({ statusCode: 403, message: 'Η παρέα κάνει διάλειμμα' })
  const b = await readBody<{ to?: number, action?: string }>(event)
  const act = funAction(String(b?.action || ''))
  const to = Number(b?.to)
  if (!act || !Number.isInteger(to)) throw createError({ statusCode: 400, message: 'Bad action' })
  if (to === me.id) throw createError({ statusCode: 400, message: 'Όχι στον εαυτό σου 😄' })
  if (me.funPref === 'off') throw createError({ statusCode: 403, message: 'Έχεις βγει από την παρέα (Ρυθμίσεις παρέας)' })
  const db = await useDb()
  const target = (await db.select().from(s.scouts).where(eq(s.scouts.id, to)).limit(1))[0]
  if (!target || target.role === 'scout' || !target.isActive || target.deletedAt) throw createError({ statusCode: 404, message: 'Not found' })
  // a hidden test account plays only with itself
  if (me.isHidden || target.isHidden) throw createError({ statusCode: 403, message: 'Οι δοκιμαστικοί λογαριασμοί δεν παίζουν με πραγματικούς Βαθμοφόρους' })
  if (!funAllowed(target.funPref, act))
    throw createError({ statusCode: 403, message: target.funPref === 'kind' ? `${target.firstName}: μόνο τα καλά 🤗` : `${target.firstName} δεν παίζει τώρα` })
  const today = cyprusDayStart()
  const mine = await db.select().from(s.leaderFun).where(and(eq(s.leaderFun.fromId, me.id), gt(s.leaderFun.createdAt, today)))
  if (mine.length >= FUN_LIMIT_DAY) throw createError({ statusCode: 429, message: 'Αρκετά για σήμερα! Τα πυρομαχικά ξαναγεμίζουν αύριο 🍅' })
  if (mine.filter(r => r.toId === to).length >= FUN_PER_TARGET_DAY) throw createError({ statusCode: 429, message: `Αρκετά στον/στην ${target.firstName} για σήμερα 😄` })
  if (mine.some(r => r.toId === to && r.action === act.key && Date.now() - Date.parse(r.createdAt) < FUN_COOLDOWN_MS))
    throw createError({ statusCode: 429, message: 'Πάρε μια ανάσα πρώτα 😄' })
  const t = now()
  const [row] = await db.insert(s.leaderFun).values({ fromId: me.id, toId: to, action: act.key, createdAt: t }).returning()
  const msg = { title: '🎪 Η παρέα των Βαθμοφόρων', body: act.noteEl.replace('{name}', me.firstName), kind: 'fun', refId: row.id }
  // a buzz for the first in an hour (and never at night); the rest, in the bell
  const lastHour = new Date(Date.now() - FUN_PUSH_GAP_MS).toISOString()
  const recentToThem = (await db.select().from(s.leaderFun).where(and(eq(s.leaderFun.toId, to), gt(s.leaderFun.createdAt, lastHour)))).filter(r => r.id !== row.id)
  if (isQuietHour() || recentToThem.length) await db.insert(s.notifications).values({ scoutId: to, kind: msg.kind, refId: msg.refId, title: msg.title, body: msg.body, createdAt: t })
  else await sendPushTo([to], msg)
  return { ok: true, id: row.id, left: FUN_LIMIT_DAY - mine.length - 1 }
})
