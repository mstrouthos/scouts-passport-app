import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { sendPushTo, sendPushToParents } from './push'
import { sendEmails } from './email'
import { sectionOf } from './guard'
import { now } from './passcode'

/** Deliver an approved announcement: member push + parent push + parent emails. */
export async function dispatchAnnouncement(a: typeof s.announcements.$inferSelect, approvedBy: number | null) {
  const db = useDb()
  const scouts = db.select().from(s.scouts).all().filter(r => r.isActive)
  const patrols = db.select().from(s.patrols).all()

  let memberIds: number[] = []
  let parentSections: number[] | null = null
  if (a.audience === 'troop') {
    memberIds = scouts.filter(r => r.role === 'scout').map(r => r.id)
    parentSections = null // all parent subscriptions
  } else if (a.audience === 'leaders') {
    memberIds = scouts.filter(r => r.role !== 'scout').map(r => r.id)
    parentSections = []
  } else {
    memberIds = scouts.filter(r => r.role === 'scout' && sectionOf(r as any, patrols) === a.sectionId).map(r => r.id)
    parentSections = a.sectionId != null ? [a.sectionId] : []
  }

  const msg = { title: 'Διαβατήριο Προσκόπου', body: a.textEl, kind: 'announcement', refId: a.id }
  const pushed = await sendPushTo(memberIds, msg)
  const parentPushed = parentSections === null || parentSections.length
    ? await sendPushToParents(parentSections, msg) : 0

  const contacts = db.select().from(s.familyContacts).all()
    .filter(c => a.audience === 'troop' || (a.audience === 'section' && c.sectionId === a.sectionId))
  const emailed = await sendEmails(contacts.map(c => c.email), 'Ανακοίνωση — Διαβατήριο Προσκόπου', a.textEl)

  db.update(s.announcements)
    .set({ status: 'sent', approvedBy, sentAt: now() })
    .where(eq(s.announcements.id, a.id)).run()
  return { recipients: memberIds.length, pushed: pushed + parentPushed, emailed }
}
