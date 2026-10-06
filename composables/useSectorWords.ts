/** What each sector calls its children and its units.

   These are not interchangeable: the Ομάδα has πρόσκοπους in ενωμοτίες, the
   Κοινότητα ανιχνευτές in ομίλους, the Αγέλη λυκόπουλα in εξάδες and the
   Μικρή Αγέλη μικρούς εξερευνητές, also in εξάδες. A Βαθμοφόρος of the Αγέλη
   must never read "Πρόσκοπος" or "Ενωμοτία" on their own screens. Someone who
   covers sectors that disagree — the Αρχηγός Συστήματος — gets neutral words. */
export type SectorWords = {
  member: string; members: string; memberAcc: string; newMember: string
  unit: string; units: string; unitAcc: string; unitGen: string; winner: string
  // whole phrases, so the article and adjective agree with the word's gender
  newUnit: string; whichMember: string
}

const EL: Record<string, SectorWords> = {
  'omada': {
    member: 'Πρόσκοπος', members: 'Πρόσκοποι', memberAcc: 'πρόσκοπο', newMember: 'Νέος πρόσκοπος',
    unit: 'Ενωμοτία', units: 'Ενωμοτίες', unitAcc: 'ενωμοτία', unitGen: 'ενωμοτίας', winner: 'Νικήτρια ενωμοτία', newUnit: 'Νέα ενωμοτία', whichMember: 'Ποιος πρόσκοπος;'
  },
  'koinotita': {
    member: 'Ανιχνευτής', members: 'Ανιχνευτές', memberAcc: 'ανιχνευτή', newMember: 'Νέος ανιχνευτής',
    unit: 'Όμιλος', units: 'Όμιλοι', unitAcc: 'όμιλο', unitGen: 'ομίλου', winner: 'Νικητής όμιλος', newUnit: 'Νέος όμιλος', whichMember: 'Ποιος ανιχνευτής;'
  },
  'ageli': {
    member: 'Λυκόπουλο', members: 'Λυκόπουλα', memberAcc: 'λυκόπουλο', newMember: 'Νέο λυκόπουλο',
    unit: 'Εξάδα', units: 'Εξάδες', unitAcc: 'εξάδα', unitGen: 'εξάδας', winner: 'Νικήτρια εξάδα', newUnit: 'Νέα εξάδα', whichMember: 'Ποιο λυκόπουλο;'
  },
  'mikri-ageli': {
    member: 'Μικρός Εξερευνητής', members: 'Μικροί Εξερευνητές', memberAcc: 'μικρό εξερευνητή', newMember: 'Νέος μικρός εξερευνητής',
    unit: 'Εξάδα', units: 'Εξάδες', unitAcc: 'εξάδα', unitGen: 'εξάδας', winner: 'Νικήτρια εξάδα', newUnit: 'Νέα εξάδα', whichMember: 'Ποιος μικρός εξερευνητής;'
  }
}
const EL_NEUTRAL: SectorWords = {
  member: 'Μέλος', members: 'Μέλη', memberAcc: 'μέλος', newMember: 'Νέο μέλος',
  unit: 'Μονάδα', units: 'Μονάδες', unitAcc: 'μονάδα', unitGen: 'μονάδας', winner: 'Νικήτρια μονάδα', newUnit: 'Νέα μονάδα', whichMember: 'Ποιο μέλος;'
}

const EN: Record<string, SectorWords> = {
  'omada': {
    member: 'Scout', members: 'Scouts', memberAcc: 'scout', newMember: 'New scout',
    unit: 'Patrol', units: 'Patrols', unitAcc: 'patrol', unitGen: 'patrol', winner: 'Winning patrol', newUnit: 'New patrol', whichMember: 'Which scout?'
  },
  'koinotita': {
    member: 'Venturer', members: 'Venturers', memberAcc: 'venturer', newMember: 'New venturer',
    unit: 'Club', units: 'Clubs', unitAcc: 'club', unitGen: 'club', winner: 'Winning club', newUnit: 'New club', whichMember: 'Which venturer?'
  },
  'ageli': {
    member: 'Cub', members: 'Cubs', memberAcc: 'cub', newMember: 'New cub',
    unit: 'Six', units: 'Sixes', unitAcc: 'six', unitGen: 'six', winner: 'Winning six', newUnit: 'New six', whichMember: 'Which cub?'
  },
  'mikri-ageli': {
    member: 'Little Explorer', members: 'Little Explorers', memberAcc: 'little explorer', newMember: 'New little explorer',
    unit: 'Six', units: 'Sixes', unitAcc: 'six', unitGen: 'six', winner: 'Winning six', newUnit: 'New six', whichMember: 'Which little explorer?'
  }
}
const EN_NEUTRAL: SectorWords = {
  member: 'Member', members: 'Members', memberAcc: 'member', newMember: 'New member',
  unit: 'Unit', units: 'Units', unitAcc: 'unit', unitGen: 'unit', winner: 'Winning unit', newUnit: 'New unit', whichMember: 'Which member?'
}

export function useSectorWords() {
  const me = useMe()
  const { locale } = useI18n()

  /** Words for one sector by slug; the neutral set when the slug is unknown. */
  const wordsFor = (slug: string | null | undefined): SectorWords => {
    const table = locale.value === 'en' ? EN : EL
    return (slug && table[slug]) || (locale.value === 'en' ? EN_NEUTRAL : EL_NEUTRAL)
  }

  /** The signed-in person's own sector — a member's section, or the single
      sector a Βαθμοφόρος covers. Neutral when they cover several or all. */
  const mySlug = computed<string | null>(() => {
    if (!me.value) return null
    if (me.value.role === 'scout') return me.value.section?.slug ?? null
    const scopes = me.value.scopeSections
    if (scopes == null) return null
    const slugs = [...new Set((scopes as any[]).map(x => x.slug))]
    // both Αγέλες share their unit word, but not their children's — only a
    // single sector gets a specific vocabulary
    return slugs.length === 1 ? slugs[0] : null
  })
  const words = computed(() => wordsFor(mySlug.value))

  return { words, wordsFor, mySlug }
}
