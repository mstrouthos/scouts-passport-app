<script setup lang="ts">
const { t, locale } = useI18n()
const me = useMe()
const lx = useLx()
const { data } = await useFetch<any>('/api/passport')
const { data: chals } = await useFetch<any>('/api/challenges')
// /api/challenges returns the path plus its streak header, not a bare list
const openChal = computed(() => (chals.value?.items || []).find((c: any) => c.state === 'open'))
const rankLabel = computed(() => {
  const r = data.value?.rank
  if (!r) return '—'
  return locale.value === 'el' ? `${r}ος` : `${r}${['th', 'st', 'nd', 'rd'][r % 10 < 4 && (r % 100 < 11 || r % 100 > 13) ? r % 10 : 0]}`
})
const earned = computed(() => (data.value?.badges || []).filter((b: any) => b.earned).length)

// Badges/achievements are a Scout-Troop concept — every other section sees
// its upcoming events on the dashboard instead.
const showBadges = computed(() => me.value?.section?.slug === 'omada')

const { data: events } = await useFetch<any[]>('/api/calendar')
const upcomingEvents = computed(() => (events.value || [])
  .filter((e: any) => new Date(e.endsAt || e.startsAt).getTime() > Date.now() - 86400_000)
  .slice(0, 4))
function sub(e: any) {
  const time = e.isAllDay ? t('allDay') : `${fmtTime(e.startsAt)}${e.endsAt ? ' – ' + fmtTime(e.endsAt) : ''}`
  return `${time}${e.location ? ' · ' + e.location : ''}`
}
</script>

<template>
  <AppShell :title="t('myPassport')" :sub="me?.patrol ? `${me.patrol.emblem} ${lx(me.patrol, 'name')}` : ''">
    <template #actions>
      <NuxtLink to="/app/settings" class="iconbtn" :aria-label="t('settings')"><NavIcon name="gear" /></NuxtLink>
    </template>

    <div class="pcard">
      <div class="name">{{ me?.firstName }} {{ me?.lastName }}</div>
      <div class="meta">{{ lx(me?.section, 'name') }} · {{ lx(me?.patrol, 'name') }}</div>
      <div class="stats">
        <NuxtLink to="/app/points" class="stat tappable">
          <b>{{ data?.points ?? 0 }}</b><span>{{ t('points') }} ›</span>
        </NuxtLink>
        <div class="stat"><b>{{ rankLabel }}</b><span>{{ t('rank') }}</span></div>
        <div v-if="showBadges" class="stat"><b>{{ earned }}/{{ data?.badges?.length ?? 0 }}</b><span>{{ t('badges') }}</span></div>
        <div v-else class="stat"><b>{{ upcomingEvents.length }}</b><span>{{ t('events') }}</span></div>
      </div>
    </div>

    <NuxtLink v-if="openChal" to="/app/challenges" class="banner">
      <div class="ico">🎯</div>
      <div><b>{{ t('newChallenge') }}</b><span>{{ lx(openChal) }} · {{ t('upToPts', { n: openChal.points }) }}</span></div>
      <div class="go">›</div>
    </NuxtLink>

    <!-- the passport and the badges each get one bar; their detail lives on
         their own page rather than crowding the dashboard -->
    <template v-if="showBadges">
      <NuxtLink to="/app/requirements" class="banner">
        <div class="ico">⚜️</div>
        <div><b>{{ t('scoutRequirements') }}</b><span>{{ t('scoutRequirementsSub') }}</span></div>
        <div class="go">›</div>
      </NuxtLink>

      <NuxtLink to="/app/badges" class="banner">
        <div class="ico">🏅</div>
        <div><b>{{ t('scoutBadges') }}</b><span>{{ earned }}/{{ data?.badges?.length ?? 0 }}</span></div>
        <div class="go">›</div>
      </NuxtLink>
    </template>

    <div class="sec-title" style="display:flex;align-items:center;justify-content:space-between">
      <span>{{ t('upcoming') }}</span>
      <NuxtLink to="/app/calendar" class="tiny" style="color:var(--accent-deep);font-weight:650">{{ t('calendar') }} ›</NuxtLink>
    </div>
    <div v-if="upcomingEvents.length" class="card" style="display:flex;flex-direction:column;gap:13px">
      <div v-for="e in upcomingEvents" :key="e.id" class="ev">
        <div class="date"><b>{{ fmtDay(e.startsAt, locale).d }}</b><span>{{ fmtDay(e.startsAt, locale).m }}</span></div>
        <div class="info"><b><span class="dot" :class="e.scope" />{{ lx(e) }}</b><span>{{ sub(e) }}</span></div>
      </div>
    </div>
    <div v-else class="empty">{{ t('noUpcoming') }}</div>
  </AppShell>
</template>

<style scoped>
/* the points tile leads to the breakdown, so it reads as something to press —
   but it is a tile on a coloured card, not a run of body text, so it must not
   inherit the default link colour and underline */
.stat.tappable{cursor:pointer; color:inherit; text-decoration:none}
.stat.tappable b, .stat.tappable span{color:inherit; text-decoration:none}
.stat.tappable:active{transform:translateY(1px)}
</style>
