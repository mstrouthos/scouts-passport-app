<script setup lang="ts">
/* The league tables, on a button of their own (as the members have) rather
   than on the dashboard: the podium and table of each sector whose members
   use the app (the Ομάδα, the Κοινότητα), and the standings of the Αγέλες,
   whose children never sign in — each only for its own Βαθμοφόροι. One sector
   at a time, picked from the chips when a leader covers more than one. */
const { t } = useI18n()
const lx = useLx()
const name = useName()
const { wordsFor } = useSectorWords()
const pick = ref<string | null>(null)   // 'b<id>' a league table, 'p<id>' standings
const boardSection = computed(() => pick.value?.startsWith('b') ? Number(pick.value.slice(1)) : null)
const { data } = await useFetch<any>('/api/admin/board', {
  query: computed(() => (boardSection.value ? { section: boardSection.value } : {}))
})
const { data: standings } = await useFetch<any[]>('/api/admin/pack/standings', { default: () => [] })
const tabs = computed(() => [
  ...(data.value?.sections || []).map((x: any) => ({ key: 'b' + x.id, sec: x })),
  ...(standings.value || []).map((x: any) => ({ key: 'p' + x.sectionId, sec: x }))
])
const current = computed(() => pick.value && tabs.value.some(x => x.key === pick.value) ? pick.value : tabs.value[0]?.key ?? null)
const st = computed(() => current.value?.startsWith('p') ? (standings.value || []).find((x: any) => 'p' + x.sectionId === current.value) : null)
</script>

<template>
  <AppShell :title="t('board')" :sub="t('boardLeadersSub')">
    <div v-if="tabs.length > 1" class="chips">
      <button v-for="x in tabs" :key="x.key" class="chip" :class="{ on: current === x.key }" @click="pick = x.key">{{ lx(x.sec, 'name') }}</button>
    </div>
    <div v-if="!tabs.length" class="empty">{{ t('boardNone') }}</div>

    <!-- a sector whose members use the app: the same podium and table they see -->
    <!-- tapping someone opens where their points came from -->
    <LeagueBoard v-if="current?.startsWith('b') && data?.individual" :key="data.sectionId" :data="data" :member-link="(r: any) => `/admin/scout-points/${r.id}`" />

    <!-- an Αγέλη: its standings, for its Βαθμοφόροι only -->
    <template v-else-if="st">
      <div class="tiny muted">{{ t('packStandingsNote') }}</div>
      <template v-if="st.patrols.length">
        <div class="sec-title" style="font-size:11px">{{ wordsFor(st.slug).units }}</div>
        <div class="adm">
          <div v-for="(p, i) in st.patrols" :key="p.id" class="it" style="cursor:default">
            <div class="rank">{{ i + 1 }}</div>
            <div style="flex:1;min-width:0"><b>{{ p.emblem }} {{ p.nameEl }}</b><span>{{ p.size }} {{ t('members') }}</span></div>
            <span class="amt">{{ p.points }}<small v-if="st.teamScoring === 'average'" class="tiny muted" style="font-weight:500"> {{ t('avg') }}</small></span>
          </div>
        </div>
      </template>
      <div class="sec-title" style="font-size:11px">{{ wordsFor(st.slug).members }}</div>
      <div v-if="st.members.length" class="adm">
        <div v-for="(m, i) in st.members" :key="m.id" class="it" style="cursor:default">
          <div class="rank">{{ i + 1 }}</div>
          <div style="flex:1;min-width:0">
            <b>{{ name(m) }}</b>
            <span>{{ st.patrols.find((p: any) => p.id === m.patrolId)?.nameEl || '—' }}</span>
          </div>
          <span class="amt">{{ m.points }}</span>
        </div>
      </div>
      <div v-else class="tiny muted" style="padding:0 2px">{{ t('noMembersYet') }}</div>
    </template>
  </AppShell>
</template>

<style scoped>
.rank{flex:none; width:24px; height:24px; border-radius:8px; background:#EEF2F6; display:grid; place-items:center; font-size:11px; font-weight:800; color:var(--muted)}
.amt{flex:none; font-weight:800; font-size:14px; color:var(--accent-deep)}
</style>
