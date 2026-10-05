import { reportError } from '../utils/errorReport'

/* Every request that fails with a server error (5xx) is reported to Discord,
   unless the code that failed already reported it. Expected refusals — not
   signed in, not allowed, a form with a missing answer (4xx) — are not
   errors and stay out of it. So does anything that escapes a request: a
   promise left to fail on its own. */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', async (error: any, { event }) => {
    const status = error?.statusCode ?? error?.cause?.statusCode ?? 500
    if (status < 500 || error?.reported || error?.cause?.reported) return
    await reportError('Σφάλμα διακομιστή', error?.cause ?? error, {}, event as any)
  })
  process.on('unhandledRejection', (reason: any) => { reportError('Αδιαχείριστο σφάλμα (promise)', reason) })
})
