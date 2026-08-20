<script setup lang="ts">
const { t } = useI18n()
const me = useMe()
const lx = useLx()
const { data } = await useFetch('/api/admin/challenges')
const isTroop = computed(() => me.value?.role === 'troop_leader')
const groups = computed(() => {
  const rows = data.value || []
  return [
    { label: t('scheduled'), list: rows.filter((c: any) => c.state === 'scheduled' || c.state === 'draft') },
    { label: t('activeC'), list: rows.filter((c: any) => c.state === 'live') },
    { label: t('done'), list: rows.filter((c: any) => c.state === 'done') }
  ].filter(g => g.list.length)
})
const pill = (s: string) => s === 'live' ? ['live', t('live')] : s === 'scheduled' ? ['sched', t('scheduled')] : s === 'draft' ? ['draft', t('draft')] : null
function sub(c: any) {
  const sector = isTroop.value ? (c.sector ? `${c.sector.emblem} ${lx(c.sector, 'name')}` : t('wholeTroop')) + ' · ' : ''
  if (c.state === 'scheduled') return sector + `${t('unlocks')} ${new Date(c.unlocksAt).toLocaleString('el-GR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
  if (c.state === 'draft') return sector + t('noDate')
  return sector + `${c.answered} ${t('answeredN')} · ${c.correct} ${t('correctN')}`
}
</script>

<template>
  <AppShell :title="isTroop ? t('challenges') : t('myChallenges')">
    <div v-for="g in groups" :key="g.label" class="adm">
      <div class="hdr">{{ g.label }}</div>
      <NuxtLink v-for="c in g.list" :key="c.id" :to="`/admin/challenges/${c.id}`" class="it">
        <div style="flex:1"><b>#{{ c.id }} {{ lx(c) }}</b><span>{{ sub(c) }}</span></div>
        <span v-if="pill(c.state)" class="pill" :class="pill(c.state)![0]">{{ pill(c.state)![1] }}</span>
        <span v-else class="chev">›</span>
      </NuxtLink>
    </div>
    <div v-if="!groups.length" class="empty">{{ t('noChallenges') }}</div>
    <NuxtLink to="/admin/challenges/new" class="fab" aria-label="new">+</NuxtLink>
  </AppShell>
</template>
