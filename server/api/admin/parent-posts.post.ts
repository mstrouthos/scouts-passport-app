import { useDb, schema as s } from '../../db'
import { requireLeader, scopedSectionIds } from '../../utils/guard'
import { now } from '../../utils/passcode'
import { assertCan } from '../../utils/permissions'
import { parentsOfSections } from '../../utils/parents'
import { sendPushToParentIds, sendPushToParents } from '../../utils/push'

const MAX_PDF = 8 * 1024 * 1024   // 8 MB — plenty for a scanned announcement

/** Create a parents' announcement: text, an attached PDF, or both.
    Body: { sectionId, titleEl, bodyEl, file?: { name, mime, dataBase64 } } */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'parents.view')
  const b = await readBody<any>(event)
  const titleEl = String(b?.titleEl || '').trim()
  if (!titleEl) throw createError({ statusCode: 400, message: 'Title required' })
  const bodyEl = String(b?.bodyEl || '').trim()

  const db = (await useDb())
  const secIds = await scopedSectionIds(me)
  let sectionId: number | null = b?.sectionId != null ? Number(b.sectionId) : null
  if (sectionId != null && !(await db.select().from(s.sections)).some(x => x.id === sectionId))
    throw createError({ statusCode: 400, message: 'Bad section' })
  if (secIds !== null) {
    if (sectionId === null || !secIds.includes(sectionId)) sectionId = secIds[0] ?? null
    if (sectionId === null) throw createError({ statusCode: 403, message: 'No sector assigned' })
  }

  let fileId: number | null = null
  if (b?.file?.dataBase64) {
    const mime = String(b.file.mime || '')
    if (mime !== 'application/pdf')
      throw createError({ statusCode: 400, message: 'Only PDF files are accepted' })
    const data = String(b.file.dataBase64)
    const size = Math.floor(data.length * 3 / 4)
    if (size > MAX_PDF) throw createError({ statusCode: 400, message: 'PDF is larger than 8 MB' })
    const [f] = (await db.insert(s.files).values({
      name: String(b.file.name || 'announcement.pdf').slice(0, 120),
      mime, size, data, uploadedBy: me.id, createdAt: now()
    }).returning())
    fileId = f.id
  }
  if (!bodyEl && !fileId)
    throw createError({ statusCode: 400, message: 'Add some text or attach a PDF' })

  const [row] = (await db.insert(s.parentPosts).values({
    sectionId, titleEl, bodyEl, fileId, isPublished: b?.isPublished !== false,
    createdBy: me.id, createdAt: now()
  }).returning())

  // A notice nobody is told about is a notice nobody reads. Families who have
  // signed in are reached by name; a browser that only ever subscribed to the
  // sector, before codes existed, still hears through the sector.
  let pushed = 0
  if (row.isPublished) {
    try {
      const secs = sectionId == null ? null : [sectionId]
      const msg = { title: 'Πύλη Προσκόπων', body: `📣 ${titleEl}`, kind: 'parentPost', refId: row.id }
      pushed = await sendPushToParentIds((await parentsOfSections(secs)).map(p => p.id), msg)
        + await sendPushToParents(secs, msg)
    } catch (err) { console.error('[parent-post] push failed', err) }
  }
  return { id: row.id, pushed }
})
