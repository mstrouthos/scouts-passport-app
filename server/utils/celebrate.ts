import { sendPushTo } from './push'

/** Tell a scout that something was signed off for them.

   The kind and refId travel with the message so tapping it can open the exact
   badge or requirement — and, once there, play it back as a small ceremony
   rather than dropping them on a list. */
export async function notifyAward(
  scoutId: number,
  kind: 'badge' | 'requirement',
  refId: number,
  titleEl: string
) {
  const body = kind === 'badge'
    ? `🏅 Πήρες το Πτυχίο ${titleEl}! Μπράβο!`
    : `⚜️ Ολοκλήρωσες: ${titleEl}`
  await sendPushTo([scoutId], {
    title: 'Πύλη Προσκόπων', body, kind, refId
  })
}

/** Where a notification of this kind should open. */
export function linkForNotification(kind: string, refId: number | null): string | null {
  if (refId == null) return null
  if (kind === 'badge') return `/app?badge=${refId}`
  if (kind === 'requirement') return `/app/requirements?req=${refId}`
  if (kind === 'challenge') return '/app/challenges'
  return null
}
