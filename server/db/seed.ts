/* First-boot data — the 30ό Σύστημα structure plus the single troop-leader
   account. No demo members: the roster starts empty so the real one can be
   entered directly.
     1111-2222  ΠΑΝΑΓΙΩΤΗΣ ΚΑΙΜΗΣ — Αρχηγός Συστήματος (admin, all sectors)
   Rotate that passcode from Προφίλ → Νέος κωδικός right after go-live. */
import type { drizzle } from 'drizzle-orm/node-postgres'
import * as s from './schema'
import { hmacPasscode, now } from '../utils/passcode'

type Db = ReturnType<typeof drizzle<typeof s>>

export async function seedIfEmpty(db: Db) {
  if ((await db.select().from(s.scouts).limit(1)).length) return
  const ts = now()

  const sectionRows = (await db.insert(s.sections).values([
    { nameEl: 'Μικρή Αγέλη', nameEn: 'Little Pack', slug: 'mikri-ageli', hasApp: false, sortOrder: 0 },
    { nameEl: 'Αγέλη', nameEn: 'Cub Pack', slug: 'ageli', hasApp: false, sortOrder: 1 },
    { nameEl: 'Ομάδα Προσκόπων', nameEn: 'Scout Troop', slug: 'omada', hasApp: true, sortOrder: 2 },
    { nameEl: 'Κοινότητα Ανιχνευτών', nameEn: 'Venture Community', slug: 'koinotita', hasApp: true, sortOrder: 3 }
  ]).returning())
  const S = Object.fromEntries(sectionRows.map(x => [x.slug!, x.id]))

  // Starter teams for the Scout Troop — rename, add or delete them from
  // Πρόσκοποι → Ομάδα Προσκόπων.
  await db.insert(s.patrols).values([
    { sectionId: S.omada, nameEl: 'Λύκοι', nameEn: 'Wolves', emblem: '🐺', sortOrder: 0 },
    { sectionId: S.omada, nameEl: 'Αετοί', nameEn: 'Eagles', emblem: '🦅', sortOrder: 1 },
    { sectionId: S.omada, nameEl: 'Κόβρες', nameEn: 'Cobras', emblem: '🐍', sortOrder: 2 }
  ])

  await db.insert(s.scouts).values({
    firstName: 'ΠΑΝΑΓΙΩΤΗΣ', lastName: 'ΚΑΙΜΗΣ',
    firstNameEn: 'Panagiotis', lastNameEn: 'Kaimis',
    passcodeHmac: hmacPasscode('1111-2222'),
    role: 'troop_leader', isChief: true, isActive: true,
    joinedOn: ts.slice(0, 10), createdAt: ts
  })

  // The Πτυχία catalogue comes from the passport — see seedPassport.ts.

  await db.insert(s.infoPages).values([
    {
      slug: 'uniforms', iconEmoji: '👔', titleEl: 'Στολές', titleEn: 'Uniforms',
      summaryEl: 'Τι φοράμε και πότε', summaryEn: 'What we wear and when',
      illustration: 'uniforms', sortOrder: 0, isPublished: true,
      bodyEl: `Έχουμε δύο στολές. Η σωστή στολή δείχνει σεβασμό στην ομάδα και στον εαυτό σου.

## Επίσημη Στολή
- Μπερές με το προσκοπικό σήμα
- Πουκάμισο μακρυμάνικο, μέσα στο παντελόνι
- Μαντήλι Συστήματος με κρίκο
- Ζώνη με προσκοπική κόπιτσα
- Παντελόνι ή φούστα στολής
- Κάλτσες στολής
- Μαύρα κλειστά παπούτσια
- Διακριτικά: Συστήματος, βαθμού και πτυχίων

> Πότε τη φοράμε: σε παρελάσεις, τελετές, υποσχέσεις, εκκλησιασμούς και επίσημες επισκέψεις.

## Στολή Εργασίας
- Μπλουζάκι Συστήματος
- Μαντήλι Συστήματος με κρίκο
- Παντελόνι ή βερμούδα, σκούρο χρώμα
- Αθλητικά παπούτσια
- Καπέλο για τον ήλιο

> Πότε τη φοράμε: στις εβδομαδιαίες συγκεντρώσεις, στις δράσεις, στις εκδρομές και στην κατασκήνωση.`,
      bodyEn: `We have two uniforms. Wearing the right one shows respect for the group and for yourself.

## Formal Uniform
- Beret with the Scout badge
- Long-sleeved shirt, tucked in
- Troop neckerchief with woggle
- Belt with Scout buckle
- Uniform trousers or skirt
- Uniform socks
- Black closed shoes
- Insignia: troop, rank and badge patches

> When we wear it: parades, ceremonies, promise ceremonies, church services and official visits.

## Working Uniform
- Troop T-shirt
- Troop neckerchief with woggle
- Trousers or shorts, dark colour
- Trainers
- Sun hat

> When we wear it: weekly meetings, activities, hikes and camp.`
    },
    {
      slug: 'camp-list', iconEmoji: '🎒', titleEl: 'Τι φέρνω στην κατασκήνωση', titleEn: 'Camp packing list',
      summaryEl: 'Λίστα ελέγχου', summaryEn: 'Checklist', sortOrder: 1, isPublished: true,
      bodyEl: `## Απαραίτητα
- Υπνόσακος και υπόστρωμα
- Φακός και μπαταρίες
- Παγούρι νερού
- Αδιάβροχο
- Είδη ατομικής υγιεινής
- Και οι δύο στολές

> Προσοχή: δεν φέρνουμε μαχαίρια, χρήματα ή ακριβές συσκευές χωρίς άδεια του αρχηγού.`,
      bodyEn: `## Essentials
- Sleeping bag and mat
- Torch and batteries
- Water bottle
- Rain jacket
- Toiletries
- Both uniforms

> Please note: no knives, cash or expensive devices without the leader's permission.`
    },
    {
      slug: 'law-promise', iconEmoji: '📜', titleEl: 'Νόμος & Υπόσχεση', titleEn: 'Law & Promise',
      summaryEl: 'Οι αρχές μας', summaryEn: 'Our principles', sortOrder: 2, isPublished: false,
      bodyEl: 'Το επίσημο κείμενο θα προστεθεί από τον αρχηγό.', bodyEn: 'The official text will be added by a leader.'
    }
  ])

  console.log('[seed] 30ό Σύστημα initialised — Αρχηγός Συστήματος ΠΑΝΑΓΙΩΤΗΣ ΚΑΙΜΗΣ, passcode 1111-2222 (rotate it now). Roster starts empty.')
}
