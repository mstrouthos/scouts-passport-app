<script setup lang="ts">
const { t, locale } = useI18n()
const lx = useLx()
const openEvent = ref<any>(null)
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
const inFilter = computed(() => (data.value || []).filter((e: any) => (filter.value === 'all' || e.scope === filter.value)))
const isPast = (e: any) => new Date(e.endsAt || e.startsAt).getTime() <= Date.now() - 86400_000
const upcoming = computed(() => inFilter.value.filter((e: any) => !isPast(e)))
/* What already happened stays reachable — newest first, folded away until asked for. */
const past = computed(() => inFilter.value.filter(isPast).slice().reverse())
const archiveOpen = ref(false)
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
    <a v-if="upcoming.length" class="chip" href="/api/calendar.ics" style="display:inline-block;text-decoration:none">{{ t('addToCalendar') }}</a>
    <template v-for="[label, list] in [[t('thisWeek'), soon], [t('upcoming'), later]]" :key="label">
      <template v-if="list.length">
        <div class="sec-title">{{ label }}</div>
        <div class="card" style="display:flex;flex-direction:column;gap:13px">
          <!-- tap for the details; the calendar button lives in there -->
          <button v-for="e in list" :key="e.id" class="ev" @click="openEvent = e">
            <div class="date"><b>{{ fmtDay(e.startsAt, locale).d }}</b><span>{{ fmtDay(e.startsAt, locale).m }}</span></div>
            <div class="info">
              <b><span class="dot" :class="e.scope" />{{ lx(e) }}</b>
              <span>{{ sub(e) }}</span>
            </div>
            <span class="chev">›</span>
          </button>
        </div>
      </template>
    </template>
    <div v-if="!upcoming.length" class="empty">{{ t('noEvents') }}</div>

    <template v-if="past.length">
      <button class="sec-title" style="display:flex;justify-content:space-between;align-items:center;width:100%;background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer" @click="archiveOpen = !archiveOpen">
        <span>🗄️ {{ t('archive') }} · {{ past.length }}</span><span class="chev" :style="archiveOpen ? 'transform:rotate(90deg)' : ''">›</span>
      </button>
      <div v-if="archiveOpen" class="card" style="display:flex;flex-direction:column;gap:13px;opacity:.85">
        <button v-for="e in past" :key="e.id" class="ev" @click="openEvent = e">
          <div class="date"><b>{{ fmtDay(e.startsAt, locale).d }}</b><span>{{ fmtDay(e.startsAt, locale).m }}</span></div>
          <div class="info"><b><span class="dot" :class="e.scope" />{{ lx(e) }}</b><span>{{ fmtDate(e.startsAt, locale) }} · {{ sub(e) }}</span></div>
          <span class="chev">›</span>
        </button>
      </div>
    </template>
    <!-- the key names the scout's own sector and team, not the abstract words -->
    <div class="tiny muted" style="display:flex;gap:12px;padding:0 2px;flex-wrap:wrap">
      <span><span class="dot troop" />{{ t('wholeTroop') }}</span>
      <span v-if="me?.section"><span class="dot section" />{{ lx(me.section, 'name') }}</span>
      <span v-if="me?.patrol"><span class="dot patrol" />{{ lx(me.patrol, 'name') }}</span>
    </div>
    <Teleport to="body">
      <div v-if="openEvent" class="sheet-backdrop" @click.self="openEvent = null">
        <div class="sheet" style="max-height:86dvh;overflow:auto;display:flex;flex-direction:column;gap:12px">
          <div style="text-align:center;font-size:32px">📅</div>
          <h3 style="margin:0;font-size:17px;text-align:center">{{ lx(openEvent) }}</h3>
          <div class="tiny muted" style="text-align:center">{{ fmtDate(openEvent.startsAt, locale) }} · {{ sub(openEvent) }}</div>
          <div v-if="openEvent.themeEl" style="font-size:13.5px"><b>{{ t('meetingTheme') }}:</b> {{ openEvent.themeEl }}</div>
          <p v-if="openEvent.descriptionEl" style="margin:0;font-size:13.5px;line-height:1.6;white-space:pre-wrap">{{ openEvent.descriptionEl }}</p>
          <!-- opens the phone's own "add to calendar" — iOS and Android both take .ics -->
          <!-- a plain same-tab link: the browser hands the .ics straight to the
               calendar app. Opening it in a new tab leaves that tab blank on iOS,
               because a download has no document to render. -->
          <a class="btn" :href="`/api/calendar.ics?event=${openEvent.id}`" style="text-decoration:none">
            {{ t('addToCalendar') }}
          </a>
          <button class="btn ghost" @click="openEvent = null">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>
