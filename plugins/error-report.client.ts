/* Errors that happen on the device — in a screen, or a promise left to fail —
   are sent to the server, which tells Discord (server/api/client-error). A
   few per page at most, and never what someone typed: the message, where in
   the code, and which page (without its query). */
export default defineNuxtPlugin((nuxtApp) => {
  let sent = 0
  const report = (err: any, source: string) => {
    if (sent >= 5) return
    // a request the server refused or could not answer is the server's to report
    if (err?.name === 'FetchError' || err?.statusCode || err?.response) return
    const message = String(err?.message || err?.reason?.message || err || '')
    // a browser extension's noise, or a network that dropped, tells us nothing
    if (!message || /ResizeObserver loop|Script error\.?$|Load failed|NetworkError|Failed to fetch/i.test(message)) return
    // the browser's own code failing — Safari's video controls ("EmptyRanges",
    // syncControl@ handleEvent@): every frame without a file, so none of ours
    const frames = String(err?.stack || '').split('\n').map(f => f.trim()).filter(Boolean)
    if (frames.length && frames.every(f => /@$|@\[native code\]$/.test(f))) return
    sent++
    const body = { message, stack: String(err?.stack || '').slice(0, 3000), name: err?.name, source, page: location.pathname }
    try {
      fetch('/api/client-error', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {})
    } catch {}
  }
  nuxtApp.vueApp.config.errorHandler = (err, _instance, info) => { console.error(err); report(err, `vue: ${info}`) }
  nuxtApp.hook('app:error', err => report(err, 'app'))
  window.addEventListener('error', e => report(e.error || e.message, 'window'))
  window.addEventListener('unhandledrejection', e => report(e.reason, 'promise'))
})
