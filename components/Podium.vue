<script setup lang="ts">
/* The top three on a podium, as Duolingo shows a league: the winner in the
   middle on the tallest pedestal, second on the left, third on the right —
   each with a flat cartoon trophy in gold, silver or bronze, their avatar (or
   their unit's emblem) above it, and their name and points below. */
import type { Avatar as AvatarCfg } from '~/utils/avatar'
type Item = { key: string | number, name: string, sub: string, place: number, avatar?: Partial<AvatarCfg> | null, emblem?: string, me?: boolean, party?: boolean }
const props = defineProps<{ items: Item[] }>()

/* drawn order: second, first, third — whatever is there */
const slots = computed(() => [props.items[1], props.items[0], props.items[2]]
  .map((it, i) => it ? { ...it, pos: [2, 1, 3][i] } : null))

const METAL: Record<number, { body: string, shade: string, light: string, base: string }> = {
  1: { body: '#FFC800', shade: '#E5A400', light: '#FFE58A', base: '#C98A00' },
  2: { body: '#DCE4EE', shade: '#AEBBCB', light: '#F4F7FB', base: '#8E9CAF' },
  3: { body: '#F5A765', shade: '#D67E36', light: '#FFCB9A', base: '#A95A1E' }
}
const metal = (place: number) => METAL[Math.min(Math.max(place, 1), 3)]
</script>

<template>
  <div class="podium">
    <div v-for="(s, i) in slots" :key="i" class="col" :class="s ? `p${s.pos}` : 'empty'">
      <template v-if="s">
        <div class="who">
          <div class="face" :style="{ boxShadow: `0 0 0 3px ${metal(s.place).body}` }">
            <Avatar v-if="!s.emblem" :name="s.name" :avatar="s.avatar" :size="s.pos === 1 ? 52 : 44" :party="s.party" />
            <span v-else class="emblem" :class="{ big: s.pos === 1 }">{{ s.emblem }}</span>
          </div>
        </div>
        <!-- the trophy: a cup on a stem and a stepped base, flat colour with
             a deeper tone for its shade and a lighter one for its shine -->
        <svg class="cup" viewBox="0 0 64 72" aria-hidden="true">
          <path d="M14 10H4v6c0 9 6 15 14 16" fill="none" :stroke="metal(s.place).shade" stroke-width="5" stroke-linecap="round" />
          <path d="M50 10h10v6c0 9-6 15-14 16" fill="none" :stroke="metal(s.place).shade" stroke-width="5" stroke-linecap="round" />
          <path d="M12 6h40v14c0 13-9 22-20 22S12 33 12 20Z" :fill="metal(s.place).body" />
          <path d="M38 6h14v14c0 13-9 22-20 22 7-4 6-13 6-22Z" :fill="metal(s.place).shade" />
          <path d="M18 10h6v10c0 6 2 11 6 14-7-1-12-7-12-14Z" :fill="metal(s.place).light" />
          <rect x="27" y="41" width="10" height="11" :fill="metal(s.place).shade" />
          <rect x="18" y="51" width="28" height="8" rx="3" :fill="metal(s.place).body" />
          <rect x="14" y="58" width="36" height="10" rx="4" :fill="metal(s.place).base" />
          <text x="32" y="28" text-anchor="middle" font-size="16" font-weight="900" :fill="metal(s.place).base">{{ s.place }}</text>
        </svg>
        <div class="stand">
          <b :class="{ me: s.me }">{{ s.name }}</b>
          <span>{{ s.sub }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.podium{display:grid; grid-template-columns:1fr 1.15fr 1fr; align-items:end; gap:8px; padding:6px 4px 0}
.col{display:flex; flex-direction:column; align-items:center; animation:rise .7s cubic-bezier(.2,.9,.3,1.25) both}
.col.p1{animation-delay:.15s}
.col.p3{animation-delay:.3s}
@keyframes rise{from{opacity:0; transform:translateY(24px) scale(.85)}}
.who{margin-bottom:-6px; position:relative; z-index:1}
.face{border-radius:50%; background:#fff; padding:2px; display:grid; place-items:center}
.emblem{width:44px; height:44px; border-radius:50%; background:var(--accent-soft); display:grid; place-items:center; font-size:22px}
.emblem.big{width:52px; height:52px; font-size:26px}
.cup{display:block; width:66px; height:auto; filter:drop-shadow(0 3px 0 rgba(30,70,140,.12))}
.p1 .cup{width:84px}
.p3 .cup{width:60px}
/* the pedestal: a pale step, tallest for the winner, carrying the name */
.stand{width:100%; margin-top:2px; border-radius:14px 14px 4px 4px; background:linear-gradient(180deg,#E4EFFB 0,#E4EFFB 10px,#CFE1F5 10px); border-bottom:4px solid #B7CEEA;
  display:flex; flex-direction:column; align-items:center; justify-content:flex-start; gap:1px; padding:12px 4px 8px; text-align:center}
.p1 .stand{min-height:78px}
.p2 .stand{min-height:60px}
.p3 .stand{min-height:48px}
.stand b{font-size:13px; font-weight:800; color:var(--ink); max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.stand b.me{color:#1F9D57}
.stand span{font-size:11.5px; font-weight:700; color:#6F7F93}
</style>
