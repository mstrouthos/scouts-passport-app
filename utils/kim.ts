/* Το Ταψί του Κιμ — Kim's Game, from Kipling's "Kim" by way of Baden-Powell's
   "Scouting for Boys": look at a tray of things, the cloth comes down, and
   say what is gone. Here, one tray a day, the same for every Βαθμοφόρος:
   twelve things to look at for twenty seconds, then four of them are taken
   away and must be picked out from ten. Shared by the page and the server,
   so the tray is worked out from the day alone and nothing needs storing. */

export type KimObject = { key: string, el: string, en: string }
/** Everything that can be on the tray (public/images/kim/<key>.webp, drawn on fal.ai). */
export const KIM_OBJECTS: KimObject[] = [
  { key: 'compass', el: 'Πυξίδα', en: 'Compass' }, { key: 'torch', el: 'Φακός', en: 'Torch' },
  { key: 'whistle', el: 'Σφυρίχτρα', en: 'Whistle' }, { key: 'knife', el: 'Σουγιάς', en: 'Pocket knife' },
  { key: 'rope', el: 'Σχοινί', en: 'Rope' }, { key: 'mug', el: 'Κούπα', en: 'Mug' },
  { key: 'matches', el: 'Σπίρτα', en: 'Matches' }, { key: 'map', el: 'Χάρτης', en: 'Map' },
  { key: 'canteen', el: 'Παγούρι', en: 'Canteen' }, { key: 'binoculars', el: 'Κιάλια', en: 'Binoculars' },
  { key: 'firstaid', el: 'Φαρμακείο', en: 'First aid kit' }, { key: 'tentpeg', el: 'Πάσσαλος', en: 'Tent peg' },
  { key: 'messtin', el: 'Καραβάνα', en: 'Mess tin' }, { key: 'carabiner', el: 'Καραμπίνερ', en: 'Carabiner' },
  { key: 'pencil', el: 'Μολύβι', en: 'Pencil' }, { key: 'padlock', el: 'Λουκέτο', en: 'Padlock' },
  { key: 'pinecone', el: 'Κουκουνάρα', en: 'Pine cone' }, { key: 'acorn', el: 'Βελανίδι', en: 'Acorn' },
  { key: 'feather', el: 'Φτερό', en: 'Feather' }, { key: 'leaf', el: 'Φύλλο δρυός', en: 'Oak leaf' },
  { key: 'mushroom', el: 'Μανιτάρι', en: 'Mushroom' }, { key: 'stone', el: 'Βότσαλο', en: 'Pebble' },
  { key: 'shell', el: 'Κοχύλι', en: 'Shell' }, { key: 'log', el: 'Κούτσουρο', en: 'Log' },
  { key: 'daisy', el: 'Μαργαρίτα', en: 'Daisy' }, { key: 'magnifier', el: 'Μεγεθυντικός φακός', en: 'Magnifying glass' },
  { key: 'notebook', el: 'Σημειωματάριο', en: 'Notebook' }, { key: 'sunglasses', el: 'Γυαλιά ηλίου', en: 'Sunglasses' },
  { key: 'sunhat', el: 'Καπέλο', en: 'Sun hat' }, { key: 'watch', el: 'Ρολόι', en: 'Watch' },
  { key: 'toothbrush', el: 'Οδοντόβουρτσα', en: 'Toothbrush' }, { key: 'firefly', el: 'Πυγολαμπίδα', en: 'Firefly jar' },
  { key: 'spoon', el: 'Κουτάλι', en: 'Spoon' }, { key: 'fork', el: 'Πιρούνι', en: 'Fork' },
  { key: 'pan', el: 'Τηγάνι', en: 'Frying pan' }, { key: 'kettle', el: 'Τσαγιέρα', en: 'Kettle' },
  { key: 'lantern', el: 'Φανάρι', en: 'Lantern' }, { key: 'hatchet', el: 'Τσεκουράκι', en: 'Hatchet' },
  { key: 'sleepingbag', el: 'Υπνόσακος', en: 'Sleeping bag' }, { key: 'backpack', el: 'Σακίδιο', en: 'Backpack' },
  { key: 'boot', el: 'Άρβυλο', en: 'Boot' }, { key: 'sock', el: 'Κάλτσα', en: 'Sock' },
  { key: 'gloves', el: 'Γάντια', en: 'Gloves' }, { key: 'woggle', el: 'Δαχτυλίδι μαντιλιού', en: 'Woggle' },
  { key: 'badge', el: 'Σήμα', en: 'Badge' }, { key: 'bandana', el: 'Μπαντάνα', en: 'Bandana' },
  { key: 'beans', el: 'Κονσέρβα', en: 'Tin of beans' }, { key: 'string', el: 'Σπάγκος', en: 'String' }
]
export const kimObject = (key: string) => KIM_OBJECTS.find(o => o.key === key)
export const kimImage = (key: string) => `/images/kim/${key}.webp`

export const KIM_ON_TRAY = 12
export const KIM_MISSING = 4
export const KIM_CHOICES = 10
/** How long the tray is shown. */
export const KIM_VIEW_MS = 20_000
/** The cloth coming down and going up again, which the clock does not count. */
export const KIM_COVER_MS = 1600

/** Today, in Cyprus, as YYYY-MM-DD: the tray's seed. */
export const kimDay = (at = new Date()) => at.toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })

/* a small seeded random: the same day always gives the same tray */
function seeded(text: string) {
  let h = 1779033703 ^ text.length
  for (let i = 0; i < text.length; i++) { h = Math.imul(h ^ text.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}
function shuffle<T>(list: T[], rnd: () => number) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/** The day's tray: what is on it, in its twelve places; which four places
    are emptied; and the ten things to pick the missing four from. */
export function kimTray(day = kimDay()) {
  const rnd = seeded('kim:' + day)
  const all = shuffle(KIM_OBJECTS.map(o => o.key), rnd)
  const tray = all.slice(0, KIM_ON_TRAY)
  const missing = shuffle([...Array(KIM_ON_TRAY).keys()], rnd).slice(0, KIM_MISSING).sort((a, b) => a - b)
  const decoys = all.slice(KIM_ON_TRAY, KIM_ON_TRAY + KIM_CHOICES - KIM_MISSING)
  const choices = shuffle([...missing.map(i => tray[i]), ...decoys], rnd)
  return { day, tray, missing, choices }
}
