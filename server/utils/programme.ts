import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { sectionOfWith } from './guard'

/** Which section a member belongs to, by slug.

   Programmes are not shared between sectors: Πτυχία and the Προσκοπικές
   Απαιτήσεις belong to the Ομάδα Προσκόπων, the Η.Κ.Α.Δ.Ε. to the Κοινότητα
   Ανιχνευτών, and neither to the Αγέλες. Every endpoint that serves one of
   them checks here rather than assuming. */
export async function sectionSlugOf(scoutId: number): Promise<string | null> {
  const db = await useDb()
  const kid = (await db.select().from(s.scouts).where(eq(s.scouts.id, scoutId)).limit(1))[0]
  if (!kid) return null
  const sectionId = sectionOfWith(kid as any, await db.select().from(s.patrols))
  return (await db.select().from(s.sections)).find(x => x.id === sectionId)?.slug ?? null
}

/** Πτυχία and the Προσκοπικές Απαιτήσεις are the Ομάδα's programme. */
export async function isScoutTroop(scoutId: number): Promise<boolean> {
  return (await sectionSlugOf(scoutId)) === 'omada'
}

/** The Η.Κ.Α.Δ.Ε. is the Κοινότητα's. */
export async function isVentureSection(scoutId: number): Promise<boolean> {
  return (await sectionSlugOf(scoutId)) === 'koinotita'
}
