<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const { data } = await useFetch('/api/info')
</script>

<template>
  <AppShell :title="t('info')" :sub="t('infoSub')">
    <NuxtLink v-for="p in data" :key="p.slug" :to="`/app/info/${p.slug}`" class="srow">
      <div class="ico">{{ p.icon }}</div>
      <div class="txt"><b>{{ lx(p) }}<span v-if="!p.isPublished" class="draft">🧪 {{ t('draftTest') }}</span></b><span>{{ lx(p, 'summary') }}</span></div>
      <span class="chev">›</span>
    </NuxtLink>
  </AppShell>
</template>

<style scoped>
.draft{display:inline-block; margin-left:6px; padding:1px 7px; border-radius:999px; background:#FFE9B8; color:#8A5A00; font-size:10.5px; font-weight:800; vertical-align:middle}
</style>
