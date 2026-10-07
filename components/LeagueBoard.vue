<script setup lang="ts">
/* The league table, as Duolingo draws one, in light: a podium for the first
   three, a ribbon medal beside them, everyone's avatar, their points on the
   right, and the viewer's own row picked out in green. Ties share a place.
   The same for the units. Members see their own sector's; the quiz sector's
   Βαθμοφόροι see it from their side, with no row of their own. */
// for the Βαθμοφόροι: where tapping a member opens (their points)
const props = defineProps<{ data: any, memberLink?: (r: any) => string }>()
const NuxtLinkC = resolveComponent('NuxtLink')
const data = toRef(props, 'data')
const { t } = useI18n()
const lx = useLx()
const name = useName()
const { words: sectorWords } = useSectorWords()
const tab = ref<'ind' | 'pat'>('ind')
/* the section's rule: the average per member, or the sum */
const isSum = computed(() => data.value?.teamScoring === 'sum')

/** Places with ties shared: two on 40 points are both 1st. */
function places(list: any[], key: string) {
  return list.map((r, i) => 1 + list.filter((o, j) => j < i && o[key] > r[key]).length)
}
const indPlaces = computed(() => places(data.value?.individual || [], 'points'))
const patPlaces = computed(() => places(data.value?.patrols || [], 'score'))
const mine = computed(() => {
  const i = (data.value?.individual || []).findIndex((r: any) => r.me)
  return i < 0 ? null : { place: indPlaces.value[i], row: data.value.individual[i] }
})
const myPatrol = computed(() => mine.value?.row?.patrolId ?? null)

/* the podium: the first three, by first name, with their points */
const firstName = (r: any) => name(r).split(' ')[0]
const indPodium = computed(() => (data.value?.individual || []).slice(0, 3).map((r: any, i: number) => ({
  key: r.id, name: firstName(r) + (r.birthday ? ' 🎂' : ''), sub: `${r.points} ${t('pts')}`, place: indPlaces.value[i], avatar: r.avatar, me: r.me, party: r.birthday, to: props.memberLink?.(r)
})))
const patPodium = computed(() => (data.value?.patrols || []).slice(0, 3).map((p: any, i: number) => ({
  key: p.id, name: lx(p, 'name'), sub: `${p.score} ${isSum.value ? t('pts') : t('avg')}`, place: patPlaces.value[i], emblem: p.emblem || '⚜️', me: p.id === myPatrol.value
})))

const MEDAL: Record<number, { face: string, rim: string, ribbon: string, ink: string }> = {
  1: { face: '#FFC800', rim: '#E5A400', ribbon: '#F2A900', ink: '#8A5A00' },
  2: { face: '#DCE4EE', rim: '#AEBBCB', ribbon: '#B7C3D2', ink: '#5F6F84' },
  3: { face: '#F5A765', rim: '#D67E36', ribbon: '#DE8A43', ink: '#7A3E0C' }
}
</script>

<template>
  <div class="seg">
    <button :class="{ on: tab === 'ind' }" @click="tab = 'ind'">{{ t('individual') }}</button>
    <button :class="{ on: tab === 'pat' }" @click="tab = 'pat'">{{ sectorWords.units }}</button>
  </div>

  <template v-if="tab === 'ind'">
    <Podium v-if="indPodium.length" :key="'ind'" :items="indPodium" />
    <div v-if="mine" class="where">
      <span class="cup">{{ mine.place === 1 ? '🏆' : mine.place <= 3 ? '🏅' : '⚜️' }}</span>
      <b>{{ t('boardYouAre', { n: mine.place }) }}</b>
    </div>
    <div class="league">
      <component :is="memberLink ? NuxtLinkC : 'div'" v-for="(r, i) in data?.individual" :key="r.id" class="row" :class="{ me: r.me, link: !!memberLink }"
                 :to="memberLink ? memberLink(r) : undefined">
        <div class="place">
          <svg v-if="MEDAL[indPlaces[i]]" class="medal" viewBox="0 0 32 36" aria-hidden="true">
            <path d="M8 22 4 34l5-2 3 4 4-12Z M24 22l4 12-5-2-3 4-4-12Z" :fill="MEDAL[indPlaces[i]].ribbon" />
            <circle cx="16" cy="15" r="13" :fill="MEDAL[indPlaces[i]].rim" />
            <circle cx="16" cy="14" r="11" :fill="MEDAL[indPlaces[i]].face" />
            <text x="16" y="19" text-anchor="middle" font-size="13" font-weight="800" :fill="MEDAL[indPlaces[i]].ink">{{ indPlaces[i] }}</text>
          </svg>
          <span v-else class="num">{{ indPlaces[i] }}</span>
        </div>
        <Avatar :name="name(r)" :avatar="r.avatar" :size="46" :party="r.birthday" />
        <div class="who">
          <b>{{ name(r) }}<template v-if="r.birthday"> 🎂</template></b>
          <span>{{ data?.patrolNames?.[r.patrolId]?.emblem }} {{ lx(data?.patrolNames?.[r.patrolId], 'name') }}{{ r.me ? ' · ' + t('you') : '' }}</span>
        </div>
        <div class="pts">{{ r.points }} <small>{{ t('pts') }}</small></div>
        <span v-if="memberLink" class="chev">›</span>
      </component>
    </div>
  </template>

  <template v-else>
    <Podium v-if="patPodium.length" :key="'pat'" :items="patPodium" />
    <div class="league">
      <div v-for="(p, i) in data?.patrols" :key="p.id" class="row" :class="{ me: p.id === myPatrol }">
        <div class="place">
          <svg v-if="MEDAL[patPlaces[i]]" class="medal" viewBox="0 0 32 36" aria-hidden="true">
            <path d="M8 22 4 34l5-2 3 4 4-12Z M24 22l4 12-5-2-3 4-4-12Z" :fill="MEDAL[patPlaces[i]].ribbon" />
            <circle cx="16" cy="15" r="13" :fill="MEDAL[patPlaces[i]].rim" />
            <circle cx="16" cy="14" r="11" :fill="MEDAL[patPlaces[i]].face" />
            <text x="16" y="19" text-anchor="middle" font-size="13" font-weight="800" :fill="MEDAL[patPlaces[i]].ink">{{ patPlaces[i] }}</text>
          </svg>
          <span v-else class="num">{{ patPlaces[i] }}</span>
        </div>
        <div class="emblem">{{ p.emblem }}</div>
        <div class="who">
          <b>{{ lx(p, 'name') }}</b>
          <span>{{ p.members }} {{ t('members') }}</span>
        </div>
        <div class="pts">{{ p.score }} <small>{{ isSum ? t('pts') : t('avg') }}</small></div>
      </div>
    </div>
    <div class="tiny muted">{{ isSum ? t('sumNote') : t('avgNote') }}</div>
  </template>
</template>

<style scoped>
.row.link{text-decoration:none; color:inherit; cursor:pointer}
.row.link:active{transform:translateY(1px)}
.row .chev{flex:none; color:var(--muted); font-size:18px; margin-left:2px}
.where{display:flex; align-items:center; justify-content:center; gap:10px; padding:4px 0 2px}
.where .cup{font-size:30px; line-height:1}
.where b{font-size:18px; font-weight:800; letter-spacing:-.01em}
.league{background:#fff; border:2px solid #E5EAF0; border-radius:20px; overflow:hidden}
.row{display:flex; align-items:center; gap:12px; padding:11px 14px}
.row + .row{border-top:1px solid #EEF2F6}
.row.me{background:#E6F6EC}
.row.me + .row, .row + .row.me{border-top-color:transparent}
.place{flex:none; width:30px; display:flex; justify-content:center}
.medal{width:28px; height:32px; display:block}
.num{font-size:16px; font-weight:800; color:var(--green)}
.emblem{flex:none; width:46px; height:46px; border-radius:50%; background:var(--accent-soft); display:grid; place-items:center; font-size:24px}
.who{flex:1; min-width:0; display:flex; flex-direction:column; gap:1px}
.who b{font-size:15px; font-weight:750; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.who span{font-size:12px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.row.me .who b, .row.me .pts{color:#1F9D57}
.pts{flex:none; font-size:15px; font-weight:800; color:#8A97A8; white-space:nowrap}
.pts small{font-size:11px; font-weight:700}
</style>
