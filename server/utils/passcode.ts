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
