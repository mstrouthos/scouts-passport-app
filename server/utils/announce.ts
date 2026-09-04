import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { sendPushTo, sendPushToParents, sendPushToParentIds } from './push'
import { sendEmails } from './email'
import { sendSms } from './sms'
import { sectionOfWith } from './guard'
import { parentsOfScouts } from './parents'
import { now } from './passcode'

/** Deliver an approved announcement over the channels it was created with:
    in-app/push always, SMS only when the sender asked for it (it costs money).

    Parents are reached through their children, so whoever the message is aimed
    at — a section, the troop, or a named group like the band — their parents
    come along unless the sender turned that off. */
export async function dispatchAnnouncement(a: typeof s.announcements.$inferSelect, approvedBy: number | null) {
  const db = (await useDb())
  const scouts = (await db.select().from(s.scouts)).filter(r => r.isActive)
  const patrols = (await db.select().from(s.patrols))

  let memberIds: number[] = []
  let parentSections: number[] | null = []
  if (a.audience === 'troop') {
    memberIds = scouts.filter(r => r.role === 'scout').map(r => r.id)
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
  // the in-app inbox is always written; push delivery rides along with it
  const pushed = await sendPushTo(memberIds, msg)

  // parents of the scouts this went to — this is what makes "tell the parents
  // of the band" work, without anyone keeping a second list of families
  const toParents = a.toParents === true && a.audience !== 'leaders'
  const parents = toParents ? await parentsOfScouts(memberIds) : []
  const parentPushed = toParents
    ? await sendPushToParentIds(parents.map(p => p.id), msg)
      // parents who never signed in still have a section-wide subscription
      + (parentSections === null || parentSections.length ? await sendPushToParents(parentSections, msg) : 0)
    : 0

  const contacts = (await db.select().from(s.familyContacts))
    .filter(c => a.audience === 'troop' || (a.audience === 'section' && c.sectionId === a.sectionId))
  const addresses = [...new Set([
    ...(toParents ? parents.map(p => p.email).filter(Boolean) as string[] : []),
    ...(toParents ? contacts.map(c => c.email) : [])
  ])]
  const emailed = await sendEmails(addresses, 'Ειδοποίηση — Πύλη Προσκόπων', a.textEl)

  let smsSent = 0
  if (a.viaSms) {
    const numbers = [...new Set([
      ...scouts.filter(r => memberIds.includes(r.id) && r.phone).map(r => r.phone!),
      ...(toParents ? parents.map(p => p.phone).filter(Boolean) as string[] : [])
    ])]
    smsSent = await sendSms(numbers, `Πύλη Προσκόπων: ${a.textEl}`)
  }

  await db.update(s.announcements)
    .set({ status: 'sent', approvedBy, sentAt: now() })
    .where(eq(s.announcements.id, a.id))
  return { recipients: memberIds.length, parents: parents.length, pushed: pushed + parentPushed, emailed, smsSent }
}
