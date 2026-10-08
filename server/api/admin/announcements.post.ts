import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds, rankOf } from '../../utils/guard'
import { dispatchAnnouncement } from '../../utils/announce'
import { now } from '../../utils/passcode'
import { legacyColumns, onlyLeaders, groupTargets, sectionTargets } from '../../utils/announceTargets'
import { sendableGroupIds } from '../../utils/groupScope'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{
    targets?: string[], audience?: string, sectionId?: number, groupId?: number,
    textEl?: string, textEn?: string,
    viaSms?: boolean, toParents?: boolean, parentsOnly?: boolean, scheduledAt?: string, repeat?: string
  }>(event)
  const text = String(b?.textEl || '').trim()
  if (!text) throw createError({ statusCode: 400, message: 'Message required' })

  const secs = await scopedSectionIds(me)
  const rank = await rankOf(me)
  const db = (await useDb())
  const groups = await db.select().from(s.notifyGroups)
  const sectionIds = new Set((await db.select().from(s.sections)).map(x => x.id))
  // any number of targets at once; a request in the old one-target shape
  // still reads as one
  let targets: string[] = Array.isArray(b?.targets) ? [...new Set(b!.targets.map(String))]
    : b?.audience === 'troop' || b?.audience === 'leaders' ? [b.audience]
    : b?.audience === 'group' ? [`g:${Number(b.groupId)}`]
    : b?.sectionId != null ? [`s:${Number(b.sectionId)}`] : []
  targets = targets.filter(x => x === 'troop' || x === 'leaders' ||
    (x.startsWith('s:') && sectionIds.has(Number(x.slice(2)))) ||
    (x.startsWith('g:') && groups.some(g => g.id === Number(x.slice(2)))))
  // the whole system already holds everyone else
  if (targets.includes('troop')) targets = ['troop']

  if (rank !== 'admin') {
    // a sector leader reaches only their own sections, and the groups in them
    if (targets.includes('troop') || targets.includes('leaders'))
      throw createError({ statusCode: 403, message: 'Only an administrator can send to everyone or to the Βαθμοφόροι' })
    if (sectionTargets(targets).some(id => !secs?.includes(id)))
      throw createError({ statusCode: 403, message: 'Μπορείτε να στείλετε μόνο στους τομείς σας' })
    // a group: one they run, one of their sectors, or one wholly inside them
    const sendable = await sendableGroupIds(me)
    if (sendable && groupTargets(targets).some(id => !sendable.includes(id)))
      throw createError({ statusCode: 403, message: 'Σε αυτή την ομάδα μπορεί να στείλει μόνο όποιος την τρέχει ή ο διαχειριστής' })
  }
  if (!targets.length) throw createError({ statusCode: 400, message: 'Choose who it is for' })
  const { audience, sectionId, groupId } = legacyColumns(targets, groups)

  // send now, or hold until a chosen time (the cron tick delivers it)
  let scheduledAt: string | null = null
  if (b?.scheduledAt) {
    const when = new Date(String(b.scheduledAt))
    if (Number.isNaN(when.getTime()))
      throw createError({ statusCode: 400, message: 'scheduledAt is not a valid date' })
    if (when.getTime() > Date.now() + 60_000) scheduledAt = when.toISOString()
  }
  // a repeat only means something with a schedule to repeat from
  const repeat = scheduledAt && ['daily', 'weekly', 'monthly', 'yearly'].includes(String(b?.repeat)) ? String(b!.repeat) as any : null
  {
  }
  const viaSms = !!b?.viaSms
  // opt-in: an announcement reaches parents only when the sender asked
  // or the parents alone, without the members themselves — never for the
  // Βαθμοφόροι, who have no parents in the app
  const parentsOnly = b?.parentsOnly === true && !onlyLeaders(targets)
  const toParents = (b?.toParents === true || parentsOnly) && !onlyLeaders(targets)

  const canSendWithoutApproval = rank === 'admin' || rank === 'archigos'
  const [row] = (await db.insert(s.announcements).values({
    audience, sectionId, groupId, targets: JSON.stringify(targets), textEl: text, textEn: b?.textEn || null, repeat,
    viaPush: true, viaSms, toParents, parentsOnly, scheduledAt,
    // scheduled only counts once it is allowed to go out unattended
    status: canSendWithoutApproval && scheduledAt ? 'scheduled' : 'pending',
    createdBy: me.id, createdAt: now()
  }).returning())

  if (canSendWithoutApproval && scheduledAt) return { id: row.id, status: 'scheduled', scheduledAt }
  // Αρχηγός and admin send immediately; Υπαρχηγός waits for approval
  if (canSendWithoutApproval) {
    const result = await dispatchAnnouncement(row, me.id)
    return { id: row.id, status: 'sent', ...result }
  }
  return { id: row.id, status: 'pending' }
})
