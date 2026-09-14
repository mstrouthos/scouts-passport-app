<script setup lang="ts">
const { t, locale } = useI18n()
const me = useMe()
const lx = useLx()
const { data } = await useFetch<any[]>('/api/admin/events')
const { data: groups } = await useFetch<any[]>('/api/admin/groups')
const isTroop = computed(() => me.value?.role === 'troop_leader')

/* e.g. 🎺 Μπάντα — only groups that actually have something in the diary */
const groupOf = (id: number | null) => (groups.value || []).find(g => g.id === id) || null
function groupLabel(e: any) {
  const g = groupOf(e.groupId)
  return g ? [g.emoji, g.nameEl].filter(Boolean).join(' ') : t('group')
}

/* Whole troop, the Βαθμοφόροι, then every sector whose diary this leader may
   read — an Αρχηγός sees them all, so the sectors can plan around each other;
   a Υπαρχηγός only their own. */
const filter = ref<string>('all')
const filters = computed(() => {
  const out = [
    { key: 'all', label: t('all') },
    { key: 'troop', label: t('wholeTroop') },
    { key: 'leaders', label: t('vathmoforoi') }
  ]
  for (const sec of (me.value?.calendarSections || me.value?.scopeSections || []))
    out.push({ key: 's' + sec.id, label: lx(sec, 'name') })
  for (const id of new Set((data.value || []).filter(e => e.scope === 'group' && e.groupId != null).map(e => e.groupId))) {
    const g = groupOf(id as number)
    out.push({ key: 'g' + id, label: g ? [g.emoji, g.nameEl].filter(Boolean).join(' ') : t('group') })
  }
  return out
})
const inFilter = computed(() => (data.value || []).filter(e => {
  if (filter.value === 'all') return true
  if (filter.value === 'troop') return e.scope === 'troop'
  if (filter.value === 'leaders') return e.scope === 'leaders'
  if (filter.value.startsWith('g')) return e.scope === 'group' && e.groupId === Number(filter.value.slice(1))
  return e.scope !== 'group' && e.sectionId === Number(filter.value.slice(1))
}))
const whenTime = (e: any) => fmtSpan(e, locale, t('allDay'))
const whoLabel = (e: any) => e.scope === 'troop' ? t('wholeTroop')
  : e.scope === 'leaders' ? [t('vathmoforoi'), e.sectionId != null ? lx(e, 'section') : null].filter(Boolean).join(' · ')
  : e.scope === 'group' ? groupLabel(e) : lx(e, 'section')
const isPast = (e: any) => eventEnded(e)

/* The one thing a Βαθμοφόρος opens this screen to check: what comes next. */
const nextEvent = computed(() => inFilter.value.filter(e => !isPast(e))
  .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] || null)

/* A month at a time, walked forwards and back. Days are local (Cyprus) days;
   an event that runs over several days is marked on each of them. */
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const today = new Date()
const cursor = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const selected = ref(dayKey(today))
const monthLabel = computed(() => cursor.value.toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'el-GR', { month: 'long', year: 'numeric' }))
const weekdays = computed(() => {
  const base = new Date(2024, 0, 1) // a Monday
  return Array.from({ length: 7 }, (_, i) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
    .toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'el-GR', { weekday: 'short' }).replace('.', '').slice(0, 2))
})
function daysOf(e: any) {
  const out: string[] = []
  const d = new Date(e.startsAt); d.setHours(0, 0, 0, 0)
  const end = new Date(e.endsAt || e.startsAt); end.setHours(0, 0, 0, 0)
  for (let i = 0; i < 60 && d.getTime() <= end.getTime(); i++, d.setDate(d.getDate() + 1)) out.push(dayKey(d))
  return out
}
const byDay = computed(() => {
  const m = new Map<string, any[]>()
  for (const e of inFilter.value) for (const k of daysOf(e)) m.set(k, [...(m.get(k) || []), e])
  return m
})
const cells = computed(() => {
  const y = cursor.value.getFullYear(), mo = cursor.value.getMonth()
  const first = new Date(y, mo, 1)
  const lead = (first.getDay() + 6) % 7          // Monday first
  const start = new Date(y, mo, 1 - lead)
  const rows = Math.ceil((lead + new Date(y, mo + 1, 0).getDate()) / 7)
  return Array.from({ length: rows * 7 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const key = dayKey(d)
    return { key, n: d.getDate(), inMonth: d.getMonth() === mo, events: byDay.value.get(key) || [] }
  })
})
function shiftMonth(by: number) {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + by, 1)
}
function goToday() { cursor.value = new Date(today.getFullYear(), today.getMonth(), 1); selected.value = dayKey(today) }
function pick(c: { key: string; inMonth: boolean }) {
  selected.value = c.key
  if (!c.inMonth) cursor.value = new Date(Number(c.key.slice(0, 4)), Number(c.key.slice(5, 7)) - 1, 1)
}
const selectedEvents = computed(() => (byDay.value.get(selected.value) || []).slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt)))
const selectedLabel = computed(() => new Date(selected.value + 'T00:00').toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'el-GR', { weekday: 'long', day: 'numeric', month: 'long' }))
const isToday = (key: string) => key === dayKey(today)
</script>

<template>
  <AppShell :title="t('events')">
    <div v-if="filters.length > 2" class="chips">
      <button v-for="f in filters" :key="f.key" class="chip" :class="{ on: filter === f.key }"
              @click="filter = f.key">{{ f.label }}</button>
    </div>

    <!-- what comes next -->
    <div class="adm">
      <div class="hdr">{{ t('nextActivity') }}</div>
      <NuxtLink v-if="nextEvent" :to="`/admin/events/${nextEvent.id}`" class="it">
        <div class="date" style="flex:none;width:44px;text-align:center;background:var(--bg2);border-radius:12px;padding:5px 0">
          <b style="display:block;font-size:16px;line-height:1">{{ fmtDay(nextEvent.startsAt, locale).d }}</b>
          <span style="font-size:8.5px;text-transform:uppercase;color:var(--muted)">{{ fmtDay(nextEvent.startsAt, locale).m }}</span>
        </div>
        <div style="flex:1"><b><span class="dot" :class="nextEvent.scope" />{{ lx(nextEvent) }}</b>
          <span>{{ [whenTime(nextEvent), whoLabel(nextEvent), nextEvent.location].filter(Boolean).join(' · ') }}</span>
        </div>
        <span class="chev">›</span>
      </NuxtLink>
      <div v-else class="it"><span>{{ t('noUpcoming') }}</span></div>
    </div>

    <!-- the month, walked forwards and back -->
    <div class="adm cal">
      <div class="calhead">
        <button class="iconbtn" :aria-label="t('prevMonth')" @click="shiftMonth(-1)">‹</button>
        <button class="month" @click="goToday"><b>{{ monthLabel }}</b><span class="tiny muted">{{ t('today') }}</span></button>
        <button class="iconbtn" :aria-label="t('nextMonth')" @click="shiftMonth(1)">›</button>
      </div>
      <div class="grid">
        <div v-for="w in weekdays" :key="w" class="wd">{{ w }}</div>
        <button v-for="c in cells" :key="c.key" class="day" :class="{ out: !c.inMonth, today: isToday(c.key), on: selected === c.key }"
                @click="pick(c)">
          <span class="n">{{ c.n }}</span>
          <span class="dots"><i v-for="e in c.events.slice(0, 3)" :key="e.id" class="dot" :class="e.scope" /></span>
        </button>
      </div>
    </div>

    <!-- the chosen day -->
    <div class="adm">
      <div class="hdr">{{ selectedLabel }} · {{ selectedEvents.length }}</div>
      <NuxtLink v-for="e in selectedEvents" :key="e.id" :to="`/admin/events/${e.id}`" class="it" :style="isPast(e) ? 'opacity:.8' : ''">
        <div style="flex:1"><b><span class="dot" :class="e.scope" />{{ lx(e) }}</b>
          <span>{{ [whenTime(e), whoLabel(e), e.location].filter(Boolean).join(' · ') }}</span>
        </div>
        <span class="pill" :class="!e.editable ? 'draft' : e.reviewed ? 'ok' : 'draft'">
          {{ !e.editable ? '🔒 ' + t('readOnly') : e.reviewed ? t('reviewed') : t('pending') }}
        </span>
      </NuxtLink>
      <div v-if="!selectedEvents.length" class="it"><span>{{ t('noEventsDay') }}</span></div>
    </div>

    <div v-if="!isTroop" class="tiny muted" style="text-align:center">{{ t('lockedEvents') }}</div>
    <NuxtLink v-if="me?.can?.events !== false" to="/admin/events/new" class="fab" aria-label="new">+</NuxtLink>
  </AppShell>
</template>

<style scoped>
.cal{padding:10px 10px 12px}
.calhead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.calhead .iconbtn{width:34px;height:34px;border-radius:50%;border:0;background:var(--bg2);font-size:20px;line-height:1;cursor:pointer;color:var(--ink)}
.calhead .month{flex:1;border:0;background:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:1px;text-transform:capitalize}
.calhead .month b{font-size:15px}
.grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.wd{text-align:center;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:4px 0}
.day{border:0;background:none;border-radius:10px;padding:5px 0 4px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;min-height:44px;color:var(--ink)}
.day .n{font-size:13px;font-weight:600;width:26px;height:26px;line-height:26px;border-radius:50%;text-align:center}
.day.out{opacity:.35}
.day.today .n{box-shadow:inset 0 0 0 1.5px var(--green)}
.day.on .n{background:var(--green);color:#fff}
.day .dots{display:flex;gap:2px;height:7px}
.day .dots .dot{margin:0;width:6px;height:6px}
.day:active{background:var(--bg2)}
</style>
