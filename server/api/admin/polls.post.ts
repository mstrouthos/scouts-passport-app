import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, rankOf } from '../../utils/guard'
import { now } from '../../utils/passcode'
import { sendPushTo } from '../../utils/push'
import { leadersOfSections } from '../../utils/polls'

/** Put a question to the Βαθμοφόροι of a sector — or of the whole troop, which
    only the Αρχηγός Συστήματος may do. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if ((await rankOf(me)) === 'yparchigos')
    throw createError({ statusCode: 403, message: 'Μόνο ο Αρχηγός μπορεί να δημιουργήσει ψηφοφορία' })

  const b = await readBody<{ questionEl?: string, sectionId?: number | null, options?: string[], isMulti?: boolean, closesAt?: string }>(event)
  const questionEl = String(b?.questionEl || '').trim()
  if (!questionEl) throw createError({ statusCode: 400, message: 'Χρειάζεται ερώτηση' })
  const options = (b?.options || []).map(o => String(o || '').trim()).filter(Boolean)
  if (options.length < 2) throw createError({ statusCode: 400, message: 'Χρειάζονται τουλάχιστον δύο επιλογές' })

  const db = await useDb()
  const secIds = await scopedSectionIds(me)
  let sectionId: number | null = b?.sectionId == null ? null : Number(b.sectionId)
  if (sectionId === null && me.role !== 'troop_leader')
    throw createError({ statusCode: 403, message: 'Μόνο ο Αρχηγός Συστήματος ρωτά όλο το Σύστημα' })
  if (sectionId !== null) {
    if (!(await db.select().from(s.sections)).some(x => x.id === sectionId))
      throw createError({ statusCode: 400, message: 'Bad section' })
    if (secIds !== null && !secIds.includes(sectionId))
      throw createError({ statusCode: 403, message: 'Out of your sector' })
  }

  const [row] = (await db.insert(s.polls).values({
    questionEl, sectionId, isMulti: !!b?.isMulti,
    closesAt: b?.closesAt || null, createdBy: me.id, createdAt: now()
  }).returning())
  await db.insert(s.pollOptions).values(options.map((textEl, idx) => ({ pollId: row.id, textEl, idx })))

  // tell the Βαθμοφόροι it is waiting for them
  let asked = 0
  try {
    const ids = (await leadersOfSections(sectionId)).filter(id => id !== me.id)
    asked = ids.length
    if (ids.length)
      await sendPushTo(ids, { title: 'Πύλη Προσκόπων', body: `🗳️ Νέα ψηφοφορία: ${questionEl}`, kind: 'poll', refId: row.id })
  } catch (err) { console.error('[poll] notification failed', err) }

  return { id: row.id, asked }
})
