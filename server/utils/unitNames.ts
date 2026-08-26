/** What a section calls its sub-unit and the member who heads it.

   These are not interchangeable words: the Ομάδα has ενωμοτίες led by an
   Ενωμοτάρχης, the Κοινότητα has ομίλους led by an Ομιλάρχης, and both Αγέλες
   have εξάδες led by an Εξαδάρχης. The head is a member of the unit — a
   scout — not a Βαθμοφόρος. */
export type UnitNames = {
  unitEl: string, unitsEl: string,
  headEl: string, deputyEl: string,
  unitEn: string, headEn: string
}

const BY_SLUG: Record<string, UnitNames> = {
  'omada': {
    unitEl: 'Ενωμοτία', unitsEl: 'Ενωμοτίες',
    headEl: 'Ενωμοτάρχης', deputyEl: 'Υπενωμοτάρχης',
    unitEn: 'Patrol', headEn: 'Patrol Leader'
  },
  'koinotita': {
    unitEl: 'Όμιλος', unitsEl: 'Όμιλοι',
    headEl: 'Ομιλάρχης', deputyEl: 'Υπομιλάρχης',
    unitEn: 'Club', headEn: 'Club Leader'
  },
  'ageli': {
    unitEl: 'Εξάδα', unitsEl: 'Εξάδες',
    headEl: 'Εξαδάρχης', deputyEl: 'Υπεξαδάρχης',
    unitEn: 'Six', headEn: 'Sixer'
  },
  'mikri-ageli': {
    unitEl: 'Εξάδα', unitsEl: 'Εξάδες',
    headEl: 'Εξαδάρχης', deputyEl: 'Υπεξαδάρχης',
    unitEn: 'Six', headEn: 'Sixer'
  }
}

const FALLBACK: UnitNames = {
  unitEl: 'Ομάδα', unitsEl: 'Ομάδες',
  headEl: 'Αρχηγός', deputyEl: 'Υπαρχηγός',
  unitEn: 'Team', headEn: 'Team Leader'
}

export function unitNames(sectionSlug: string | null | undefined): UnitNames {
  return (sectionSlug && BY_SLUG[sectionSlug]) || FALLBACK
}
