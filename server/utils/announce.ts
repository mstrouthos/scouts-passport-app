import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { sendPushTo, sendPushToParents, sendPushToParentIds, type PushTrace } from './push'
import { sendEmails } from './email'
import { sendSms } from './sms'
import { sectionOfWith } from './guard'
import { parentsOfScouts } from './parents'
import { now } from './passcode'
import { logNote } from './deliveryLog'

/** Deliver an approved announcement over the channels it was created with:
    in-app/push always, SMS only when the sender asked for it (it costs money).

    Parents are reached through their children, so whoever the message is aimed
    at — a section, the troop, or a named group like the band — their parents
    come along unless the sender turned that off. */
export async function dispatchAnnouncement(a: typeof s.announcements.$inferSelect, approvedBy: number | null, trace?: PushTrace[]) {
  const db = (await useDb())
  // a hidden test account hears everything a real one would — that is what it
  // is for — though it is not counted among the people a message reached
  const scouts = (await db.select().from(s.scouts)).filter(r => r.isActive)
  const hidden = new Set(scouts.filter(r => r.isHidden).map(r => r.id))
  const patrols = (await db.select().from(s.patrols))

  let memberIds: number[] = []
  let parentSections: number[] | null = []
  if (a.audience === 'troop') {
    // everyone: the scouts and every Βαθμοφόρος alike
    memberIds = scouts.map(r => r.id)
    parentSections = null // all parent subscriptions
  } else if (a.audience === 'leaders') {
    memberIds = scouts.filter(r => r.role !== 'scout').map(r => r.id)
  } else if (a.audience === 'group' && a.groupId != null) {
    const members = (await db.select().from(s.notifyGroupMembers))
      .filter(m => m.groupId === a.groupId).map(m => m.scoutId)
    const live = new Set(scouts.map(r => r.id))
    memberIds = members.filter(id => live.has(id))
  } else {
    memberIds = scouts.filter(r => r.role === 'scout' && sectionOfWith(r as any, patrols) === a.sectionId).map(r => r.id)
    parentSections = a.sectionId != null ? [a.sectionId] : []
  }

  const msg = { title: 'Πύλη Προσκόπων', body: a.textEl, kind: 'announcement', refId: a.id }
  // the in-app inbox is always written; push delivery rides along with it —
  // and the one who wrote it gets it too, to see it went out and what it says,
  // though they are not counted among those it was for
  // one meant for the parents alone still finds them through these members,
  // but the members themselves are not told
  const parentsOnly = a.parentsOnly === true && a.audience !== 'leaders'
  const told = parentsOnly ? [] : memberIds
  const sender = a.createdBy != null && scouts.some(r => r.id === a.createdBy) ? a.createdBy : null
  const pushed = await sendPushTo(sender != null && !told.includes(sender) ? [...told, sender] : told, msg, trace)

  // parents of the scouts this went to — this is what makes "tell the parents
  // of the band" work, without anyone keeping a second list of families
  const toParents = (a.toParents === true || parentsOnly) && a.audience !== 'leaders'
  // only scouts have parents to tell, even when the message went to everyone
  const parents = toParents
    ? await parentsOfScouts(memberIds.filter(id => scouts.find(r => r.id === id)?.role === 'scout'))
    : []
  const parentPushed = toParents
    ? await sendPushToParentIds(parents.map(p => p.id), msg)
      // parents who never signed in still have a section-wide subscription
      + (parentSections === null || parentSections.length ? await sendPushToParents(parentSections, msg) : 0)
    : 0

  // parents are reached through their children — there is no second list
  const addresses = [...new Set(toParents ? parents.map(p => p.email).filter(Boolean) as string[] : [])]
  const emailed = await sendEmails(addresses, 'Ειδοποίηση — Πύλη Προσκόπων', a.textEl)

  let smsSent = 0
  if (a.viaSms) {
    const numbers = [...new Set([
      ...scouts.filter(r => told.includes(r.id) && r.phone).map(r => r.phone!),
      ...(toParents ? parents.map(p => p.phone).filter(Boolean) as string[] : [])
    ])]
    smsSent = await sendSms(numbers, `Πύλη Προσκόπων: ${a.textEl}`)
  }

  // for the delivery report: who sent it, to whom, and the other channels
  const author = scouts.find(r => r.id === a.createdBy)
  const audience = a.audience === 'troop' ? 'Όλο το Σύστημα' : a.audience === 'leaders' ? 'Βαθμοφόροι'
    : a.audience === 'group' ? 'Ομάδα ειδοποιήσεων' : (await db.select().from(s.sections)).find(x => x.id === a.sectionId)?.nameEl || 'Τομέας'
  logNote(msg, `Από: ${author ? `${author.firstName} ${author.lastName}` : '—'} · Προς: ${parentsOnly ? `μόνο γονείς — ${audience}` : `${audience}${toParents ? ' + γονείς' : ''}`}`)
  if (a.viaSms) logNote(msg, `SMS: ${smsSent}`)
  if (addresses.length) logNote(msg, `Email: ${emailed} από ${addresses.length}`)

  await db.update(s.announcements)
    .set({ status: 'sent', approvedBy, sentAt: now() })
    .where(eq(s.announcements.id, a.id))
  return { recipients: told.filter(id => !hidden.has(id)).length, parents: parents.length, pushed: pushed + parentPushed, emailed, smsSent }
}
