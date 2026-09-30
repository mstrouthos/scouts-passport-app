import { useDb, schema as s } from '../../db'
import { requireTroopLeader } from '../../utils/guard'
import { deliverEach, onSurface } from '../../utils/push'
import { newTest, getTest, deviceLabel } from '../../utils/pushTest'

/** A test notification to every Βαθμοφόρος's phone at once. Nothing lands in
    anyone's in-app bell — it is a check of the phones, not news. The answer is
    a test id; the report (GET .../push-test/:id) fills in as phones confirm. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const db = await useDb()
  const leaders = (await db.select().from(s.scouts))
    .filter(r => r.role !== 'scout' && r.isActive && !r.deletedAt)
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'el'))
  const id = newTest(leaders.map(r => ({ scoutId: r.id, name: `${r.firstName} ${r.lastName}` })))
  const test = getTest(id)!
  const ids = new Set(leaders.map(r => r.id))
  const subs = (await db.select().from(s.pushSubscriptions))
    .filter(x => x.scoutId != null && ids.has(x.scoutId) && onSurface(x, 'scouts'))
  for (const x of subs) test.devices.push({ subId: x.id, scoutId: x.scoutId!, label: deviceLabel(x.userAgent), sent: null, error: null, receivedMs: null })
  await deliverEach(subs, JSON.stringify({
    title: '🔔 Δοκιμή ειδοποιήσεων — πάτησέ με',
    body: `Από ${me.firstName} ${me.lastName}: πάτησε εδώ για να επιβεβαιώσεις ότι την έλαβες.`,
    // opening it confirms too, through the app itself — so even a phone
    // still on the previous service worker is counted
    url: `/?pushAck=${id}`, testId: id
  }), (sub, ok, why) => {
    const d = test.devices.find(x => x.subId === sub.id)
    if (d) { d.sent = ok; d.error = ok ? null : (why || 'failed') }
  })
  // nothing came back at all: push is not set up on the server
  for (const d of test.devices) if (d.sent === null) { d.sent = false; d.error = 'push is not configured on the server (VAPID keys)' }
  return { id }
})
