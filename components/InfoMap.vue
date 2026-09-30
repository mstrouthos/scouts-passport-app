<script setup lang="ts">
/* A place in an info page: an embedded Google map with its pin — the map
   everyone knows, to zoom and look around — its name, and the way there in
   the reader's own maps app. The embed needs no key. */
const props = defineProps<{ lat: number, lng: number, label?: string }>()
const { t, locale } = useI18n()
const src = computed(() =>
  `https://maps.google.com/maps?q=${props.lat},${props.lng}&z=16&hl=${locale.value}&output=embed`)
/* Apple's maps on an iPhone, Google's everywhere else */
const isApple = typeof navigator !== 'undefined' && /iPhone|iPad|Macintosh/.test(navigator.userAgent)
const directions = computed(() => isApple
  ? `https://maps.apple.com/?daddr=${props.lat},${props.lng}`
  : `https://www.google.com/maps/dir/?api=1&destination=${props.lat},${props.lng}`)
</script>

<template>
  <figure class="imap">
    <iframe :src="src" :title="props.label || t('location')" loading="lazy"
            referrerpolicy="no-referrer-when-downgrade" allowfullscreen />
    <figcaption>
      <b>📍 {{ props.label || t('location') }}</b>
      <a class="chip go" :href="directions" target="_blank" rel="noopener">🧭 {{ t('directions') }}</a>
    </figcaption>
  </figure>
</template>

<style scoped>
.imap{margin:0; border-radius:16px; overflow:hidden; background:var(--card); box-shadow:var(--shadow-sm)}
iframe{display:block; width:100%; height:220px; border:0}
figcaption{display:flex; align-items:center; gap:10px; padding:10px 12px}
figcaption b{flex:1; min-width:0; font-size:13px; line-height:1.35}
.go{flex:none; text-decoration:none}
</style>
