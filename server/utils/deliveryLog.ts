import { useDb, schema as s } from '../db'
import { isGameKind } from '../../utils/games'

/* A report to Discord of what each notification actually reached — set
   NUXT_DISCORD_WEBHOOK_URL to a channel's webhook; without it, nothing is
   sent. One Discord message per notification: the members it went to, by
   name — delivered to their phone, failed (and why), or with no phone signed
   up (in the app's bell only) — and the same for parents, with whatever else
   the sender adds (who sent it, to whom, SMS, email). The parts of one send
   arrive separately, so they are gathered for a moment, then posted once.
   The mini-games' notifications (and their bundled pushes) go to a channel
   of their own, NUXT_DISCORD_GAMES_WEBHOOK_URL, so they do not bury the rest;
   until it is set they stay with everything else. */

type Outcome = { id: number, outcome: 'delivered' | 'failed' | 'no-device' | 'muted', errors: string[] }
type Entry = {
  msg: { title: string, body: string, kind: string }
  members: Outcome[], parents: Outcome[], anonymous: { sent: number, devices: number }
  notes: string[], timer: any
}
const pending = new Map<string, Entry>()
const keyOf = (kind: string, refId: number) => `${kind}:${refId}`

function entry(msg: { title: string, body: string, kind: string, refId: number }): Entry {
  const k = keyOf(msg.kind, msg.refId)
  let e = pending.get(k)
  if (!e) {
    e = { msg, members: [], parents: [], anonymous: { sent: 0, devices: 0 }, notes: [], timer: null }
    pending.set(k, e)
  }
  clearTimeout(e.timer)
  e.timer = setTimeout(() => { pending.delete(k); post(e!).catch(err => console.warn('[discord] report failed', err?.message)) }, 2500)
  return e
}
export const logMembers = (msg: any, outcomes: Outcome[]) => { if (enabled(msg.kind)) entry(msg).members.push(...outcomes) }
export const logParents = (msg: any, outcomes: Outcome[]) => { if (enabled(msg.kind)) entry(msg).parents.push(...outcomes) }
export const logAnonymousParents = (msg: any, sent: number, devices: number) => {
  if (!enabled(msg.kind)) return
  const e = entry(msg); e.anonymous.sent += sent; e.anonymous.devices += devices
}
export const logNote = (msg: any, line: string) => { if (enabled(msg.kind)) entry(msg).notes.push(line) }
/** The games' own (a mini-game's news, or a bundle of it), or everything else. */
const isGame = (kind: string) => isGameKind(kind) || kind === 'game-digest'
function webhookFor(kind: string): string {
  const c = useRuntimeConfig()
  return (isGame(kind) && c.discordGamesWebhookUrl) || c.discordWebhookUrl || ''
}
const enabled = (kind: string) => !!webhookFor(kind)

const KIND: Record<string, string> = {
  announcement: '📣 Ανακοίνωση', challenge_unlocked: '🎯 Υπενθύμιση πρόκλησης', event_reminder: '📅 Υπενθύμιση δράσης',
  badge: '🏅 Πτυχίο', requirement: '⚜️ Απαίτηση', venture: '🏵️ Κοινότητα', direct: '✉️ Προσωπικό μήνυμα',
  poll: '🗳️ Ψηφοφορία', infoApproval: '📄 Πληροφορίες προς έγκριση', infoPublished: '📄 Πληροφορίες δημοσιεύτηκαν',
  parentPost: '👪 Ανακοίνωση γονέων',
  // the mini-games
  'fun': '🍅 Σπλατς', 'fun-warn': '🍅 Σπλατς', 'fun-daily': '🍅 Σπλατς · ο στόχος της ημέρας', 'fun-refill': '🎒 Σπλατς · ανεφοδιασμός', 'fun-gift': '🎁 Σπλατς · δώρο',
  'potato': '🥔 Καυτή Πατάτα', 'potato-pass': '🥔 Καυτή Πατάτα', 'potato-burst': '🥔 Καυτή Πατάτα · έσκασε',
  'kim': '🧠 Το Ταψί του Κιμ', 'flag': '🇬🇷 Έπαρση Σημαίας', 'game-digest': '🎮 Μίνι παιχνίδια · μαζεμένα'
}
const clip = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s
function list(names: string[], max = 1000) {
  let out = ''
  for (const [i, n] of names.entries()) {
    const next = out ? `${out}, ${n}` : n
    if (next.length > max - 20) return `${out} … +${names.length - i}`
    out = next
  }
  return out || '—'
}

async function post(e: Entry) {
  const url = webhookFor(e.msg.kind)
  if (!url) return
  const db = await useDb()
  const scouts = new Map((await db.select().from(s.scouts)).map(r => [r.id, `${r.firstName} ${r.lastName}${r.isHidden ? ' (δοκιμαστικός)' : ''}`]))
  const parents = new Map((await db.select().from(s.parents)).map(p => [p.id, p.name]))
  const fields: any[] = []
  const add = (who: Outcome[], names: Map<number, string>, prefix: string) => {
    const by = (o: Outcome['outcome']) => who.filter(x => x.outcome === o)
    const name = (x: Outcome) => names.get(x.id) || `#${x.id}`
    if (by('delivered').length) fields.push({ name: `${prefix}✅ Στο κινητό (${by('delivered').length})`, value: list(by('delivered').map(name)) })
    if (by('failed').length) fields.push({ name: `${prefix}❌ Απέτυχε (${by('failed').length})`,
      value: clip(by('failed').map(x => `${name(x)} — ${[...new Set(x.errors)].join('; ')}`).join('\n'), 1000) })
    if (by('no-device').length) fields.push({ name: `${prefix}🔕 Χωρίς κινητό, μόνο στην εφαρμογή (${by('no-device').length})`, value: list(by('no-device').map(name)) })
    if (by('muted').length) fields.push({ name: `${prefix}🔇 Σίγαση παιχνιδιών, μόνο στο παιχνίδι (${by('muted').length})`, value: list(by('muted').map(name)) })
  }
  add(e.members, scouts, '')
  add(e.parents, parents, '👪 Γονείς · ')
  if (e.anonymous.devices) fields.push({ name: '👪 Γονείς χωρίς λογαριασμό', value: `${e.anonymous.sent} από ${e.anonymous.devices} συσκευές` })
  if (e.notes.length) fields.push({ name: 'Λεπτομέρειες', value: clip(e.notes.join('\n'), 1000) })
  const failed = [...e.members, ...e.parents].some(x => x.outcome === 'failed')
  const delivered = [...e.members, ...e.parents].some(x => x.outcome === 'delivered') || e.anonymous.sent > 0
  await $fetch(url, {
    method: 'POST', timeout: 8000,
    body: {
      username: isGame(e.msg.kind) ? 'Πύλη Προσκόπων · Παιχνίδια' : 'Πύλη Προσκόπων',
      embeds: [{
        title: KIND[e.msg.kind] || `🔔 ${e.msg.kind}`,
        description: clip(`**${e.msg.title}**\n${e.msg.body}`, 1500),
        color: failed ? 0xE8891E : delivered ? 0x2FA36B : 0x7A8AA0,
        fields: fields.slice(0, 25),
        footer: { text: '«Στο κινητό»: το δέχτηκε η υπηρεσία ειδοποιήσεων του κινητού' },
        timestamp: new Date().toISOString()
      }]
    }
  })
}
