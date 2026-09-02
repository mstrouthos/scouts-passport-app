import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, scopedSectionIds, idParam } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { assertCan } from '../../../utils/permissions'

const MAX_PDF = 8 * 1024 * 1024

/** Edit a parents' notice: title, text, sector, and the attached PDF —
    replaced, kept, or removed. Editing does not notify again; the families
    were told when it went out. Body: { sectionId?, titleEl?, bodyEl?,
    file?: { name, mime, dataBase64 } | null } — file null removes it,
    file absent keeps it. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'parents.view')
  const id = idParam(event)
  const db = (await useDb())
  const post = (await db.select().from(s.parentPosts).where(eq(s.parentPosts.id, id)).limit(1))[0]
  if (!post) throw createError({ statusCode: 404, message: 'Not found' })
  const secIds = await scopedSectionIds(me)
  const inScope = (sid: number | null) => secIds === null || (sid != null && secIds.includes(sid))
  if (!inScope(post.sectionId)) throw createError({ statusCode: 403, message: 'Out of your sector' })

  const b = await readBody<any>(event)
  const set: any = {}
  if (b?.titleEl !== undefined) {
    const v = String(b.titleEl || '').trim()
    if (!v) throw createError({ statusCode: 400, message: 'Title required' })
    set.titleEl = v
  }
  if (b?.bodyEl !== undefined) set.bodyEl = String(b.bodyEl || '').trim()
  if (b?.sectionId !== undefined) {
    const sid: number | null = b.sectionId == null ? null : Number(b.sectionId)
    if (sid != null && !(await db.select().from(s.sections)).some(x => x.id === sid))
      throw createError({ statusCode: 400, message: 'Bad section' })
    // a sector leader may move it between their own sectors, never to the whole troop
    if (!inScope(sid)) throw createError({ statusCode: 403, message: 'Out of your sector' })
    set.sectionId = sid
  }

  let dropFile: number | null = null
  if (b?.file === null) {
    dropFile = post.fileId; set.fileId = null
  } else if (b?.file?.dataBase64) {
    const mime = String(b.file.mime || '')
    if (mime !== 'application/pdf') throw createError({ statusCode: 400, message: 'Only PDF files are accepted' })
    const data = String(b.file.dataBase64)
    const size = Math.floor(data.length * 3 / 4)
    if (size > MAX_PDF) throw createError({ statusCode: 400, message: 'PDF is larger than 8 MB' })
    const [f] = (await db.insert(s.files).values({
      name: String(b.file.name || 'announcement.pdf').slice(0, 120),
      mime, size, data, uploadedBy: me.id, createdAt: now()
    }).returning())
    dropFile = post.fileId; set.fileId = f.id
  }

  const bodyAfter = set.bodyEl ?? post.bodyEl
  const fileAfter = set.fileId === undefined ? post.fileId : set.fileId
  if (!bodyAfter && fileAfter == null)
    throw createError({ statusCode: 400, message: 'Add some text or attach a PDF' })

  if (Object.keys(set).length) await db.update(s.parentPosts).set(set).where(eq(s.parentPosts.id, id))
  if (dropFile != null) await db.delete(s.files).where(eq(s.files.id, dropFile))
  return { ok: true }
})
