<script setup lang="ts">
/* The season, in the header: snow falling at Christmas, red eggs and
   candle sparks rising at Easter, campfire embers drifting up in the summer
   camp season. Behind the title, never in the way of a tap, still for anyone
   who asks for less motion. */
const season = useSeason()
const FLAKES = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 3.9 + (i % 4) * 6) % 100, size: 3 + (i % 4) * 1.6, delay: -((i * 0.73) % 9), dur: 6 + (i % 5) * 1.4, drift: (i % 2 ? 1 : -1) * (8 + (i % 3) * 6)
}))
</script>

<template>
  <div v-if="season" class="season" :class="season" aria-hidden="true">
    <template v-if="season === 'christmas'">
      <i v-for="(f, i) in FLAKES" :key="i" class="flake"
         :style="{ left: f.left + '%', width: f.size + 'px', height: f.size + 'px', animationDelay: f.delay + 's', animationDuration: f.dur + 's', '--dx': f.drift + 'px' }" />
      <span class="deco tree">🎄</span>
    </template>
    <template v-else-if="season === 'easter'">
      <i v-for="(f, i) in FLAKES.slice(0, 14)" :key="i" class="spark"
         :style="{ left: f.left + '%', animationDelay: f.delay + 's', animationDuration: f.dur + 's', '--dx': f.drift + 'px' }" />
      <i class="deco redegg e1" /><i class="deco redegg e3" /><span class="deco egg e2">🕯️</span>
    </template>
    <template v-else>
      <i v-for="(f, i) in FLAKES.slice(0, 18)" :key="i" class="ember"
         :style="{ left: f.left + '%', width: f.size * 0.8 + 'px', height: f.size * 0.8 + 'px', animationDelay: f.delay + 's', animationDuration: f.dur * 0.8 + 's', '--dx': f.drift + 'px' }" />
      <span class="deco tree">🏕️</span>
    </template>
  </div>
</template>

<style scoped>
.season{position:absolute; inset:0; overflow:hidden; pointer-events:none; z-index:0}
.flake{position:absolute; top:-10px; border-radius:50%; background:#fff; opacity:.85; animation:snow linear infinite; box-shadow:0 0 4px rgba(255,255,255,.7)}
.spark{position:absolute; bottom:-6px; width:4px; height:4px; border-radius:50%; background:#FFD84A; box-shadow:0 0 6px #FFB62E; animation:rise linear infinite}
.ember{position:absolute; bottom:-6px; border-radius:50%; background:#FF9A3C; box-shadow:0 0 6px #FF7A1A; animation:rise linear infinite}
.deco{position:absolute; right:14px; bottom:8px; font-size:30px; opacity:.85; filter:drop-shadow(0 2px 4px rgba(0,0,0,.25))}
.redegg{width:17px; height:22px; border-radius:50% 50% 50% 50% / 60% 60% 40% 40%; opacity:1;
  background:radial-gradient(circle at 35% 28%, #FF8A8A 0 14%, #D62C36 34%, #9C1420 100%)}
.redegg.e1{right:56px; bottom:10px; transform:rotate(-14deg)}
.redegg.e3{right:78px; bottom:8px; width:14px; height:18px; transform:rotate(10deg)}
.egg.e2{font-size:24px}
@keyframes snow{to{transform:translate(var(--dx), 240px)}}
@keyframes rise{0%{transform:translate(0,0); opacity:0}15%{opacity:1}100%{transform:translate(var(--dx), -220px); opacity:0}}
@media (prefers-reduced-motion: reduce){.flake,.spark,.ember{animation:none; display:none}}
</style>
