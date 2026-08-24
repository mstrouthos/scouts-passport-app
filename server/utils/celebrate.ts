import { sendPushTo } from './push'

/** Tell a scout that something was signed off for them.

   The kind and refId travel with the message so tapping it can open the exact
   badge or requirement — and, once there, play it back as a small ceremony
   rather than dropping them on a list. */
export async function notifyAward(
  scoutId: number,
  kind: 'badge' | 'requirement' | 'venture',
  refId: number,
  titleEl: string
): Promise<number> {
  const body = kind === 'badge'
    ? `🏅 Πήρες το Πτυχίο ${titleEl}! Μπράβο!`
    : `⚜️ Ολοκλήρωσες: ${titleEl}`
  // the count comes back so the leader can see whether it actually reached a
  // device, rather than assuming it did
  return sendPushTo([scoutId], { title: 'Πύλη Προσκόπων', body, kind, refId })
}
