/** Where a notification of each kind should open.

   Kept apart from both push.ts and celebrate.ts: those two already depend on
   each other, and importing this from either would close the cycle. */
export function linkForNotification(kind: string, refId: number | null, who: 'member' | 'parent' = 'member'): string | null {
  if (refId == null) return null
  // a family's notices open on their own page — a form sent to them, the form
  if (who === 'parent') return kind === 'formInvite' || kind === 'formReminder' ? `/f/${refId}` : '/family'
  if (kind === 'badge') return `/app/badges?badge=${refId}`
  if (kind === 'requirement') return `/app/requirements?req=${refId}`
  // the Κοινότητα's booklet is a separate programme with its own numbering
  if (kind === 'venture') return `/app/venture?req=${refId}`
  // the day's question, and the reminder to answer it
  if (kind === 'challenge' || kind === 'challenge_unlocked' || kind === 'streak_reminder') return '/app/challenges'
  // tomorrow's event, opened in the calendar
  if (kind === 'event_reminder') return `/app/calendar?event=${refId}`
  // a notice for families lives on their own page
  if (kind === 'parentPost') return '/family'
  // asking a Βαθμοφόρος whether they are coming opens the event itself
  if (kind === 'poll') return '/admin/polls'
  if (kind === 'infoApproval' || kind === 'infoPublished') return `/admin/infopages?open=${refId}`
  if (kind === 'eventRsvp') return `/admin/events/${refId}`
  // a mission photo: checked (to the member), or waiting to be (to the leaders)
  if (kind === 'mission') return '/app/challenges?tab=missions'
  // a collection item earned with a run of meetings
  if (kind === 'reward') return '/app/avatar?tab=rewards'
  if (kind === 'missionSubmitted') return '/admin/challenges?tab=missions'
  if (kind === 'formApproval' || kind === 'formApproved') return `/admin/forms/${refId}`
  if (kind === 'formResponse') return `/admin/forms/response/${refId}`
  return null
}
