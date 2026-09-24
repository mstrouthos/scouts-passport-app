<script setup lang="ts">
/* The troop crest as a coin you could pick up: a face, a back, and a rim with
   real thickness — a stack of thin slices, each a pixel apart in depth — so
   when it turns the edge shows as gold metal rather than the disc vanishing
   to a line. `spin` flips it in on arrival and then turns it now and then;
   a tap turns it once more. */
const props = withDefaults(defineProps<{ size?: number; spin?: boolean }>(), { size: 84, spin: true })
const RIM = 10                                  // slices; the coin is RIM px thick
const turning = ref(false)
function flip() {
  if (turning.value) return
  turning.value = true
  setTimeout(() => { turning.value = false }, 1100)
}
</script>

<template>
  <div class="coin-stage" :style="{ width: props.size + 'px', height: props.size + 'px', '--s': props.size + 'px' }" @click="flip">
    <div class="coin" :class="{ spin: props.spin, turning }">
      <i v-for="k in RIM" :key="k" class="rim" :style="{ transform: `translateZ(${k - RIM / 2 - 0.5}px)` }" />
      <div class="face front"><img src="/images/logo-256.png" alt="30ό Σύστημα Ελλήνων Προσκόπων Αμμοχώστου"></div>
      <div class="face back"><span>30</span><small>1945</small></div>
      <div class="shine" />
    </div>
  </div>
</template>

<style scoped>
.coin-stage{perspective:600px; cursor:pointer; -webkit-tap-highlight-color:transparent}
.coin{
  position:relative; width:100%; height:100%; transform-style:preserve-3d;
  transform:rotateY(calc(var(--px, 0) * 22deg)) rotateX(calc(var(--py, 0) * -12deg));
}
.coin.spin{animation:enter 1.4s cubic-bezier(.2,.9,.3,1) both, idle 9s 1.4s ease-in-out infinite}
.coin.turning{animation:turn 1.1s cubic-bezier(.3,1.2,.5,1)}
.rim{
  position:absolute; inset:0; border-radius:50%;
  background:linear-gradient(90deg,#8C6A12,#E9C24A 40%,#FFF0A8 55%,#C99A22 75%,#7A5A0E);
  /* a ring, not a disc: the edge gets its thickness, and there is nothing in
     the middle to paint over either face as it turns */
  -webkit-mask:radial-gradient(circle closest-side, transparent calc(100% - 4px), #000 calc(100% - 3.5px));
  mask:radial-gradient(circle closest-side, transparent calc(100% - 4px), #000 calc(100% - 3.5px));
}
.face{
  position:absolute; inset:0; border-radius:50%; backface-visibility:hidden; overflow:hidden;
  display:grid; place-items:center;
}
.front{transform:translateZ(5.5px); background:#F4DE3A; box-shadow:inset 0 0 0 2px rgba(120,90,10,.35)}
.front img{width:100%; height:100%; object-fit:cover}
.back{
  transform:rotateY(180deg) translateZ(5.5px);
  background:radial-gradient(circle at 40% 35%,#FFF1A0,#F2C230 55%,#C9951B);
  color:#1F2A6B; font-weight:800; line-height:1; text-align:center;
  box-shadow:inset 0 0 0 3px #1F2A6B, inset 0 0 0 6px #F2C230;
  flex-direction:column; display:flex; justify-content:center;
}
.back span{font-size:calc(var(--s) * .38)}
.back small{font-size:calc(var(--s) * .12); letter-spacing:.12em; margin-top:2px}
/* a sweep of light across the face as it turns */
.shine{
  position:absolute; inset:0; border-radius:50%; transform:translateZ(6px); pointer-events:none;
  background:linear-gradient(115deg, transparent 38%, rgba(255,255,255,.55) 50%, transparent 62%);
  background-size:260% 100%; background-position:120% 0; mix-blend-mode:screen;
  animation:sweep 4.5s 1.6s ease-in-out infinite;
}
/* the spin uses `rotate`/`translate`, separate from `transform`, so it adds
   to the parallax tilt instead of replacing it */
@keyframes enter{
  0%{translate:0 -40px; rotate:y -540deg; scale:.4; opacity:0}
  30%{opacity:1}
  100%{translate:0 0; rotate:y 0deg; scale:1}
}
@keyframes idle{
  0%,82%,100%{rotate:y 0deg}
  90%{rotate:y 180deg}
  96%{rotate:y 360deg}
}
@keyframes turn{from{rotate:y 0deg}to{rotate:y 360deg}}
@keyframes sweep{0%,60%{background-position:120% 0}85%,100%{background-position:-20% 0}}
@media (prefers-reduced-motion: reduce){ .coin, .coin.spin, .shine{animation:none} }
</style>
