import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { storeFile } from '../../../utils/storage'
import { now } from '../../../utils/passcode'

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX = 5 * 1024 * 1024   // the phone shrinks it first; this is only a guard

/** A picture for an info page. Stored like any other file; the page's text
    refers to it by its link, ![caption](/api/info-image/<id>). */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ name?: string, mime?: string, dataBase64?: string }>(event)
  const mime = String(b?.mime || '')
  if (!TYPES.has(mime)) throw createError({ statusCode: 400, message: 'Μόνο εικόνες (JPG, PNG, WebP, GIF)' })
  const buf = Buffer.from(String(b?.dataBase64 || ''), 'base64')
  if (!buf.length) throw createError({ statusCode: 400, message: 'Άδειο αρχείο' })
  if (buf.length > MAX) throw createError({ statusCode: 400, message: 'Η εικόνα είναι μεγαλύτερη από 5 MB' })
  const name = String(b?.name || 'image.jpg').replace(/\.[^.]+$/, '').slice(0, 100) + (mime === 'image/jpeg' ? '.jpg' : '')
  const db = await useDb()
  const [f] = await db.insert(s.files).values({
    name, mime, size: buf.length, data: await storeFile(buf, mime, name), uploadedBy: me.id, createdAt: now()
  }).returning()
  return { id: f.id, url: `/api/info-image/${f.id}` }
})
