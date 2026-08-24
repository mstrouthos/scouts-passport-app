/** Where a notification of each kind should open.

   Kept apart from both push.ts and celebrate.ts: those two already depend on
   each other, and importing this from either would close the cycle. */
export function linkForNotification(kind: string, refId: number | null): string | null {
  if (refId == null) return null
  if (kind === 'badge') return `/app/badges?badge=${refId}`
  if (kind === 'requirement') return `/app/requirements?req=${refId}`
  // the Κοινότητα's booklet is a separate programme with its own numbering
  if (kind === 'venture') return `/app/venture?req=${refId}`
  if (kind === 'challenge') return '/app/challenges'
  return null
}
