<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const { data } = await useFetch('/api/admin/badges')
</script>

<template>
  <AppShell :title="t('badges')" back="/admin/more">
    <div class="adm">
      <div class="hdr">{{ t('badges') }} · {{ data?.length || 0 }}</div>
      <NuxtLink v-for="b in data" :key="b.id" :to="`/admin/badges/${b.id}`" class="it">
        <div style="font-size:20px;width:26px;text-align:center">{{ b.icon }}</div>
        <div style="flex:1"><b>{{ lx(b) }}</b><span>{{ t('awardedTo') }} {{ b.awarded }}/{{ b.total }}</span></div>
        <span class="chev">›</span>
      </NuxtLink>
    </div>
  </AppShell>
</template>
