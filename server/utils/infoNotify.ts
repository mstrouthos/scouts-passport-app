import { useDb, schema as s } from '../db'
import { sendPushTo } from './push'
import { noteError } from './errorReport'

type Page = typeof s.infoPages.$inferSelect

/** A Βαθμοφόρος's page has been published by an administrator: tell its
    author. Sent once per page — approving and switching it to published in
    the same go does not tell them twice. */
export async function tellAuthorPublished(page: Page, by: { id: number, firstName: string, lastName: string }) {
  if (!page.createdBy || page.createdBy === by.id) return
  try {
    await sendPushTo([page.createdBy], {
      title: 'Πληροφορίες: δημοσιεύτηκε',
      body: `✅ «${page.titleEl}» εγκρίθηκε από ${by.firstName} ${by.lastName} και φαίνεται πια σε όλους.`,
      kind: 'infoPublished', refId: page.id
    })
  } catch (err) { noteError('Πληροφορίες — ειδοποίηση συντάκτη', err) }
}

/** Who administers: the ones told a page is waiting for approval. */
export async function administratorIds(): Promise<number[]> {
  const db = await useDb()
  return (await db.select().from(s.scouts)).filter(r => r.role === 'troop_leader' && r.isActive && !r.deletedAt).map(r => r.id)
}
