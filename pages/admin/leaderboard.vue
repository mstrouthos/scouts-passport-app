<script setup lang="ts">
/* The Βαθμοφόροι's mini-games, added up: one table across all of them, for
   this week or the scout year, with the podium the scouts' league has. */
import { GAME_RANK } from '~/utils/games'
const { t } = useI18n()
const period = ref<'week' | 'year'>('week')
const { data } = await useFetch<any>('/api/admin/games/rank', { query: { period }, lazy: true })
const ICON = { throw: '🍅', potato: '🥔', kim: '🧠', north: '🧭' } as const
const rows = computed(() => (data.value?.rows || []).map((r: any) => ({
  ...r, value: String(r.total), unit: t('pts'),
  sub: (Object.keys(ICON) as (keyof typeof ICON)[]).filter(k => r.parts[k]).map(k => `${ICON[k]} ${r.parts[k]}`).join(' · ')
})))
</script>

<template>
  <AppShell :title="t('gamesRank')" :sub="t('gamesRankSub')" back="/admin">
    <div class="seg">
      <button :class="{ on: period === 'week' }" @click="period = 'week'">{{ t('gamesRankWeek') }}</button>
      <button :class="{ on: period === 'year' }" @click="period = 'year'">{{ t('gamesRankYear') }}</button>
    </div>
    <GameBoard v-if="rows.length" :rows="rows" />
    <div v-else-if="data" class="card tiny muted" style="text-align:center">{{ t('gamesRankEmpty') }}</div>
    <div class="card how">
      <b>{{ t('gamesRankHow') }}</b>
      <span>🧭 {{ t('gamesRankNorth') }}</span>
      <span>🧠 {{ t('gamesRankKim', { n: GAME_RANK.kimPerThing }) }}</span>
      <span>🍅 {{ t('gamesRankSplat', { n: GAME_RANK.splat }) }}</span>
      <span>🥔 {{ t('gamesRankPotato', { n: GAME_RANK.potatoPass, m: GAME_RANK.potatoSurvive }) }}</span>
    </div>
  </AppShell>
</template>

<style scoped>
.how{display:flex; flex-direction:column; gap:6px; font-size:13px; line-height:1.45}
.how b{font-size:14px}
</style>
