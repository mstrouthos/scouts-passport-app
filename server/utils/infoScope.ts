import { useDb, schema as s } from '../db'

type Page = typeof s.infoPages.$inferSelect

/** Pick the page a reader in `sectionId` should see for each slug.

   A section's own page wins over the troop-wide one, so "Στολές" can say
   something different in the Αγέλη than in the Ομάδα while everything nobody
   needs to vary — the promise, the history — is written once for everyone. */
export function pagesForSection(all: Page[], sectionId: number | null): Page[] {
  const best = new Map<string, Page>()
  for (const p of all) {
    if (p.sectionId != null && p.sectionId !== sectionId) continue
    const current = best.get(p.slug)
    // a section-specific page beats the troop-wide fallback
    if (!current || (p.sectionId != null && current.sectionId == null)) best.set(p.slug, p)
  }
  return [...best.values()].sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function allInfoPages(): Promise<Page[]> {
  return (await useDb()).select().from(s.infoPages)
}
