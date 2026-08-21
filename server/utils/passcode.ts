import { createHmac, randomInt } from 'node:crypto'

/** Deterministic keyed hash of a passcode — indexable, pepper never leaves the server. */
export function hmacPasscode(passcode: string): string {
  const pepper = useRuntimeConfig().passcodePepper
  const digits = passcode.replace(/\D/g, '')
  return createHmac('sha256', pepper).update(digits).digest('hex')
}

/** New 8-digit passcode formatted 0000-0000. First digit never 0 to avoid confusion. */
export function generatePasscode(): string {
  const a = randomInt(1000, 10000)
  const b = randomInt(0, 10000).toString().padStart(4, '0')
  return `${a}-${b}`
}

export function now(): string {
  return new Date().toISOString()
}

/** Short fingerprint of the passcode currently on file. Stored in the session
    so that rotating a passcode invalidates sessions issued against the old one
    — the "signed in until logout or a password reset" behaviour. */
export function passcodeVersion(passcodeHmac: string): string {
  return passcodeHmac.slice(0, 16)
}

/** Compare two stored timestamps as real instants.

    Stored dates are ISO strings but not all in the same shape — an imported
    question may carry "…T10:00:00+03:00" while now() produces UTC "…Z".
    Comparing those as text is wrong by the size of the offset (and by a whole
    day around midnight), so always go through Date.parse. */
export function isAtOrBefore(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const x = Date.parse(a), y = Date.parse(b)
  if (Number.isNaN(x) || Number.isNaN(y)) return false
  return x <= y
}
export function isAfter(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const x = Date.parse(a), y = Date.parse(b)
  if (Number.isNaN(x) || Number.isNaN(y)) return false
  return x > y
}

/** Normalise any accepted date to UTC ISO, so what we store is uniform. */
export function toUtcIso(v: string | null | undefined): string | null {
  if (!v) return null
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
