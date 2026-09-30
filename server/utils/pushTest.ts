/* A test push to a group, and who actually got it. "Sent" only means the
   phone's push service accepted the message; whether the phone then showed it
   is another matter — on Samsung especially — so each phone that receives a
   test says so (the service worker calls /api/push/ack), and the report shows
   both. Kept in memory: a test is looked at for a minute or two, then gone. */
type Device = { subId: number, scoutId: number, label: string, sent: boolean | null, error: string | null, receivedMs: number | null }
type Test = { at: number, people: Array<{ scoutId: number, name: string }>, devices: Device[] }

const tests = new Map<string, Test>()
const HOUR = 3600_000

export function newTest(people: Test['people']): string {
  for (const [id, x] of tests) if (Date.now() - x.at > HOUR) tests.delete(id)
  const id = Math.random().toString(36).slice(2, 10)
  tests.set(id, { at: Date.now(), people, devices: [] })
  return id
}
export const getTest = (id: string) => tests.get(id)

/** A phone said it received the test. */
export function ackTest(id: string, subId: number) {
  const d = tests.get(id)?.devices.find(x => x.subId === subId)
  if (d && d.receivedMs == null) d.receivedMs = Date.now() - tests.get(id)!.at
}

/** A short, human name for the phone behind a subscription, from its user agent. */
export function deviceLabel(ua: string | null): string {
  if (!ua) return 'Συσκευή'
  const browser = /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /CriOS|Chrome/.test(ua) ? 'Chrome'
    : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : ''
  let phone = ''
  if (/iPhone/.test(ua)) phone = 'iPhone'
  else if (/iPad/.test(ua)) phone = 'iPad'
  else {
    const m = ua.match(/Android[^;)]*;\s*([^;)]+?)(?:\sBuild|\)|;)/)
    const model = m?.[1]?.trim()
    phone = model && model !== 'K' ? (/^SM-/.test(model) ? `Samsung ${model}` : model) : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Συσκευή'
  }
  return browser ? `${phone} · ${browser}` : phone
}
