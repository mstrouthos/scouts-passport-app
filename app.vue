<script setup lang="ts">
const { locale } = useI18n()
/* Three installed apps on one site, each with its own manifest: the members'
   app, the bar, and the families' page — so each installs as an app of its
   own (not a browser shortcut), opens where it should, and gets its own
   notifications. */
const route = useRoute()
const manifest = computed(() => route.path.startsWith('/bar') ? '/bar.webmanifest'
  : route.path.startsWith('/family') ? '/family.webmanifest' : '/manifest.webmanifest')
useHead({ htmlAttrs: { lang: locale }, link: [{ rel: 'manifest', href: manifest, key: 'manifest' }] })
</script>

<template>
  <NuxtPage />
</template>
