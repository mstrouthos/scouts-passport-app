<script setup lang="ts">
import { isBirthday } from '~/utils/season'
import { STREAK_REWARDS, SEASON_OF } from '~/utils/avatar'
import { rewardArt } from '~/utils/art'
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
// their birthday: a party hat on their avatar, for the day
const birthday = computed(() => isBirthday(me.value?.birthday))
/* the season: its card says what there is to win, and whether it is won */
const season = useSeason()
const { data: rw } = await useFetch<{ unlocked: string[] }>('/api/me/rewards')
const seasonItem = computed(() => season.value ? STREAK_REWARDS.find(r => r.track === 'season' && SEASON_OF[r.key] === season.value) : null)
const seasonWon = computed(() => !!seasonItem.value && !!rw.value?.unlocked.includes(seasonItem.value.key))
const earnedBadges = computed<any[]>(() => (data.value?.badges || []).filter((b: any) => b.earned))
const earned = computed(() => earnedBadges.value.length)

// Badges/achievements are a Scout-Troop concept — every other section sees
// its upcoming events on the dashboard instead.
const showBadges = computed(() => me.value?.section?.slug === 'omada')
// the Κοινότητα follows the Η.Κ.Α.Δ.Ε. instead, which has no Πτυχία
const showVenture = computed(() => me.value?.section?.slug === 'koinotita')

const { data: events } = await useFetch<any[]>('/api/calendar')
const upcomingEvents = computed(() => (events.value || [])
  .filter((e: any) => !eventEnded(e))
  .slice(0, 4))
function sub(e: any) {
  const time = fmtSpan(e, locale, t('allDay'))
  return `${time}${e.location ? ' · ' + e.location : ''}`
}
</script>

<template>
  <AppShell :title="t('myPassport')" :sub="me?.patrol ? `${me.patrol.emblem} ${lx(me.patrol, 'name')}` : ''">

    <div class="pcard">
      <div class="who">
        <!-- their own avatar, made in the creator; tapping it opens the creator -->
        <NuxtLink to="/app/avatar" class="me-av" :aria-label="t('avatarEdit')">
          <Avatar :name="`${me?.firstName || ''} ${me?.lastName || ''}`" :avatar="me?.avatar" :size="64" tone="gold" :party="birthday" />
          <span class="pen">✎</span>
        </NuxtLink>
        <div style="min-width:0">
          <div class="name">{{ me?.firstName }} {{ me?.lastName }}<template v-if="birthday"> 🎂</template></div>
          <div class="meta">{{ lx(me?.section, 'name') }} · {{ lx(me?.patrol, 'name') }}</div>
          <NuxtLink v-if="!me?.avatar" to="/app/avatar" class="make">✨ {{ t('avatarMake') }} ›</NuxtLink>
        </div>
      </div>
      <div class="stats">
        <NuxtLink to="/app/points" class="stat tappable">
          <b>{{ data?.points ?? 0 }}</b><span>{{ t('points') }} ›</span>
        </NuxtLink>
        <!-- their place leads to the league table -->
        <NuxtLink to="/app/board" class="stat tappable">
          <b>{{ rankLabel }}<small v-if="data?.totalScouts" class="of">/{{ data.totalScouts }}</small></b><span>{{ t('rank') }} ›</span>
        </NuxtLink>
        <NuxtLink v-if="showBadges" to="/app/badges" class="stat tappable">
          <b>{{ earned }}/{{ data?.badges?.length ?? 0 }}</b><span>{{ t('badges') }} ›</span>
        </NuxtLink>
        <div v-else class="stat"><b>{{ upcomingEvents.length }}</b><span>{{ t('events') }}</span></div>
      </div>
    </div>

    <!-- showing up, in a row: the streak, the record, the last few meetings -->
    <div v-if="data?.attendance?.recent?.length" class="attend">
      <div class="a-top">
        <div class="a-ico">🏕️</div>
        <div class="a-txt">
          <b>{{ t('attendStreak', { n: data.attendance.current }) }}</b>
          <span>{{ data.attendance.current && data.attendance.current >= data.attendance.best ? t('attendRecordNow') : t('attendRecord', { n: data.attendance.best }) }}</span>
        </div>
      </div>
      <div class="a-row" :aria-label="t('attendRecent')">
        <i v-for="(m, i) in data.attendance.recent" :key="i" :class="m" :title="t('attend_' + m)">{{ m === 'present' ? '✓' : m === 'excused' ? '–' : '✕' }}</i>
      </div>
    </div>

    <!-- the season: what there is to win while it lasts -->
    <NuxtLink v-if="seasonItem" to="/app/avatar?tab=rewards" class="season-card" :class="season">
      <img :src="rewardArt(seasonItem.key)" alt="">
      <div>
        <b>{{ t('seasonHello_' + season) }}</b>
        <span>{{ seasonWon ? t('seasonWon', { item: t('rw_' + seasonItem.key) }) : t('seasonToWin', { item: t('rw_' + seasonItem.key) }) }}</span>
      </div>
      <div class="go">{{ seasonWon ? '✓' : '›' }}</div>
    </NuxtLink>

    <NuxtLink to="/app/challenges?tab=missions" class="banner">
      <div class="ico">📸</div>
      <div><b>{{ t('missions') }}</b><span>{{ data?.missionsOpen ? t('missionsWaiting', { n: data.missionsOpen }) : t('missionsSub') }}</span></div>
      <span v-if="data?.missionsOpen" class="mcount">{{ data.missionsOpen }}</span>
      <div class="go">›</div>
    </NuxtLink>

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

      <!-- what they have actually earned stays on the dashboard; the full
           catalogue is a tap away rather than in the way -->
      <template v-if="earnedBadges.length">
        <div class="sec-title">{{ t('myBadges') }}</div>
        <div class="badge-grid">
          <NuxtLink v-for="b in earnedBadges" :key="b.id" :to="`/app/badges?open=${b.id}`" class="btile">
            <span class="disc" :class="{ art: b.art }"><BadgeIcon :art="b.art" :emoji="b.icon" :size="46" /></span>
            <span class="lbl">{{ lx(b) }}</span>
          </NuxtLink>
        </div>
      </template>
    </template>

    <NuxtLink v-if="showVenture" to="/app/venture" class="banner">
      <div class="ico">🏵️</div>
      <div><b>{{ t('ventureBook') }}</b><span>{{ t('ventureBookSub') }}</span></div>
      <div class="go">›</div>
    </NuxtLink>

    <!-- the Ενωμοτία's wins, with a 👏 to give -->
    <PatrolFeed />

    <div class="sec-title" style="display:flex;align-items:center;justify-content:space-between">
      <span>{{ t('nextAction') }}</span>
      <NuxtLink to="/app/calendar" class="tiny" style="color:var(--accent-deep);font-weight:650">{{ t('calendar') }} ›</NuxtLink>
    </div>
    <div v-if="upcomingEvents.length" class="card" style="display:flex;flex-direction:column;gap:13px">
      <div v-for="e in upcomingEvents" :key="e.id" class="ev">
        <div class="date"><b>{{ fmtDay(e.startsAt, locale).d }}</b><span>{{ fmtDay(e.startsAt, locale).m }}</span></div>
        <div class="info"><b><span class="dot" :class="e.scope" />{{ lx(e) }}</b><span>{{ sub(e) }}</span></div>
      </div>
    </div>
    <div v-else class="empty">{{ t('noUpcoming') }}</div>

    <!-- what happened while they were away, played once -->
    <ClientOnly><FxMoments /></ClientOnly>
  </AppShell>
</template>

<style scoped>
.who{display:flex; align-items:center; gap:14px}
.me-av{position:relative; flex:none; border-radius:50%; text-decoration:none; box-shadow:0 0 0 3px rgba(255,255,255,.55)}
.pen{position:absolute; right:-4px; bottom:-4px; width:24px; height:24px; border-radius:50%; background:#fff; color:var(--accent-deep); display:grid; place-items:center; font-size:12px; font-weight:800; box-shadow:0 2px 6px rgba(0,0,0,.2)}
.make{display:inline-block; margin-top:6px; font-size:12px; font-weight:700; color:#fff; text-decoration:none; background:rgba(255,255,255,.2); border-radius:999px; padding:4px 10px}
/* the points tile leads to the breakdown, so it reads as something to press —
   but it is a tile on a coloured card, not a run of body text, so it must not
   inherit the default link colour and underline */
.stat.tappable{cursor:pointer; color:inherit; text-decoration:none}
.stat.tappable b, .stat.tappable span{color:inherit; text-decoration:none}
.stat.tappable:active{transform:translateY(1px)}
.attend{background:#fff; border-radius:18px; padding:12px 14px; box-shadow:var(--shadow-sm, 0 2px 10px rgba(30,70,140,.08)); display:flex; flex-direction:column; gap:10px}
.a-top{display:flex; align-items:center; gap:12px}
.a-ico{width:40px; height:40px; border-radius:12px; background:#FFF3DC; display:grid; place-items:center; font-size:22px; flex:none}
.a-txt{display:flex; flex-direction:column; min-width:0}
.a-txt b{font-size:14px}
.a-txt span{font-size:12px; color:var(--muted)}
.a-row{display:flex; gap:6px}
.a-row i{flex:1; max-width:34px; height:26px; border-radius:8px; display:grid; place-items:center; font-style:normal; font-size:13px; font-weight:800}
.a-row i.present{background:#E2F5EA; color:#1F9D57}
.a-row i.excused{background:#EEF2F6; color:#8A97A8}
.a-row i.absent{background:#FCEBE7; color:#D8543C}
.of{font-size:.55em; opacity:.75; margin-left:1px}
.season-card{display:flex; align-items:center; gap:12px; padding:10px 14px 10px 10px; border-radius:18px; text-decoration:none; color:#fff; box-shadow:0 6px 18px rgba(30,70,140,.18)}
.season-card.christmas{background:linear-gradient(135deg,#C8303A,#7A1F2B)}
.season-card.easter{background:linear-gradient(135deg,#E8BB3E,#C8303A)}
.season-card.summer{background:linear-gradient(135deg,#F2A93B,#2E86AC)}
.season-card img{width:58px; height:58px; flex:none; object-fit:contain; filter:drop-shadow(0 3px 6px rgba(0,0,0,.25)); animation:wobble 3s ease-in-out infinite}
.season-card > div{flex:1; min-width:0; display:flex; flex-direction:column; gap:2px}
.season-card b{font-size:14.5px}
.season-card span{font-size:12.5px; opacity:.92; line-height:1.35}
.season-card .go{flex:none; font-size:20px; font-weight:800}
@keyframes wobble{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
.mcount{margin-left:auto; min-width:22px; height:22px; padding:0 6px; border-radius:11px; background:#E2582A; color:#fff; font-size:12px; font-weight:800; display:grid; place-items:center}
.mcount + .go{margin-left:6px}
</style>
