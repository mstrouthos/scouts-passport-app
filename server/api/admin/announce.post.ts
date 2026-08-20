import { requireLeader, scopedScouts, scopedPatrolIds } from '../../utils/guard'
import { sendPushTo } from '../../utils/push'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ audience?: string, patrolId?: number, textEl?: string, textEn?: string }>(event)
  const text = String(b?.textEl || '').trim()
  if (!text) throw createError({ statusCode: 400, message: 'Message required' })

  let targets = scopedScouts(me).filter(r => r.isActive)
  const pids = scopedPatrolIds(me)
  if (b?.audience === 'patrol' && b?.patrolId != null) {
    const pid = Number(b.patrolId)
    if (pids !== null && !pids.includes(pid)) throw createError({ statusCode: 403, message: 'Out of your sector' })
    targets = targets.filter(r => r.patrolId === pid)
  }
  const sent = await sendPushTo(targets.map(r => r.id), {
    title: 'Διαβατήριο Προσκόπου',
    body: text, kind: 'announcement', refId: Date.now() % 2147483647
  })
  return { recipients: targets.length, pushed: sent }
})
