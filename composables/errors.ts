/* What a person is told when something fails.

   A refusal they can act on — a missing answer, a file that is not a photo,
   a closed form (any 4xx with a message) — is told as it is. Anything else —
   a server failure, a crash, a lost connection — is never shown as it is:
   the "Κάτι πήγε στραβά!" sheet opens instead, with a button to send a
   report. The error itself has already gone to Discord: the server reports
   its own failures, and a failure on the device is sent from here.

   errMsg(e) returns the text to show where a message is expected — the
   refusal, or nothing, as the sheet says it all. */

/** An error the app throws on purpose, worded for the person reading it. */
export function friendlyError(message: string) {
  return Object.assign(new Error(message), { friendly: true })
}

export function useErrorSheet() {
  return useState<boolean>('error-sheet', () => false)
}

export function errMsg(e: any): string {
  if (e?.friendly && e?.message) return String(e.message)
  const status = Number(e?.statusCode ?? e?.status ?? e?.response?.status) || 0
  const message = e?.data?.message
  if (status >= 400 && status < 500 && message) return String(message)
  // unexpected: say nothing specific, open the sheet, and make sure it is known
  if (import.meta.client) {
    useErrorSheet().value = true
    const isRequest = e?.name === 'FetchError' || !!e?.response || status > 0
    if (!isRequest) reportOnDevice(e, 'caught')
  }
  return ''
}

/** A failure on the device, sent to the server for Discord. */
export function reportOnDevice(err: any, source: string) {
  try {
    fetch('/api/client-error', {
      method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ message: String(err?.message || err || ''), stack: String(err?.stack || '').slice(0, 3000), name: err?.name, source, page: location.pathname })
    }).catch(() => {})
  } catch {}
}
