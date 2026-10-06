import { idParam } from '../../../../utils/guard'
import { formForLeader, formSections, isAccepting, logAccess } from '../../../../utils/forms'
import { sendPushToParents, sendPushToParentIds } from '../../../../utils/push'
import { parentsOfScouts } from '../../../../utils/parents'
import { sectionOfWith } from '../../../../utils/guard'
import { useDb, schema as s } from '../../../../db'

/** A form sent to families in the app: the parents of the sectors chosen
    (only the leader's own) get a notification that opens it. Only an open
    form can be sent. */
export default defineEventHandler(async (event) => {
  const { me, f } = await formForLeader(event, idParam(event))
  if (!isAccepting(f)) throw createError({ statusCode: 400, message: 'Ανοίξτε πρώτα τη φόρμα' })
  const b = await readBody<{ sectionIds?: number[] }>(event)
  const secs = await formSections(me)
  const chosen = [...new Set((Array.isArray(b?.sectionIds) ? b!.sectionIds : []).map(Number).filter(Number.isInteger))]
    .filter(id => secs === null || secs.includes(id))
  if (!chosen.length) throw createError({ statusCode: 400, message: 'Διαλέξτε τομέα' })
  const msg = { title: `📋 ${f.titleEl}`, body: 'Πατήστε για να συμπληρώσετε τη φόρμα.', kind: 'formInvite', refId: f.id }
  // parents are reached through their children in those sectors — in the
  // app's bell and on their phones — and, where they never signed in, through
  // the sector-wide subscription their phone holds
  const db = await useDb()
  const patrols = await db.select().from(s.patrols)
  const kids = (await db.select().from(s.scouts)).filter(r => r.role === 'scout' && r.isActive && chosen.includes(sectionOfWith(r, patrols) as number))
  const parents = await parentsOfScouts(kids.map(r => r.id))
  const devices = await sendPushToParentIds(parents.map(p => p.id), msg) + await sendPushToParents(chosen, msg)
  await logAccess(f.id, me.id, `notify-parents:${chosen.join(',')}`)
  return { ok: true, parents: parents.length, devices }
})
