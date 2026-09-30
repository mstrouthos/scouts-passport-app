/* Loading Google's Maps JavaScript API once, with the app's key. Google calls
   window.gm_authFailure when it refuses the key — the Maps JavaScript API not
   enabled, or the key locked to other addresses — which is passed on as a
   window event, so a page can fall back instead of showing a broken map. */
let loading: Promise<any> | null = null
let refused = false

export function loadGoogleMaps(key: string): Promise<any> {
  const w = window as any
  if (refused) return Promise.reject(new Error('refused'))
  if (w.google?.maps?.Map) return Promise.resolve(w.google)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const cb = `__gmReady${Date.now()}`
    w[cb] = () => resolve(w.google)
    w.gm_authFailure = () => { refused = true; window.dispatchEvent(new Event('gm-refused')) }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=places&language=el&region=CY&loading=async&callback=${cb}`
    s.async = true
    s.onerror = () => { loading = null; reject(new Error('load')) }
    document.head.appendChild(s)
  })
  return loading
}
