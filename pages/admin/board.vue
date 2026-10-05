<script setup lang="ts">
/* The quiz's league table, for the Βαθμοφόροι of the sector that runs it —
   the same podium and table the members see. Nobody else gets here: the
   server answers only for quiz sectors inside the leader's own area. */
const { t } = useI18n()
const lx = useLx()
const sectionId = ref<number | null>(null)
const { data, error } = await useFetch<any>('/api/admin/board', {
  query: computed(() => (sectionId.value ? { section: sectionId.value } : {}))
})
watchEffect(() => { if (error.value?.statusCode === 403) navigateTo('/admin', { replace: true }) })
</script>

<template>
  <AppShell :title="t('board')" back="/admin/challenges">
    <div v-if="(data?.sections || []).length > 1" class="chips">
      <button v-for="sec in data.sections" :key="sec.id" class="chip"
              :class="{ on: data.sectionId === sec.id }" @click="sectionId = sec.id">{{ lx(sec, 'name') }}</button>
    </div>
    <LeagueBoard v-if="data" :key="data.sectionId" :data="data" />
  </AppShell>
</template>
