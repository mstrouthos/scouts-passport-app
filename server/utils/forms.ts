import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { normalizeSpec, type FormSpec } from '../../utils/formSpec'
import { now } from './passcode'

export type FormRow = typeof s.forms.$inferSelect

export function specOf(row: { spec: string }): FormSpec {
  try { return normalizeSpec(JSON.parse(row.spec || '{}')) } catch { return normalizeSpec({}) }
}

/** Taking answers: switched on, and not past its closing time. */
export function isAccepting(f: FormRow) {
  return f.isOpen && (!f.closesAt || new Date(f.closesAt).getTime() > Date.now())
}

export async function formById(id: number) {
  const db = await useDb()
  const f = (await db.select().from(s.forms).where(eq(s.forms.id, id)).limit(1))[0]
  if (!f) throw createError({ statusCode: 404, message: 'Not found' })
  return f
}

/** Who looked at which responses, and when — kept, never shown to the sender. */
export async function logAccess(formId: number, scoutId: number, action: string, responseId: number | null = null) {
  const db = await useDb()
  await db.insert(s.formAccessLog).values({ formId, responseId, scoutId, action, at: now() })
}
