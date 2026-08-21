/* Builds the Greek prompt the leader hands to an AI so it returns quiz
   questions in exactly the shape /api/admin/challenges/import expects.
   Kept out of the i18n JSON on purpose: vue-i18n parses `{}` in messages as
   interpolation and would choke on the JSON example. */

export type PromptFields = {
  topics: string
  count: number | string
  ageGroup: string
  opensAt: string      // datetime-local value, e.g. 2026-09-15T18:00
  spacing: string
  sector?: string      // which section the batch is for — context for the AI,
                       // the actual assignment happens at import time
}

const SHAPE = `[
  {
    "titleEl": "Σύντομος τίτλος",
    "questionEl": "Το κείμενο της ερώτησης;",
    "explanationEl": "Γιατί αυτή είναι η σωστή απάντηση.",
    "imageEmoji": "🪢",
    "points": 10,
    "unlocksAt": "2026-09-15T18:00:00+03:00",
    "options": [
      { "textEl": "Λάθος επιλογή", "isCorrect": false },
      { "textEl": "Σωστή επιλογή", "isCorrect": true },
      { "textEl": "Λάθος επιλογή", "isCorrect": false }
    ]
  }
]`

/** Turn a datetime-local value into ISO 8601 with the Cyprus offset. */
function toIso(v: string): string {
  if (!v) return '[ΣΥΜΠΛΗΡΩΣΕ ΗΜΕΡΟΜΗΝΙΑ/ΩΡΑ]'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const oh = pad(Math.floor(Math.abs(off) / 60)), om = pad(Math.abs(off) % 60)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${oh}:${om}`
}

export function buildImportPrompt(f: PromptFields): string {
  const topics = f.topics.trim() || '[ΣΥΜΠΛΗΡΩΣΕ ΤΑ ΘΕΜΑΤΑ]'
  const count = String(f.count || '10')
  const age = f.ageGroup.trim() || '[ΣΥΜΠΛΗΡΩΣΕ ΗΛΙΚΙΑΚΗ ΟΜΑΔΑ]'
  const opens = toIso(f.opensAt)
  const spacing = f.spacing.trim() || 'όλες ανοίγουν την ίδια ώρα'
  return `Είσαι βοηθός αρχηγού προσκόπων. Δημιούργησε ${count} ερωτήσεις κουίζ πολλαπλής επιλογής στα ελληνικά.

ΘΕΜΑΤΑ: ${topics}
ΤΜΗΜΑ: ${f.sector || 'Όλο το Σύστημα'}
ΗΛΙΚΙΑΚΗ ΟΜΑΔΑ: ${age}
ΩΡΑ ΠΟΥ ΑΝΟΙΓΕΙ Η ΠΡΩΤΗ: ${opens}
ΑΠΟΣΤΑΣΗ ΜΕΤΑΞΥ ΕΡΩΤΗΣΕΩΝ: ${spacing}

ΚΑΝΟΝΕΣ:
- Κάθε ερώτηση: 3-4 επιλογές, ΑΚΡΙΒΩΣ ΜΙΑ σωστή.
- Σύντομη εξήγηση της σωστής απάντησης στο explanationEl.
- Γλώσσα απλή και κατάλληλη για την ηλικία.
- Το unlocksAt σε μορφή ISO 8601 με ζώνη ώρας, όπως το παράδειγμα.
- Ξεκίνα από την ώρα που δόθηκε και πρόσθεσε την απόσταση σε κάθε επόμενη ερώτηση.
- Χρησιμοποίησε ένα σχετικό emoji στο imageEmoji.
- Προσάρμοσε τη δυσκολία στο τμήμα και στην ηλικία που δόθηκαν.
- ΜΗΝ βάλεις πεδίο sectionId — το τμήμα ορίζεται κατά την εισαγωγή.

ΑΠΑΝΤΗΣΕ ΜΟΝΟ ΜΕ JSON — χωρίς σχόλια, χωρίς markdown — σε αυτή ακριβώς τη μορφή:
${SHAPE}`
}
