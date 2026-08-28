import { rankOf, type SessionScout } from './guard'

/** What a Υπαρχηγός may do.

   A Υπαρχηγός assists; they do not administer. Everything that adds, edits or
   removes is closed to them, and the exceptions are listed here rather than
   scattered across endpoints, so a new endpoint is locked by default instead
   of being open until someone remembers to guard it:

   - drafting announcements, which the Αρχηγός must approve before they send
   - recording attendance and uniform, and the points that follow from them
   - writing challenge questions for their own sector
   - enrolling a new member into their own sector (but not renaming, moving or
     removing one afterwards, which stays with the Αρχηγός)

   Reading is governed separately, by sector scope. */
const YPARCHIGOS_MAY = new Set([
  'announcement.draft',
  'attendance.record',
  'points.award',
  'challenge.write',
  'roster.addMember'
])

export type Capability =
  | 'announcement.draft' | 'attendance.record' | 'points.award' | 'challenge.write'
  | 'roster.addMember'
  | 'roster.edit' | 'roster.viewDetails' | 'parents.view' | 'events.edit'
  | 'settings.edit' | 'requirements.award' | 'info.edit' | 'badges.award'

export async function can(me: SessionScout, cap: Capability): Promise<boolean> {
  const rank = await rankOf(me)
  if (rank !== 'yparchigos') return true
  return YPARCHIGOS_MAY.has(cap)
}

/** Throw 403 unless the leader holds the capability. */
export async function assertCan(me: SessionScout, cap: Capability) {
  if (!(await can(me, cap)))
    throw createError({ statusCode: 403, message: 'Δεν έχεις δικαίωμα για αυτή την ενέργεια' })
}
