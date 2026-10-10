import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { shortName } from '../../utils/shortName'

/** Who did it, for a Βαθμοφόρος to read: the Αρχηγός Συστήματος as such
    (the one who holds the office), any other administrator by name. Null when
    it is not known (done before it was kept). */
export async function byWhom(id: number | null | undefined): Promise<{ chief: boolean, name: string } | null> {
  if (!id) return null
  const db = await useDb()
  const p = (await db.select().from(s.scouts).where(eq(s.scouts.id, id)).limit(1))[0]
  return p ? { chief: !!p.isChief, name: shortName(p) } : null
}
/** The same, in Greek, at the start of a sentence: «Ο Αρχηγός» or the name. */
export const byWhomEl = (b: { chief: boolean, name: string } | null) => !b ? 'Ένας διαχειριστής' : b.chief ? 'Ο Αρχηγός' : b.name
