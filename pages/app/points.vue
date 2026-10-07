<script setup lang="ts">
/* Where the points came from (components/PointsBreakdown). */
const { t } = useI18n()
const { data } = await useFetch<any>('/api/points')
</script>

<template>
  <AppShell :title="t('points')" :sub="t('pointsBreakdownSub')" back="/app">
    <PointsBreakdown :data="data" />
  </AppShell>
</template>
