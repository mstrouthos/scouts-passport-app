<script setup lang="ts">
const { t, locale } = useI18n()
const lx = useLx()
const { data } = await useFetch('/api/calendar')
const filter = ref('all')
const filters = ['all', 'troop', 'section', 'patrol']
const upcoming = computed(() => (data.value || [])
  .filter((e: any) => (filter.value === 'all' || e.scope === filter.value))
  .filter((e: any) => new Date(e.endsAt || e.startsAt).getTime() > Date.now() - 86400_000))
const soon = computed(() => upcoming.value.filter((e: any) => new Date(e.startsAt).getTime() < Date.now() + 7 * 86400_000))
const later = computed(() => upcoming.value.filter((e: any) => new Date(e.startsAt).getTime() >= Date.now() + 7 * 86400_000))
function sub(e: any) {
  const time = e.isAllDay ? t('allDay') : `${fmtTime(e.startsAt)}${e.endsAt ? ' – ' + fmtTime(e.endsAt) : ''}`
  return `${time}${e.location ? ' · ' + e.location : ''}`
}
</script>

<template>
  <AppShell :title="t('calendar')">
    <div class="chips">
      <button v-for="f in filters" :key="f" class="chip" :class="{ on: filter === f }" @click="filter = f">{{ t(f) }}</button>
    </div>
    <template v-for="[label, list] in [[t('thisWeek'), soon], [t('upcoming'), later]]" :key="label">
      <template v-if="list.length">
        <div class="sec-title">{{ label }}</div>
        <div class="card" style="display:flex;flex-direction:column;gap:13px">
          <div v-for="e in list" :key="e.id" class="ev">
            <div class="date"><b>{{ fmtDay(e.startsAt, locale).d }}</b><span>{{ fmtDay(e.startsAt, locale).m }}</span></div>
            <div class="info"><b><span class="dot" :class="e.scope" />{{ lx(e) }}</b><span>{{ sub(e) }}</span></div>
          </div>
        </div>
      </template>
    </template>
    <div v-if="!upcoming.length" class="empty">{{ t('noEvents') }}</div>
    <div class="tiny muted" style="display:flex;gap:12px;padding:0 2px">
      <span><span class="dot troop" />{{ t('troop') }}</span>
      <span><span class="dot section" />{{ t('section') }}</span>
      <span><span class="dot patrol" />{{ t('patrol') }}</span>
    </div>
  </AppShell>
</template>
