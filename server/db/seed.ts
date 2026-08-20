/* First-boot demo data — the 30ό Σύστημα structure.
   Demo passcodes (documented in README):
     1111-2222  Κυριάκος Λάμπρου    — Αρχηγός Συστήματος (admin, all sectors)
     3333-4444  Δέσποινα Αντρέου    — Αρχηγός Ομάδας Προσκόπων
     4444-5555  Μάριος Σιακαλλής    — Υπαρχηγός Ομάδας Προσκόπων (needs approval to send)
     2222-3333  Χριστίνα Παύλου     — Αρχηγός Αγέλης (no member accounts — parents page)
     5555-6666  Γιώργος Παπαδόπουλος — Scout (Ομάδα, 🦅 Αετοί)
   Every other scout: 70NN-00NN where NN = 10 + roster row. */
import type { drizzle } from 'drizzle-orm/better-sqlite3'
import * as s from './schema'
import { hmacPasscode, now } from '../utils/passcode'

type Db = ReturnType<typeof drizzle<typeof s>>

const iso = (d: number, h = 17, min = 0) => {
  const t = new Date()
  t.setDate(t.getDate() + d); t.setHours(h, min, 0, 0)
  return t.toISOString()
}

export function seedIfEmpty(db: Db) {
  if (db.select().from(s.scouts).limit(1).all().length) return
  const ts = now()

  const sectionRows = db.insert(s.sections).values([
    { nameEl: 'Μικρή Αγέλη', nameEn: 'Little Pack', slug: 'mikri-ageli', hasApp: false, sortOrder: 0 },
    { nameEl: 'Αγέλη', nameEn: 'Cub Pack', slug: 'ageli', hasApp: false, sortOrder: 1 },
    { nameEl: 'Ομάδα Προσκόπων', nameEn: 'Scout Troop', slug: 'omada', hasApp: true, sortOrder: 2 },
    { nameEl: 'Κοινότητα Ανιχνευτών', nameEn: 'Venture Community', slug: 'koinotita', hasApp: true, sortOrder: 3 }
  ]).returning().all()
  const S = Object.fromEntries(sectionRows.map(x => [x.slug!, x.id]))

  const patrolRows = db.insert(s.patrols).values([
    { sectionId: S.omada, nameEl: 'Λύκοι', nameEn: 'Wolves', emblem: '🐺', sortOrder: 0 },
    { sectionId: S.omada, nameEl: 'Αετοί', nameEn: 'Eagles', emblem: '🦅', sortOrder: 1 },
    { sectionId: S.omada, nameEl: 'Κόβρες', nameEn: 'Cobras', emblem: '🐍', sortOrder: 2 }
  ]).returning().all()
  const P = patrolRows.map(p => p.id)

  // [first, last, firstEn, lastEn, patrol index | -1, role]
  const roster: Array<[string, string, string, string, number, string]> = [
    ['Ανδρέας', 'Κυριάκου', 'Andreas', 'Kyriakou', 0, 'scout'],
    ['Χριστίνα', 'Γεωργίου', 'Christina', 'Georgiou', 0, 'scout'],
    ['Πέτρος', 'Σάββα', 'Petros', 'Savva', 0, 'scout'],
    ['Νίκος', 'Δημητρίου', 'Nikos', 'Dimitriou', 0, 'scout'],
    ['Μάριος', 'Ηλία', 'Marios', 'Ilia', 0, 'scout'],
    ['Ραφαέλλα', 'Παύλου', 'Rafaella', 'Pavlou', 0, 'scout'],
    ['Γιώργος', 'Παπαδόπουλος', 'Giorgos', 'Papadopoulos', 1, 'scout'],
    ['Ελένη', 'Σταύρου', 'Eleni', 'Stavrou', 1, 'scout'],
    ['Μαρίνα', 'Χριστοδούλου', 'Marina', 'Christodoulou', 1, 'scout'],
    ['Αντρέας', 'Λοΐζου', 'Andreas', 'Loizou', 1, 'scout'],
    ['Σοφία', 'Νικολάου', 'Sofia', 'Nicolaou', 1, 'scout'],
    ['Κώστας', 'Ιωάννου', 'Kostas', 'Ioannou', 1, 'scout'],
    ['Μαρία', 'Χαραλάμπους', 'Maria', 'Charalambous', 2, 'scout'],
    ['Στέλιος', 'Αντωνίου', 'Stelios', 'Antoniou', 2, 'scout'],
    ['Λουκία', 'Κωνσταντίνου', 'Loukia', 'Constantinou', 2, 'scout'],
    ['Άννα', 'Μιχαήλ', 'Anna', 'Michael', 2, 'scout'],
    ['Δημήτρης', 'Ζένιου', 'Dimitris', 'Zeniou', 2, 'scout'],
    ['Έλενα', 'Πιερή', 'Elena', 'Pieri', 2, 'scout'],
    ['Κυριάκος', 'Λάμπρου', 'Kyriakos', 'Lambrou', -1, 'troop_leader'],
    ['Δέσποινα', 'Αντρέου', 'Despina', 'Andreou', -1, 'leader'],
    ['Μάριος', 'Σιακαλλής', 'Marios', 'Siakallis', -1, 'leader'],
    ['Χριστίνα', 'Παύλου', 'Christina', 'Pavlou', -1, 'leader'],
    // patrol-level leaders (Αρχηγός/Υπαρχηγός Ενωμοτίας) for 🐺 Λύκοι — proves the mechanism
    ['Παναγιώτης', 'Ηλία', 'Panagiotis', 'Ilia', -1, 'leader'],
    ['Δήμος', 'Κωνσταντίνου', 'Dimos', 'Constantinou', -1, 'leader'],
    // Κοινότητα Ανιχνευτών: a leader plus a few members, so the section isn't empty
    ['Ανδρέας', 'Φιλίππου', 'Andreas', 'Filippou', -1, 'leader'],
    ['Νικολέτα', 'Ευαγγέλου', 'Nikoleta', 'Evangelou', -2, 'scout'],
    ['Ορέστης', 'Κυπριανού', 'Orestis', 'Kyprianou', -2, 'scout'],
    ['Μελίνα', 'Χατζή', 'Melina', 'Hatzi', -2, 'scout']
  ]
  const pass = (i: number, first: string, last: string) => {
    if (last === 'Λάμπρου') return '1111-2222'
    if (last === 'Αντρέου') return '3333-4444'
    if (last === 'Σιακαλλής') return '4444-5555'
    if (last === 'Παύλου' && first === 'Χριστίνα') return '2222-3333'
    if (first === 'Γιώργος') return '5555-6666'
    if (first === 'Παναγιώτης') return '6666-7777'
    if (first === 'Δήμος' && last === 'Κωνσταντίνου') return '7777-8888'
    if (first === 'Ανδρέας' && last === 'Φιλίππου') return '8888-9999'
    return `70${String(10 + i)}-00${String(10 + i)}`
  }
  const scoutRows = db.insert(s.scouts).values(roster.map(([f, l, fe, le, p, role], i) => ({
    patrolId: p >= 0 ? P[p] : null,
    sectionId: p === -2 ? S.koinotita : role === 'scout' ? S.omada : null,
    firstName: f, lastName: l, firstNameEn: fe, lastNameEn: le,
    passcodeHmac: hmacPasscode(pass(i, f, l)),
    role: role as any, isActive: !(f === 'Κώστας'),
    joinedOn: '2023-10-01', createdAt: ts
  }))).returning().all()
  const byLast = (l: string, f?: string) => scoutRows.find(r => r.lastName === l && (!f || r.firstName === f))!
  const admin = byLast('Λάμπρου')
  const archOmada = byLast('Αντρέου')
  const yparchOmada = byLast('Σιακαλλής')
  const archAgeli = byLast('Παύλου', 'Χριστίνα')
  const giorgos = byLast('Παπαδόπουλος')
  const archLykoi = byLast('Ηλία', 'Παναγιώτης')
  const yparchLykoi = byLast('Κωνσταντίνου', 'Δήμος')
  const archKoinotita = byLast('Φιλίππου')

  db.insert(s.leaderScopes).values([
    { scoutId: archOmada.id, scope: 'section', sectionId: S.omada, rank: 'archigos', assignedBy: admin.id, assignedAt: ts },
    { scoutId: yparchOmada.id, scope: 'section', sectionId: S.omada, rank: 'yparchigos', assignedBy: admin.id, assignedAt: ts },
    { scoutId: archAgeli.id, scope: 'section', sectionId: S.ageli, rank: 'archigos', assignedBy: admin.id, assignedAt: ts },
    { scoutId: archKoinotita.id, scope: 'section', sectionId: S.koinotita, rank: 'archigos', assignedBy: admin.id, assignedAt: ts },
    { scoutId: archLykoi.id, scope: 'patrol', patrolId: P[0], rank: 'archigos', assignedBy: archOmada.id, assignedAt: ts },
    { scoutId: yparchLykoi.id, scope: 'patrol', patrolId: P[0], rank: 'yparchigos', assignedBy: archOmada.id, assignedAt: ts }
  ]).run()

  const badgeDefs: Array<[string, string, string, string, string]> = [
    ['🪢', 'Κόμποι', 'Knots', 'Δένεις με σιγουριά τους βασικούς κόμπους και ξέρεις πού χρησιμεύει ο καθένας.', 'Ties the core scouting knots confidently and knows what each one is for.'],
    ['🧭', 'Προσανατολισμός', 'Orienteering', 'Βρίσκεις τον δρόμο σου με χάρτη και πυξίδα, μέρα και νύχτα.', 'Finds their way with map and compass, by day and by night.'],
    ['⛺', 'Κατασκήνωση', 'Camping', 'Στήνεις σκηνή, οργανώνεις κατασκήνωση και φροντίζεις τον χώρο σου.', 'Pitches a tent, sets up camp and looks after the site.'],
    ['🔥', 'Φωτιά', 'Fire', 'Ανάβεις και σβήνεις φωτιά με ασφάλεια, σε κάθε καιρό.', 'Lights and safely extinguishes a fire in any weather.'],
    ['🩹', 'Πρώτες Βοήθειες', 'First Aid', 'Αντιμετωπίζεις τραυματισμούς και ξέρεις πότε να καλέσεις βοήθεια.', 'Handles injuries and knows when to call for help.'],
    ['🍳', 'Μαγειρική', 'Cooking', 'Ετοιμάζεις γεύμα για την ενωμοτία σου στην ύπαιθρο.', 'Cooks a meal for their patrol in the outdoors.'],
    ['🏊', 'Κολύμβηση', 'Swimming', 'Κολυμπάς με ασφάλεια και γνωρίζεις τους κανόνες διάσωσης.', 'Swims safely and knows basic water rescue rules.'],
    ['🗺️', 'Χαρτογραφία', 'Mapping', 'Σχεδιάζεις και διαβάζεις χάρτες με κλίμακα και σύμβολα.', 'Draws and reads maps with scale and symbols.'],
    ['🌿', 'Φύση', 'Nature', 'Αναγνωρίζεις φυτά και ζώα της περιοχής σου.', 'Identifies local plants and animals.'],
    ['🚴', 'Ποδηλασία', 'Cycling', 'Συντηρείς το ποδήλατό σου και κινείσαι με ασφάλεια.', 'Maintains a bike and rides safely.'],
    ['📡', 'Επικοινωνίες', 'Signalling', 'Στέλνεις και λαμβάνεις μηνύματα με σήματα.', 'Sends and receives messages by signal.'],
    ['🪵', 'Ξυλοτεχνία', 'Pioneering', 'Φτιάχνεις χρήσιμες κατασκευές με ξύλα και σχοινιά.', 'Builds useful structures from spars and rope.']
  ]
  const badgeRows = db.insert(s.achievements).values(badgeDefs.map(([i, el, en, del_, den], idx) => ({
    iconEmoji: i, titleEl: el, titleEn: en, descriptionEl: del_, descriptionEn: den, sortOrder: idx
  }))).returning().all()

  const counts = [8, 7, 6, 5, 4, 4, 6, 6, 5, 5, 4, 0, 7, 6, 5, 5, 3, 3]
  const awards: any[] = []
  scoutRows.filter(r => r.role === 'scout').forEach((r, i) => {
    for (let b = 0; b < (counts[i] ?? 3); b++) {
      awards.push({
        scoutId: r.id, achievementId: badgeRows[b].id,
        completedOn: `2026-0${(b % 6) + 3}-1${(i % 3) + 1}`, awardedBy: admin.id
      })
    }
  })
  db.insert(s.scoutAchievements).values(awards).run()

  const eventRows = db.insert(s.events).values([
    { scope: 'troop', titleEl: 'Εβδομαδιαία Συγκέντρωση', titleEn: 'Weekly Meeting', location: 'Εστία Συστήματος', startsAt: iso(-3, 17), endsAt: iso(-3, 19), createdBy: admin.id },
    { scope: 'patrol', patrolId: P[0], sectionId: S.omada, titleEl: 'Συνάντηση Ενωμοτίας Λύκων', titleEn: 'Wolves Patrol Meet-up', location: 'Πλατεία', startsAt: iso(2, 18), endsAt: iso(2, 19, 30), remindAt: iso(1, 18), createdBy: archOmada.id },
    { scope: 'section', sectionId: S.omada, titleEl: 'Πεζοπορία στον Τρόοδο', titleEn: 'Troodos Hike', location: 'Στάση Καλής Ελπίδας', startsAt: iso(8, 8), isAllDay: true, remindAt: iso(7, 18), createdBy: archOmada.id },
    { scope: 'section', sectionId: S.ageli, titleEl: 'Παιχνίδια Αγέλης στο πάρκο', titleEn: 'Cub Pack Games in the Park', location: 'Δημοτικό Πάρκο', startsAt: iso(4, 10), endsAt: iso(4, 12), remindAt: iso(3, 18), createdBy: archAgeli.id },
    { scope: 'troop', titleEl: 'Παρέλαση 28ης Οκτωβρίου', titleEn: '28th October Parade', location: 'Κεντρική Πλατεία', startsAt: iso(14, 10), createdBy: admin.id },
    { scope: 'troop', titleEl: 'Χειμερινή Κατασκήνωση', titleEn: 'Winter Camp', location: 'Δάσος Μαχαιρά', startsAt: iso(30, 9), isAllDay: true, remindAt: iso(29, 18), createdBy: admin.id }
  ]).returning().all()

  const active = scoutRows.filter(r => r.role === 'scout' && r.isActive)
  const reviews: any[] = []; const pts: any[] = []
  active.forEach((r, i) => {
    const att = i === 4 ? 'absent' : i === 9 ? 'excused' : 'present'
    const uni = att !== 'present' ? null : (i % 6 === 3 ? 'partial' : 'full')
    reviews.push({ eventId: eventRows[0].id, scoutId: r.id, attendance: att, uniform: uni, recordedBy: archOmada.id, recordedAt: ts })
    if (att === 'present') pts.push({ scoutId: r.id, eventId: eventRows[0].id, kind: 'attendance', points: 5, reasonEl: 'Παρουσία στη συγκέντρωση', reasonEn: 'Attended the meeting', awardedBy: archOmada.id, awardedAt: ts })
    if (uni === 'full') pts.push({ scoutId: r.id, eventId: eventRows[0].id, kind: 'uniform', points: 5, reasonEl: 'Πλήρης στολή', reasonEn: 'Full uniform', awardedBy: archOmada.id, awardedAt: ts })
  })
  pts.push({ patrolId: P[1], eventId: eventRows[0].id, kind: 'game', points: 20, reasonEl: 'Σκυταλοδρομία κόμπων', reasonEn: 'Knot relay race', awardedBy: archOmada.id, awardedAt: ts })
  db.insert(s.eventReviews).values(reviews).run()
  db.insert(s.pointAwards).values(pts).run()

  const mkChallenge = (c: any, opts: Array<[string, string, boolean]>) => {
    const [row] = db.insert(s.challenges).values(c).returning().all()
    const optRows = db.insert(s.challengeOptions).values(
      opts.map(([el, en, ok], i) => ({ challengeId: row.id, textEl: el, textEn: en, isCorrect: ok, sortOrder: i }))
    ).returning().all()
    return { row, optRows }
  }
  const past = mkChallenge({
    titleEl: 'Πρώτες Βοήθειες', titleEn: 'First Aid',
    questionEl: 'Τι κάνεις πρώτα όταν κάποιος έχει μικρό κόψιμο;', questionEn: 'What do you do first for a small cut?',
    imageEmoji: '🩹', points: 10, isPublished: true, createdBy: admin.id,
    unlocksAt: iso(-10), closesAt: iso(-5),
    explanationEl: 'Πλένουμε καλά με καθαρό νερό πριν από οτιδήποτε άλλο.', explanationEn: 'Wash well with clean water before anything else.'
  }, [
    ['Φυσάμε την πληγή', 'Blow on the wound', false],
    ['Πλένουμε με καθαρό νερό', 'Wash with clean water', true],
    ['Βάζουμε αμέσως χανζαπλάστ', 'Apply a plaster immediately', false]
  ])
  const live = mkChallenge({
    titleEl: 'Πυξίδα', titleEn: 'Compass',
    questionEl: 'Τι δείχνει η κόκκινη βελόνα μιας μαγνητικής πυξίδας;', questionEn: 'What does the red needle of a compass point to?',
    imageEmoji: '🧭', points: 10, isPublished: true, createdBy: admin.id,
    unlocksAt: iso(-2), closesAt: iso(3),
    explanationEl: 'Η κόκκινη βελόνα δείχνει πάντα τον μαγνητικό Βορρά, που διαφέρει ελαφρώς από τον γεωγραφικό.', explanationEn: 'The red needle always points to magnetic North, slightly different from true North.'
  }, [
    ['Τον γεωγραφικό Νότο', 'True South', false],
    ['Τον μαγνητικό Βορρά', 'Magnetic North', true],
    ['Την κατεύθυνση του ανέμου', 'The wind direction', false],
    ['Το υψόμετρο', 'The altitude', false]
  ])
  mkChallenge({
    titleEl: 'Σημαίες & Σήματα', titleEn: 'Flags & Signals',
    questionEl: 'Ποιο σήμα σημαίνει «ελάτε προς εμένα»;', questionEn: 'Which signal means "come to me"?',
    points: 10, isPublished: true, createdBy: admin.id, unlocksAt: iso(5, 17),
    explanationEl: 'Τα χέρια ψηλά σχηματίζουν το σήμα συγκέντρωσης.', explanationEn: 'Arms raised high form the assembly signal.'
  }, [
    ['Χέρια ψηλά', 'Arms raised high', true],
    ['Χέρια στη μέση', 'Hands on hips', false],
    ['Ένα χέρι μπροστά', 'One arm forward', false]
  ])
  mkChallenge({
    titleEl: 'Ίχνη ζώων', titleEn: 'Animal Tracks',
    questionEl: 'Ποιο ζώο αφήνει πέλμα με 4 δάχτυλα και νύχια;', questionEn: 'Which animal leaves a 4-toed track with claws?',
    imageEmoji: '🐾', points: 10, isPublished: true, createdBy: archOmada.id, sectionId: S.omada, patrolId: P[0],
    unlocksAt: iso(-1), closesAt: iso(4),
    explanationEl: 'Ο σκύλος (και ο λύκος!) πατά με 4 δάχτυλα και εμφανή νύχια.', explanationEn: 'Dogs (and wolves!) show 4 toes with visible claws.'
  }, [
    ['Η γάτα', 'A cat', false],
    ['Ο σκύλος', 'A dog', true],
    ['Το πουλί', 'A bird', false]
  ])
  mkChallenge({
    titleEl: 'Σχεδιασμός Εξόρμησης', titleEn: 'Expedition Planning',
    questionEl: 'Ποιο είναι το πρώτο βήμα στον σχεδιασμό μιας πολυήμερης εξόρμησης;', questionEn: 'What is the first step in planning a multi-day expedition?',
    imageEmoji: '🗺️', points: 15, isPublished: true, createdBy: archKoinotita.id, sectionId: S.koinotita,
    unlocksAt: iso(-1), closesAt: iso(6),
    explanationEl: 'Πριν από εξοπλισμό ή διαδρομή, εκτιμούμε τους κινδύνους της περιοχής και των καιρικών συνθηκών.', explanationEn: 'Before gear or route, we assess the risks of the terrain and weather.'
  }, [
    ['Εκτίμηση κινδύνου', 'Risk assessment', true],
    ['Αγορά εξοπλισμού', 'Buying gear', false],
    ['Κράτηση καταλύματος', 'Booking accommodation', false]
  ])

  const correctPast = past.optRows.find(o => o.isCorrect)!
  const answers: any[] = []
  active.forEach((r, i) => {
    const ok = i % 4 !== 0
    answers.push({
      challengeId: past.row.id, scoutId: r.id,
      optionId: ok ? correctPast.id : past.optRows[0].id,
      isCorrect: ok, pointsAwarded: ok ? 10 : 0, answeredAt: iso(-7)
    })
  })
  const correctLive = live.optRows.find(o => o.isCorrect)!
  active.slice(0, 11).forEach((r, i) => {
    if (r.id === giorgos.id) return
    const ok = i % 5 !== 2
    answers.push({
      challengeId: live.row.id, scoutId: r.id,
      optionId: ok ? correctLive.id : live.optRows[0].id,
      isCorrect: ok, pointsAwarded: ok ? 10 : 0, answeredAt: iso(-1)
    })
  })
  db.insert(s.challengeAnswers).values(answers).run()

  db.insert(s.infoPages).values([
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
  ]).run()

  console.log('[seed] 30ό Σύστημα demo created — admin 1111-2222, Αρχηγός Ομάδας 3333-4444, Υπαρχηγός 4444-5555, Αρχηγός Αγέλης 2222-3333, scout 5555-6666, Αρχηγός Ενωμοτίας Λύκων 6666-7777, Υπαρχηγός Ενωμοτίας Λύκων 7777-8888, Αρχηγός Κοινότητας 8888-9999')
}
