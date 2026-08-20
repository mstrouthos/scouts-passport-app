const CY_PHONE = /^\+357\d{8}$/

/** Cyprus-only phone numbers: +357 followed by exactly 8 digits. Empty/absent
    is fine (phone is always optional) — anything non-empty must be valid. */
export function normalizePhone(input?: string | null): string | null {
  const v = String(input ?? '').trim()
  if (!v) return null
  if (!CY_PHONE.test(v)) throw createError({ statusCode: 400, message: 'Phone must be a Cyprus number: +357 followed by 8 digits' })
  return v
}
