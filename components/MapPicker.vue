<script setup lang="ts">
/* Choosing a place for an info page: tap the map to drop the pin (then drag it
   to fine-tune), or search for the place, or use where you are standing.
   Search is OpenStreetMap's own (Nominatim). */
const emit = defineEmits<{ (e: 'pick', v: { lat: number, lng: number, label: string }): void, (e: 'close'): void }>()
const { t } = useI18n()
const { show } = useToast()
const el = ref<HTMLElement | null>(null)
const label = ref('')
const query = ref('')
const results = ref<any[]>([])
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
async function search() {
  const q = query.value.trim()
  if (!q) return
  searching.value = true
  try {
    results.value = await $fetch<any[]>('https://nominatim.openstreetmap.org/search', {
      query: { format: 'json', limit: 6, 'accept-language': 'el', q }
    })
    if (!results.value.length) show(t('mapNoResults'))
  } catch { show(t('error')) }
  finally { searching.value = false }
}
function choose(r: any) {
  place(Number(r.lat), Number(r.lon), 16)
  if (!label.value) label.value = String(r.display_name).split(',')[0]
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
        <div style="display:flex;gap:7px">
          <input v-model="query" class="in" style="flex:1" :placeholder="t('mapSearch')" @keyup.enter="search">
          <button class="chip" style="flex:none" :disabled="searching" @click="search">{{ searching ? '…' : '🔍' }}</button>
        </div>
        <div v-if="results.length" class="adm">
          <button v-for="r in results" :key="r.place_id" class="it" @click="choose(r)">
            <div style="flex:1;min-width:0"><b>{{ String(r.display_name).split(',')[0] }}</b><span>{{ r.display_name }}</span></div>
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
