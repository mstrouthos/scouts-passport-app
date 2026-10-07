<script setup lang="ts">
/* A member's points, as they see them, for their Βαθμοφόροι — opened by
   tapping them on the league table. */
const { t } = useI18n()
const name = useName()
const route = useRoute()
const { data } = await useFetch<any>(() => `/api/admin/scouts/${route.params.id}/points`)
</script>

<template>
  <AppShell :title="data?.scout ? name(data.scout) : t('points')" :sub="t('pointsBreakdownSub')" back="/admin/board">
    <PointsBreakdown v-if="data" :data="data" />
  </AppShell>
</template>
