/* The Βαθμοφόροι's playground: what one leader can do to another for a
   laugh. Each has its emoji, its name, what the other is told, and how it
   plays on screen — thrown across (and leaving its mark for a while), a
   shove, or something kind. */
export type FunMotion = 'throw' | 'shove' | 'kind' | 'pass' | 'burn'
export type FunAction = {
  key: string, emoji: string, motion: FunMotion,
  el: string, en: string,
  // what the one it was done to is told; {name} is who did it
  noteEl: string, noteEn: string,
  // a thrown thing leaves this colour on them for a while
  stain?: string
  // drawn art (public/images/fun, from Higgsfield): what flies or appears,
  // the splat a thrown thing leaves on them, and the one across the whole
  // screen of whoever it hit
  art?: { sprite?: string, splat?: string, screen?: string }
}

export const FUN_ACTIONS: FunAction[] = [
  { key: 'tomato', emoji: '🍅', motion: 'throw', el: 'Ντομάτα', en: 'Tomato', noteEl: '{name} μόλις σου πέταξε μια ντομάτα! 🍅', noteEn: '{name} just threw a tomato at you! 🍅', stain: '#D62C36' },
  { key: 'pie', emoji: '🥧', motion: 'throw', el: 'Τούρτα στη μούρη', en: 'Pie in the face', noteEl: '{name} σου πέταξε τούρτα στη μούρη! 🥧', noteEn: '{name} got you with a pie! 🥧', stain: '#FFF4D6' },
  { key: 'water', emoji: '💦', motion: 'throw', el: 'Μπαλόνι νερού', en: 'Water balloon', noteEl: '{name} σε μούσκεψε με μπαλόνι νερού! 💦', noteEn: '{name} soaked you with a water balloon! 💦', stain: '#5BB8F0' },
  { key: 'snowball', emoji: '❄️', motion: 'throw', el: 'Χιονόμπαλα', en: 'Snowball', noteEl: '{name} σου πέταξε μια χιονόμπαλα! ❄️', noteEn: '{name} threw a snowball at you! ❄️', stain: '#F2F8FF' },
  { key: 'marshmallow', emoji: '🍡', motion: 'throw', el: 'Ζαχαρωτό', en: 'Marshmallow', noteEl: '{name} σου πέταξε ένα ψημένο ζαχαρωτό! 🍡', noteEn: '{name} threw a toasted marshmallow at you! 🍡', stain: '#F3D3B0' },
  { key: 'mud', emoji: '🟤', motion: 'throw', el: 'Λάσπη', en: 'Mud', noteEl: '{name} σε γέμισε λάσπες! 🟤', noteEn: '{name} splattered you with mud! 🟤', stain: '#7A5230' },
  { key: 'pinecone', emoji: '🌲', motion: 'throw', el: 'Κουκουνάρα', en: 'Pine cone', noteEl: '{name} σου πέταξε μια κουκουνάρα! 🌲', noteEn: '{name} threw a pine cone at you! 🌲' },
  { key: 'push', emoji: '🫸', motion: 'shove', el: 'Σπρώξιμο', en: 'Push', noteEl: '{name} μόλις σε έσπρωξε! 🫸', noteEn: '{name} just pushed you! 🫸' },
  { key: 'poke', emoji: '👉', motion: 'shove', el: 'Σκούντημα', en: 'Poke', noteEl: '{name} σε σκούντηξε! 👉', noteEn: '{name} poked you! 👉' },
  { key: 'fish', emoji: '🐟', motion: 'shove', el: 'Χαστούκι με ψάρι', en: 'Fish slap', noteEl: '{name} σε χαστούκισε με ένα ψάρι! 🐟', noteEn: '{name} slapped you with a fish! 🐟' },
  { key: 'knot', emoji: '🪢', motion: 'shove', el: 'Σε έδεσα κόμπο', en: 'Tied in a knot', noteEl: '{name} σε έδεσε κόμπο! 🪢', noteEn: '{name} tied you up in a knot! 🪢' },
  { key: 'mosquito', emoji: '🦟', motion: 'shove', el: 'Κουνούπι στη σκηνή', en: 'Mosquito in your tent', noteEl: '{name} σου έβαλε κουνούπι στη σκηνή! 🦟', noteEn: '{name} let a mosquito into your tent! 🦟' },
  { key: 'wakeup', emoji: '📯', motion: 'shove', el: 'Εγερτήριο!', en: 'Wake-up call!', noteEl: '{name} σου σφύριξε εγερτήριο! 📯', noteEn: '{name} blew the wake-up call at you! 📯' },
  { key: 'dishes', emoji: '🧽', motion: 'shove', el: 'Λάντζα εσύ!', en: 'Dish duty!', noteEl: '{name} λέει πως σήμερα έχεις λάντζα! 🧽', noteEn: '{name} says it is your turn for the dishes! 🧽' },
  { key: 'highfive', emoji: '✋', motion: 'kind', el: 'Κόλλα πέντε', en: 'High five', noteEl: '{name} σου έκανε κόλλα πέντε! ✋', noteEn: '{name} gave you a high five! ✋' },
  { key: 'hug', emoji: '🤗', motion: 'kind', el: 'Αγκαλιά', en: 'Hug', noteEl: '{name} σου έστειλε μια αγκαλιά! 🤗', noteEn: '{name} sent you a hug! 🤗' },
  { key: 'coffee', emoji: '☕', motion: 'kind', el: 'Καφές', en: 'Coffee', noteEl: '{name} σε κέρασε καφέ! ☕', noteEn: '{name} bought you a coffee! ☕' },
  { key: 'salute', emoji: '⚜️', motion: 'kind', el: 'Προσκοπικός χαιρετισμός', en: 'Scout salute', noteEl: '{name} σε χαιρέτησε προσκοπικά! ⚜️', noteEn: '{name} gave you a scout salute! ⚜️' },
  { key: 'handshake', emoji: '🤝', motion: 'kind', el: 'Αριστερή χειραψία', en: 'Left handshake', noteEl: '{name} σου έδωσε προσκοπική αριστερή χειραψία! 🤝', noteEn: '{name} gave you the scout left handshake! 🤝' },
  { key: 'chocolate', emoji: '🍫', motion: 'kind', el: 'Μισή σοκολάτα', en: 'Half my chocolate', noteEl: '{name} μοιράστηκε μαζί σου τη σοκολάτα! 🍫', noteEn: '{name} shared their chocolate with you! 🍫' },
  { key: 'confetti', emoji: '🎉', motion: 'kind', el: 'Κομφετί', en: 'Confetti', noteEl: '{name} σε γέμισε κομφετί! 🎉', noteEn: '{name} showered you with confetti! 🎉' }
]
const ART = '/images/fun/'
// what is drawn so far: the thing itself, the splat it leaves, and the one
// across the whole screen (the rest show as their emoji until drawn)
// (everything now; the shove and kind ones drawn on fal.ai)
const DRAWN = FUN_ACTIONS.map(a => a.key)
const SPLATS = ['tomato', 'pie', 'water', 'snowball', 'marshmallow', 'mud']
const SCREENS = ['tomato', 'pie', 'water', 'snowball', 'marshmallow']
for (const a of FUN_ACTIONS) a.art = {
  ...(DRAWN.includes(a.key) ? { sprite: `${ART}${a.key}.webp` } : {}),
  ...(SPLATS.includes(a.key) ? { splat: `${ART}${a.key}-splat.webp` } : {}),
  ...(SCREENS.includes(a.key) ? { screen: `${ART}${a.key}-screen.webp` } : SPLATS.includes(a.key) ? { screen: `${ART}${a.key}-splat.webp` } : {})
}
/** The shared art: the comic bang of a shove (or a bonk), and the sparkle of
    a kind thing; a kind thing's shower across the screen is not drawn yet. */
export const FUN_IMPACT = `${ART}impact.webp`
export const FUN_SPARKLE: string | null = `${ART}sparkle.webp`
export const FUN_KIND_SCREEN: string | null = null

/* The games' own doings, in the feed and played out like the rest, but not
   on the buttons: the hot potato passed on, and burning in someone's hands. */
export const FUN_GAME: FunAction[] = [
  { key: 'potato', emoji: '🥔', motion: 'pass', el: 'Καυτή πατάτα', en: 'Hot potato', noteEl: '{name} σού πέταξε την καυτή πατάτα! 🥔 Πέτα τη γρήγορα σε κάποιον — μπορεί να σκάσει οποιαδήποτε στιγμή 💣', noteEn: '{name} threw you the hot potato! 🥔 Pass it on quickly — it could burst at any moment 💣' },
  { key: 'burn', emoji: '🔥', motion: 'burn', el: 'Κάηκε η πατάτα!', en: 'The potato burned!', noteEl: '🔥 Η καυτή πατάτα κάηκε στα χέρια σου!', noteEn: '🔥 The hot potato burned in your hands!' }
]
/** A throw with no name on it: what the one it hit is told. */
export const anonNote = (a: FunAction) => `${a.emoji} Κάποιος σε πέτυχε… Μάντεψε ποιος! 🕵️ (3 προσπάθειες)`

export const funAction = (key: string) => FUN_ACTIONS.find(a => a.key === key) || FUN_GAME.find(a => a.key === key)
/** Whether it is one of the things done by hand (not a game's doing). */
export const isPlay = (a: FunAction | undefined) => !!a && (a.motion === 'throw' || a.motion === 'shove' || a.motion === 'kind')
/** Whether someone takes this kind of thing: everything, only the kind ones, or nothing. */
export const funAllowed = (pref: string | null | undefined, a: FunAction) => pref === 'off' ? false : pref === 'kind' ? a.motion === 'kind' : true
