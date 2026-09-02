<script setup lang="ts">
const { t, locale } = useI18n()
const lx = useLx()
const { data } = await useFetch('/api/calendar')
const me = useMe()
const filter = ref('all')

/* Named after what they are: a scout in the Ομάδα gets "Όλο το Σύστημα" and
   "Ομάδα Προσκόπων", not the abstract words troop and section. The feed only
   ever carries their own sector's events, so filtering on scope is enough. */
const filters = computed(() => {
  const out = [{ key: 'all', label: t('all') }, { key: 'troop', label: t('wholeTroop') }]
  if (me.value?.section) out.push({ key: 'section', label: lx(me.value.section, 'name') })
  if (me.value?.patrol) out.push({ key: 'patrol', label: lx(me.value.patrol, 'name') })
  return out
})
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
      <button v-for="f in filters" :key="f.key" class="chip" :class="{ on: filter === f.key }"
              @click="filter = f.key">{{ f.label }}</button>
    </div>
    <a v-if="upcoming.length" class="chip" href="/api/calendar.ics" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none">{{ t('addToCalendar') }}</a>
    <template v-for="[label, list] in [[t('thisWeek'), soon], [t('upcoming'), later]]" :key="label">
      <template v-if="list.length">
        <div class="sec-title">{{ label }}</div>
        <div class="card" style="display:flex;flex-direction:column;gap:13px">
          <div v-for="e in list" :key="e.id" class="ev">
            <div class="date"><b>{{ fmtDay(e.startsAt, locale).d }}</b><span>{{ fmtDay(e.startsAt, locale).m }}</span></div>
            <div class="info">
              <b><span class="dot" :class="e.scope" />{{ lx(e) }}</b>
              <span>{{ sub(e) }}</span>
              <p v-if="e.descriptionEl" class="desc">{{ e.descriptionEl }}</p>
            </div>
            <!-- opens the phone's own "add to calendar" — iOS and Android both take .ics -->
            <a class="dl" :href="`/api/calendar.ics?event=${e.id}`" target="_blank" rel="noopener" :aria-label="t('addToCalendar')">⬇</a>
          </div>
        </div>
      </template>
    </template>
    <div v-if="!upcoming.length" class="empty">{{ t('noEvents') }}</div>
    <!-- the key names the scout's own sector and team, not the abstract words -->
    <div class="tiny muted" style="display:flex;gap:12px;padding:0 2px;flex-wrap:wrap">
      <span><span class="dot troop" />{{ t('wholeTroop') }}</span>
      <span v-if="me?.section"><span class="dot section" />{{ lx(me.section, 'name') }}</span>
      <span v-if="me?.patrol"><span class="dot patrol" />{{ lx(me.patrol, 'name') }}</span>
    </div>
  </AppShell>
</template>
