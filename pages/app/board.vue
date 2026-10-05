<script setup lang="ts">
/* The member's own sector's league table. */
const { t } = useI18n()
const { data } = await useFetch<any>('/api/board')
</script>

<template>
  <AppShell :title="t('board')">
    <LeagueBoard v-if="data" :data="data" />
  </AppShell>
</template>
