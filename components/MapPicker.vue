<script setup lang="ts">
/* Choosing a place for an info page: tap the map to drop the pin (then drag it
   to fine-tune), or search for the place, or use where you are standing.
   Search uses OpenStreetMap's data, through Photon and Nominatim. */
const emit = defineEmits<{ (e: 'pick', v: { lat: number, lng: number, label: string }): void, (e: 'close'): void }>()
const { t } = useI18n()
const { show } = useToast()
const el = ref<HTMLElement | null>(null)
const label = ref('')
const query = ref('')
const results = ref<Hit[]>([])
const searching = ref(false)
const point = ref<{ lat: number, lng: number } | null>(null)
let L: any = null, map: any = null, marker: any = null

onMounted(async () => {
  L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')
  if (!el.value) return
  map = L.map(el.value).setView([35.0, 33.2], 8)   // all of Cyprus to start
  map.attributionControl.setPrefix(false)
  L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_CREDIT }).addTo(map)
  map.on('click', (e: any) => place(e.latlng.lat, e.latlng.lng))
})
onBeforeUnmount(() => { map?.remove(); map = null })

function place(lat: number, lng: number, zoom?: number) {
  point.value = { lat, lng }
  if (marker) marker.setLatLng([lat, lng])
  else {
    marker = L.marker([lat, lng], { icon: pinIcon(L), draggable: true }).addTo(map)
    marker.on('dragend', () => { const p = marker.getLatLng(); point.value = { lat: p.lat, lng: p.lng } })
  }
  if (zoom) map.setView([lat, lng], zoom)
}
/* Search: Photon, which finds streets, ports and villages from loose wording in
   Greek or Latin letters, alongside OpenStreetMap's own search, which knows
   official place names. Cyprus is searched first; a phrase with description
   words the maps do not know ("Κατασκήνωση Τροόδους") finds nothing, so then
   each word is tried, and only after that the rest of the world. */
type Hit = { lat: number, lng: number, name: string, detail: string, cy: boolean }
const CYPRUS = { photon: '32.2,34.5,34.7,35.8', nominatim: '32.2,35.8,34.7,34.5' }
async function lookup(q: string, inCyprus: boolean, alsoNominatim = true): Promise<Hit[]> {
  // Photon first — it is quick and forgiving; the other only when it finds
  // nothing, and neither is waited on for long
  const photon = await $fetch<any>('https://photon.komoot.io/api/', {
    // it can take several seconds; cut short, a good answer is lost
    query: { q, limit: 8, lat: 35.0, lon: 33.3, ...(inCyprus ? { bbox: CYPRUS.photon } : {}) }, timeout: 12000
  }).catch(() => null)
  const nomi = photon?.features?.length || !alsoNominatim ? [] : await $fetch<any[]>('https://nominatim.openstreetmap.org/search', {
    query: { format: 'json', limit: 5, 'accept-language': 'el', q, ...(inCyprus ? { viewbox: CYPRUS.nominatim, bounded: 1 } : {}) }, timeout: 8000
  }).catch(() => [])
  const hits: Hit[] = []
  for (const f of photon?.features || []) {
    const p = f.properties || {}, [lng, lat] = f.geometry?.coordinates || []
    if (lat == null) continue
    const street = [p.street, p.housenumber].filter(Boolean).join(' ')
    hits.push({ lat, lng, name: p.name || street || p.city || q,
      detail: [p.name ? street : null, p.city || p.county, p.country].filter(Boolean).join(', '),
      cy: /Κύπρος|Cyprus|Kıbrıs/.test(p.country || '') })
  }
  for (const r of nomi || []) {
    const parts = String(r.display_name).split(', ')
    hits.push({ lat: Number(r.lat), lng: Number(r.lon), name: parts[0], detail: parts.slice(1).join(', '),
      cy: /Κύπρος|Cyprus/.test(r.display_name) })
  }
  // one row per place, Cyprus first
  const seen = new Set<string>()
  return hits.filter(h => { const k = `${h.lat.toFixed(3)},${h.lng.toFixed(3)}`; if (seen.has(k)) return false; seen.add(k); return true })
    .sort((x, y) => Number(y.cy) - Number(x.cy))
}
/* only the latest search may show its results: an earlier, slower one must
   not arrive afterwards and replace them */
let searchSeq = 0
async function search() {
  const q = query.value.trim()
  if (!q) return
  const mine = ++searchSeq
  searching.value = true
  results.value = []
  try {
    // in Cyprus: the whole phrase, then its words (a place name among
    // description words); only then anywhere
    const words = q.split(/\s+/).filter(w => w.length > 2)
    // the official-names search rarely matches a phrase: only for one word here
    let found = await lookup(q, true, words.length <= 1)
    if (!found.length && words.length > 1) {
      // the words together, in parallel, on the quick search only
      found = (await Promise.all(words.slice(0, 4).map(w => lookup(w, true, false)))).flat()
    }
    if (!found.length && mine === searchSeq) found = await lookup(q, false)
    if (mine !== searchSeq) return
    const seen = new Set<string>()
    results.value = found.filter(h => { const k = `${h.lat.toFixed(3)},${h.lng.toFixed(3)}`; if (seen.has(k)) return false; seen.add(k); return true }).slice(0, 8)
    if (!found.length) show(t('mapNoResults'))
  } catch { if (mine === searchSeq) show(t('error')) }
  finally { if (mine === searchSeq) searching.value = false }
}
function choose(r: Hit) {
  place(r.lat, r.lng, 16)
  if (!label.value) label.value = r.name
  results.value = []
}
function here() {
  if (!navigator.geolocation) return show(t('error'))
  navigator.geolocation.getCurrentPosition(
    p => place(p.coords.latitude, p.coords.longitude, 17),
    () => show(t('mapNoLocation')), { enableHighAccuracy: true, timeout: 10000 })
}
</script>

<template>
  <Teleport to="body">
    <div class="sheet-backdrop" @click.self="emit('close')">
      <div class="sheet" style="display:flex;flex-direction:column;gap:10px;max-height:92dvh;overflow:auto">
        <h3 style="margin:0;font-size:17px;text-align:center">📍 {{ t('addLocation') }}</h3>
        <!-- a form, so a phone keyboard's Go / Search key searches too -->
        <form style="display:flex;gap:7px" @submit.prevent="search">
          <input v-model="query" type="search" enterkeyhint="search" class="in" style="flex:1" :placeholder="t('mapSearch')">
          <button type="submit" class="chip" style="flex:none" :disabled="searching">{{ searching ? '…' : '🔍' }}</button>
        </form>
        <div v-if="results.length" class="adm">
          <button v-for="(r, i) in results" :key="i" class="it" @click="choose(r)">
            <div style="flex:1;min-width:0"><b>{{ r.name }}</b><span>{{ r.detail }}</span></div>
          </button>
        </div>
        <div ref="el" class="picker" />
        <div class="tiny muted">{{ t('mapTapHint') }}</div>
        <button class="chip" style="align-self:flex-start" @click="here">🎯 {{ t('mapMyLocation') }}</button>
        <div><label class="lab">{{ t('mapLabel') }}</label><input v-model="label" class="in" :placeholder="t('mapLabelPh')"></div>
        <button class="btn" :disabled="!point" @click="point && emit('pick', { ...point, label })">{{ t('mapInsert') }}</button>
        <button class="btn ghost" @click="emit('close')">{{ t('close') }}</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.picker{height:300px; border-radius:14px; overflow:hidden; z-index:0}
</style>
