<script setup lang="ts">
import { shortName } from '~/utils/shortName'
/* A mini-game's table, as the scouts' league shows one: the first three on
   the podium with their trophies, where I stand, then everyone with a medal
   for the first three places. The rows come ranked, each with its place
   (ties share one), what it is ranked by, and an optional line under the name. */
type Row = {
  id: number, firstName: string, lastName: string, photo?: string | null, figure?: any, avatar?: any,
  me?: boolean, place: number, value: string, unit?: string, sub?: string
}
const props = defineProps<{ rows: Row[] }>()
const { t } = useI18n()

const podium = computed(() => props.rows.slice(0, 3).map(r => ({
  key: r.id, name: shortName(r), sub: `${r.value}${r.unit ? ' ' + r.unit : ''}`, place: r.place,
  avatar: r.figure || r.avatar, photo: r.photo, me: r.me
})))
const mine = computed(() => props.rows.find(r => r.me) || null)

const MEDAL: Record<number, { face: string, rim: string, ribbon: string, ink: string }> = {
  1: { face: '#FFC800', rim: '#E5A400', ribbon: '#F2A900', ink: '#8A5A00' },
  2: { face: '#DCE4EE', rim: '#AEBBCB', ribbon: '#B7C3D2', ink: '#5F6F84' },
  3: { face: '#F5A765', rim: '#D67E36', ribbon: '#DE8A43', ink: '#7A3E0C' }
}
</script>

<template>
  <div class="gboard">
    <Podium v-if="podium.length" :items="podium" />
    <div v-if="mine" class="where">
      <span class="cup">{{ mine.place === 1 ? '🏆' : mine.place <= 3 ? '🏅' : '⚜️' }}</span>
      <b>{{ t('boardYouAre', { n: mine.place }) }}</b>
    </div>
    <div class="league">
      <div v-for="r in rows" :key="r.id" class="row" :class="{ me: r.me }">
        <div class="place">
          <svg v-if="MEDAL[r.place]" class="medal" viewBox="0 0 32 36" aria-hidden="true">
            <path d="M8 22 4 34l5-2 3 4 4-12Z M24 22l4 12-5-2-3 4-4-12Z" :fill="MEDAL[r.place].ribbon" />
            <circle cx="16" cy="15" r="13" :fill="MEDAL[r.place].rim" />
            <circle cx="16" cy="14" r="11" :fill="MEDAL[r.place].face" />
            <text x="16" y="19" text-anchor="middle" font-size="13" font-weight="800" :fill="MEDAL[r.place].ink">{{ r.place }}</text>
          </svg>
          <span v-else class="num">{{ r.place }}</span>
        </div>
        <Avatar :name="`${r.firstName} ${r.lastName}`" :photo="r.photo" :avatar="r.figure || r.avatar" :size="42" no-zoom />
        <div class="who">
          <b>{{ r.firstName }} {{ r.lastName }}</b>
          <span v-if="r.sub || r.me">{{ r.sub }}{{ r.me ? (r.sub ? ' · ' : '') + t('you') : '' }}</span>
        </div>
        <div class="pts">{{ r.value }} <small v-if="r.unit">{{ r.unit }}</small></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gboard{display:flex; flex-direction:column; gap:10px}
.where{display:flex; align-items:center; justify-content:center; gap:10px; padding:4px 0 2px}
.where .cup{font-size:30px; line-height:1}
.where b{font-size:18px; font-weight:800; letter-spacing:-.01em}
.league{background:#fff; border:2px solid #E5EAF0; border-radius:20px; overflow:hidden}
.row{display:flex; align-items:center; gap:12px; padding:10px 14px}
.row + .row{border-top:1px solid #EEF2F6}
.row.me{background:#E6F6EC}
.row.me + .row, .row + .row.me{border-top-color:transparent}
.place{flex:none; width:30px; display:flex; justify-content:center}
.medal{width:28px; height:32px; display:block}
.num{font-size:16px; font-weight:800; color:var(--green)}
.who{flex:1; min-width:0; display:flex; flex-direction:column; gap:1px}
.who b{font-size:15px; font-weight:750; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.who span{font-size:12px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.row.me .who b, .row.me .pts{color:#1F9D57}
.pts{flex:none; font-size:15px; font-weight:800; color:#8A97A8; white-space:nowrap; font-variant-numeric:tabular-nums}
.pts small{font-size:11px; font-weight:700}
</style>
