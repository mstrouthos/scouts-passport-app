<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const name = useName()
const { data } = await useFetch('/api/board')
const tab = ref<'ind' | 'pat'>('ind')
const maxAvg = computed(() => Math.max(1, ...(data.value?.patrols || []).map((p: any) => p.avg)))
function rankOf(i: number) {
  const list = data.value?.individual || []
  return 1 + list.filter((r: any, j: number) => j < i && r.points > list[i].points).length
}
</script>

<template>
  <AppShell :title="t('board')">
    <div class="seg">
      <button :class="{ on: tab === 'ind' }" @click="tab = 'ind'">{{ t('individual') }}</button>
      <button :class="{ on: tab === 'pat' }" @click="tab = 'pat'">{{ t('patrols') }}</button>
    </div>

    <div v-if="tab === 'ind'" class="card" style="padding:0">
      <div v-for="(r, i) in data?.individual" :key="r.id" class="lb" :class="{ me: r.me }">
        <div class="rk" :class="{ m1: rankOf(i) === 1 }">{{ rankOf(i) }}</div>
        <div class="nm">
          <b v-if="r.me">{{ name(r) }}</b><template v-else>{{ name(r) }}</template>
          <span>{{ lx(data?.patrolNames?.[r.patrolId], 'name') }}{{ r.me ? ' · ' + t('you') : '' }}</span>
        </div>
        <div class="pts">{{ r.points }}</div>
      </div>
    </div>

    <div v-else class="card" style="display:flex;flex-direction:column;gap:13px">
      <div v-for="p in data?.patrols" :key="p.id">
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:650">
          <span>{{ p.emblem }} {{ lx(p, 'name') }} <span class="tiny muted" style="font-weight:400">· {{ p.members }} {{ t('members') }}</span></span>
          <span style="color:var(--blue-deep)">{{ p.avg }} <span class="tiny muted" style="font-weight:400">{{ t('avg') }}</span></span>
        </div>
        <div class="bar"><i :style="{ width: Math.round(p.avg / maxAvg * 100) + '%' }" /></div>
      </div>
      <div class="tiny muted">{{ t('avgNote') }}</div>
    </div>
  </AppShell>
</template>
