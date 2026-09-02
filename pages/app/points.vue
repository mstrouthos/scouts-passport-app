<script setup lang="ts">
/* Where the points came from. Same cartoon language as the rest of the app:
   a headline number, a row of source tiles, then the entries themselves. */
const { t, locale } = useI18n()
const { words: sectorWords } = useSectorWords()
const { data } = await useFetch<any>('/api/points')

const SOURCES: Record<string, { emoji: string, key: string, tone: string }> = {
  challenge:  { emoji: '🎯', key: 'ptsFromChallenges', tone: '#7B4FA0' },
  attendance: { emoji: '✋', key: 'ptsFromAttendance', tone: '#2E7D5B' },
  uniform:    { emoji: '👔', key: 'ptsFromUniform',    tone: '#4E8FD6' },
  game:       { emoji: '🏆', key: 'ptsFromGames',      tone: '#C99A18' },
  patrol:     { emoji: '⛺', key: 'ptsFromPatrol',     tone: '#B87333' },
  manual:     { emoji: '⭐', key: 'ptsFromManual',     tone: '#E7643C' }
}
const meta = (s: string) => SOURCES[s] || SOURCES.manual
/* the unit is named in the member's own sector's words */
const label = (s: string) => s === 'patrol' ? sectorWords.value.unit : label(s)
const filter = ref<string | null>(null)
const shown = computed<any[]>(() => (data.value?.items || [])
  .filter((i: any) => !filter.value || (i.source === 'patrol' ? 'patrol' : i.source) === filter.value))
</script>

<template>
  <AppShell :title="t('points')" :sub="t('pointsBreakdownSub')" back="/app">
    <div class="hero-card">
      <div class="big">{{ data?.total ?? 0 }}</div>
      <div class="lbl">{{ t('pointsTotal') }}</div>
    </div>

    <div v-if="data?.summary?.length" class="tiles">
      <button v-for="b in data.summary" :key="b.key" class="tile"
              :class="{ on: filter === b.key }" :style="{ '--tone': meta(b.key).tone }"
              @click="filter = filter === b.key ? null : b.key">
        <span class="em">{{ meta(b.key).emoji }}</span>
        <span class="pts">{{ b.points > 0 ? '+' : '' }}{{ b.points }}</span>
        <span class="nm">{{ label(b.key) }}</span>
      </button>
    </div>

    <div class="sec-title">{{ filter ? label(filter) : t('allPoints') }}</div>
    <div v-if="shown.length" class="adm">
      <div v-for="(i, n) in shown" :key="n" class="it">
        <div class="em" :style="{ background: meta(i.source).tone + '22' }">{{ meta(i.source).emoji }}</div>
        <div style="flex:1;min-width:0">
          <b>{{ i.titleEl }}</b>
          <span>{{ [i.detailEl, i.at ? fmtDate(i.at, locale) : null].filter(Boolean).join(' · ') }}</span>
        </div>
        <span class="amt" :class="{ minus: i.points < 0 }">{{ i.points > 0 ? '+' : '' }}{{ i.points }}</span>
      </div>
    </div>
    <div v-else class="empty">{{ t('noPointsYet') }}</div>
  </AppShell>
</template>

<style scoped>
.hero-card{
  background:var(--card); border-radius:var(--r-card); box-shadow:var(--shadow);
  padding:18px; text-align:center;
}
.hero-card .big{font-size:38px; font-weight:800; line-height:1; color:var(--accent-deep)}
.hero-card .lbl{font-size:12px; color:var(--muted); margin-top:3px}

.tiles{display:grid; grid-template-columns:repeat(auto-fill, minmax(96px, 1fr)); gap:9px}
.tile{
  background:var(--card); border-radius:16px; padding:11px 8px; text-align:center;
  display:flex; flex-direction:column; gap:2px; align-items:center;
  box-shadow:0 4px 0 rgba(0,0,0,.08); border:2.5px solid transparent;
}
.tile.on{border-color:var(--tone)}
.tile:active{transform:translateY(2px); box-shadow:0 2px 0 rgba(0,0,0,.08)}
.tile .em{font-size:20px}
.tile .pts{font-size:16px; font-weight:800; color:var(--tone)}
.tile .nm{font-size:10.5px; color:var(--muted); line-height:1.2}

.it .em{
  flex:none; width:34px; height:34px; border-radius:11px;
  display:grid; place-items:center; font-size:17px;
}
.amt{flex:none; font-weight:800; font-size:14px; color:var(--green)}
.amt.minus{color:var(--danger)}
</style>
