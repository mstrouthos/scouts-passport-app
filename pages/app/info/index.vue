<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const { data } = await useFetch('/api/info')
</script>

<template>
  <AppShell :title="t('info')" :sub="t('infoSub')">
    <NuxtLink v-for="p in data" :key="p.slug" :to="`/app/info/${p.slug}`" class="srow">
      <div class="ico">{{ p.icon }}</div>
      <div class="txt"><b>{{ lx(p) }}</b><span>{{ lx(p, 'summary') }}</span></div>
      <span class="chev">›</span>
    </NuxtLink>
  </AppShell>
</template>
