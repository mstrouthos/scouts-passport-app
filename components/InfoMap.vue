<script setup lang="ts">
/* A place in an info page: a small map with its pin, its name, and the way
   there in the reader's own maps app. OpenStreetMap: free, no account. */
const props = defineProps<{ lat: number, lng: number, label?: string }>()
const { t } = useI18n()
const el = ref<HTMLElement | null>(null)
let map: any = null
onMounted(async () => {
  const L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')
  if (!el.value) return
  // a still picture you can pan, not a trap for the thumb scrolling the page
  map = L.map(el.value, { zoomControl: false, scrollWheelZoom: false, dragging: !L.Browser.mobile, touchZoom: true })
    .setView([props.lat, props.lng], 15)
  map.attributionControl.setPrefix(false)
  L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_CREDIT }).addTo(map)
  L.marker([props.lat, props.lng], { icon: pinIcon(L), keyboard: false }).addTo(map)
})
onBeforeUnmount(() => { map?.remove(); map = null })
/* Apple's maps on an iPhone, Google's everywhere else */
const isApple = typeof navigator !== 'undefined' && /iPhone|iPad|Macintosh/.test(navigator.userAgent)
const directions = computed(() => isApple
  ? `https://maps.apple.com/?daddr=${props.lat},${props.lng}`
  : `https://www.google.com/maps/dir/?api=1&destination=${props.lat},${props.lng}`)
</script>

<template>
  <figure class="imap">
    <div ref="el" class="canvas" role="img" :aria-label="props.label || t('location')" />
    <figcaption>
      <b>📍 {{ props.label || t('location') }}</b>
      <a class="chip go" :href="directions" target="_blank" rel="noopener">🧭 {{ t('directions') }}</a>
    </figcaption>
  </figure>
</template>

<style scoped>
.imap{margin:0; border-radius:16px; overflow:hidden; background:var(--card); box-shadow:var(--shadow-sm)}
.canvas{height:190px; z-index:0}
figcaption{display:flex; align-items:center; gap:10px; padding:10px 12px}
figcaption b{flex:1; min-width:0; font-size:13px; line-height:1.35}
.go{flex:none; text-decoration:none}
</style>
