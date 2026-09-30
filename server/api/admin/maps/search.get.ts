import { requireLeader } from '../../../utils/guard'

/** Text search for a place, through Google Maps — when the server has a key
    (NUXT_GOOGLE_MAPS_KEY, with the Places API enabled). Without one it says
    so, and the page searches OpenStreetMap instead. Cyprus comes first. */
export default defineEventHandler(async (event) => {
  await requireLeader(event)
  const key = useRuntimeConfig().googleMapsKey
  const q = String(getQuery(event).q || '').trim()
  if (!key) return { google: false }
  if (!q) return { google: true, results: [] }
  const res = await $fetch<any>('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location' },
    body: {
      textQuery: q, languageCode: 'el', regionCode: 'CY', maxResultCount: 8,
      locationBias: { rectangle: { low: { latitude: 34.5, longitude: 32.2 }, high: { latitude: 35.8, longitude: 34.7 } } }
    }
  }).catch((err: any) => { console.warn('[maps] Google search failed', err?.data?.error?.message || err?.message); return null })
  if (!res) return { google: false }
  return {
    google: true,
    results: (res.places || []).map((p: any) => ({
      lat: p.location?.latitude, lng: p.location?.longitude,
      name: p.displayName?.text || q, detail: p.formattedAddress || '', cy: /Κύπρος|Cyprus/.test(p.formattedAddress || '')
    })).filter((p: any) => p.lat != null)
  }
})
