import { eq, inArray } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { useDb, schema as s } from '../db'
import { storeFile, readStored, deleteStored } from './storage'
import { sealBytes, unsealBytes } from './seal'
import { now } from './passcode'

export type FormFile = typeof s.formFiles.$inferSelect

/** Keep a file that belongs to a form: encrypted, then into the bucket (or
    the row, with no bucket set). */
export async function saveFormFile(f: {
  formId: number, kind: 'upload' | 'export', name: string, mime: string, buf: Buffer,
  questionId?: string | null, responseId?: number | null, ipHash?: string | null, createdBy?: number | null
}): Promise<FormFile> {
  const db = await useDb()
  const data = await storeFile(sealBytes(f.buf), 'application/octet-stream', f.name, `forms/${f.formId}/${f.kind}s`)
  const [row] = await db.insert(s.formFiles).values({
    formId: f.formId, kind: f.kind, name: f.name, mime: f.mime, size: f.buf.length, data,
    questionId: f.questionId ?? null, responseId: f.responseId ?? null,
    token: f.kind === 'upload' && !f.responseId ? randomBytes(16).toString('hex') : null,
    ipHash: f.ipHash ?? null, createdBy: f.createdBy ?? null, createdAt: now()
  }).returning()
  return row
}

/** The file's bytes, decrypted. */
export async function openFormFile(row: FormFile): Promise<Buffer> {
  return unsealBytes(await readStored(row.data))
}

export async function deleteFormFiles(rows: FormFile[]) {
  if (!rows.length) return
  const db = await useDb()
  for (const r of rows) await deleteStored(r.data)
  await db.delete(s.formFiles).where(inArray(s.formFiles.id, rows.map(r => r.id)))
}

/** A response's uploads, by the value its answers hold for them ("f:<id>"). */
export async function filesOfResponse(responseId: number): Promise<Record<string, FormFile>> {
  const db = await useDb()
  const rows = await db.select().from(s.formFiles).where(eq(s.formFiles.responseId, responseId))
  return Object.fromEntries(rows.filter(r => r.kind === 'upload').map(r => [`f:${r.id}`, r]))
}

/** How a download names itself, Greek and all. */
export function disposition(name: string, download: boolean) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '')
  return `${download ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`
}
