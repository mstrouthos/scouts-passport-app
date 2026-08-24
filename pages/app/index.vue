<script setup lang="ts">
const { t, locale } = useI18n()
const me = useMe()
const lx = useLx()
const { data } = await useFetch('/api/passport')
const { data: chals } = await useFetch<any>('/api/challenges')
// /api/challenges returns the path plus its streak header, not a bare list
const openChal = computed(() => (chals.value?.items || []).find((c: any) => c.state === 'open'))
const sheet = ref<any>(null)
const rankLabel = computed(() => {
  const r = data.value?.rank
  if (!r) return '—'
  return locale.value === 'el' ? `${r}ος` : `${r}${['th', 'st', 'nd', 'rd'][r % 10 < 4 && (r % 100 < 11 || r % 100 > 13) ? r % 10 : 0]}`
})
const earned = computed(() => (data.value?.badges || []).filter((b: any) => b.earned).length)

// Badges/achievements are a Scout-Troop concept — every other section sees
// its upcoming events on the dashboard instead.
const showBadges = computed(() => me.value?.section?.slug === 'omada')

/* 51 πτυχία would bury the dashboard, so what the scout has earned is shown
   openly and the rest are folded away by category, opened one at a time. */
const earnedBadges = computed(() => (data.value?.badges || []).filter((b: any) => b.earned))

/* Arriving from the notification that announced a badge: open it, and mark the
   moment before showing the detail. */
const route = useRoute()
const router = useRouter()
const party = ref<any>(null)
// watched, not just read on mount: tapping the notification while already on
// this page only changes the query string
watch(() => route.query.badge, (raw) => {
  const id = Number(raw)
  if (!Number.isInteger(id)) return
  const b = (data.value?.badges || []).find((x: any) => x.id === id)
  if (!b) return
  party.value = b
  sheet.value = b
  router.replace({ query: {} })   // so a refresh does not replay it
}, { immediate: true })
const openCat = ref<string | null>(null)
const lockedByCategory = computed(() => {
  const groups = new Map<string, { slug: string, label: string, emoji: string, items: any[] }>()
  for (const b of (data.value?.badges || [])) {
    if (b.earned) continue
    const key = b.category || 'other'
    if (!groups.has(key))
      groups.set(key, { slug: key, label: b.categoryEl || t('badges'), emoji: b.categoryEmoji || '🏅', items: [] })
    groups.get(key)!.items.push(b)
  }
  return [...groups.values()]
})

/* Some πτυχία offer one route "ή" another, and the passport restarts its
   numbering after that word. Number the steps ourselves so the separator is
   not counted as one of them. */
const sheetSteps = computed(() => {
  let n = 0
  return (sheet.value?.requirementsEl || []).map((text: string) => {
    if (text === '— ή —') { n = 0; return { kind: 'sep', text } }
    if (text.startsWith(':: ')) return { kind: 'lead', text: text.slice(3) }
    return { kind: 'step', n: ++n, text }
  })
})
const { data: events } = await useFetch('/api/calendar')
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
        <div class="stat"><b>{{ data?.points ?? 0 }}</b><span>{{ t('points') }}</span></div>
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

    <template v-if="showBadges">
      <NuxtLink to="/app/requirements" class="banner req">
        <div class="ico">⚜️</div>
        <div><b>{{ t('scoutRequirements') }}</b><span>{{ t('scoutRequirementsSub') }}</span></div>
        <div class="go">›</div>
      </NuxtLink>

      <div class="sec-title">{{ t('myBadges') }}</div>
      <div v-if="earnedBadges.length" class="badge-grid">
        <button v-for="b in earnedBadges" :key="b.id" class="btile" @click="sheet = b">
          <span class="disc">{{ b.icon }}</span>
          <span class="lbl">{{ lx(b) }}</span>
        </button>
      </div>
      <div v-else class="empty">{{ t('noBadgesYet') }}</div>

      <div class="sec-title">{{ t('badgesToEarn') }}</div>
      <div v-for="c in lockedByCategory" :key="c.slug" class="catgroup">
        <button class="cathead" @click="openCat = openCat === c.slug ? null : c.slug">
          <span class="cemoji">{{ c.emoji }}</span>
          <span class="clbl">{{ c.label }}</span>
          <span class="cn">{{ c.items.length }}</span>
          <span class="chev">{{ openCat === c.slug ? '⌄' : '›' }}</span>
        </button>
        <div v-if="openCat === c.slug" class="badge-grid" style="margin-top:9px">
          <button v-for="b in c.items" :key="b.id" class="btile off" @click="sheet = b">
            <span class="disc">{{ b.icon }}</span>
            <span class="lbl">{{ lx(b) }}</span>
          </button>
        </div>
      </div>
    </template>

    <template v-else>
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
      <div v-else class="empty">{{ t('noEvents') }}</div>
    </template>

    <Teleport to="body">
      <Celebration v-if="party" :emoji="party.icon" :title="lx(party)"
                   :subtitle="t('badgeEarned')" @close="party = null" />
      <div v-if="sheet" class="sheet-backdrop" @click.self="sheet = null">
        <div class="sheet">
          <div style="width:64px;height:64px;border-radius:18px;margin:0 auto 10px;display:grid;place-items:center;font-size:30px"
               :style="sheet.earned ? 'background:linear-gradient(145deg,#FFF6DF,#FBE7B4)' : 'background:#EEF2F6;filter:grayscale(1);opacity:.6'">
            {{ sheet.icon }}
          </div>
          <h3 style="margin:0;text-align:center;font-size:17px">{{ lx(sheet) }}</h3>
          <div class="tiny muted" style="text-align:center;margin-top:3px">
            {{ sheet.earned ? `${t('completedOn')} ${fmtDate(sheet.completedOn, locale)}` : t('notEarned') }}
          </div>
          <p v-if="lx(sheet, 'description')" style="font-size:13px;line-height:1.55;color:#44536B;margin:14px 0 4px;text-align:center">{{ lx(sheet, 'description') }}</p>

          <!-- what the passport asks for to earn this Πτυχίο -->
          <template v-if="sheet.requirementsEl?.length">
            <div class="sec-title" style="margin:14px 0 8px">{{ t('badgeRequirements') }}</div>
            <ul class="breq">
              <li v-for="(r, i) in sheetSteps" :key="i" :class="r.kind">
                <template v-if="r.kind === 'sep'">{{ t('orAlternative') }}</template>
                <template v-else-if="r.kind === 'lead'">{{ r.text }}</template>
                <template v-else><b>{{ r.n }}.</b> {{ r.text }}</template>
              </li>
            </ul>
          </template>

          <NuxtLink to="/app/requirements" class="btn" style="margin-top:14px;display:block;text-align:center">
            ⚜️ {{ t('seeRequirements') }}
          </NuxtLink>
          <button class="btn ghost" style="margin-top:8px" @click="sheet = null">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.banner.req .ico{background:#FBF2D8}
.catgroup{display:flex; flex-direction:column}
.cathead{
  display:flex; align-items:center; gap:11px; width:100%; text-align:left;
  background:var(--card); border-radius:14px; padding:12px 14px; box-shadow:var(--shadow);
}
.cathead .cemoji{font-size:19px}
.cathead .clbl{flex:1; min-width:0; font-size:13.5px; font-weight:650}
.cathead .cn{
  font-size:11px; font-weight:800; color:var(--muted);
  background:#EEF2F6; border-radius:999px; padding:2px 8px;
}
.cathead .chev{color:var(--muted)}
.breq{margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:7px}
.breq li{font-size:12.5px; line-height:1.5; color:#44536B; display:flex; gap:7px}
.breq li b{color:var(--accent); font-weight:800; flex:none}
.breq li.lead{font-weight:700; color:var(--ink)}
.breq li.sep{
  justify-content:center; font-weight:800; color:var(--muted); font-size:11.5px;
  letter-spacing:.08em; text-transform:uppercase; margin:3px 0;
}
</style>
