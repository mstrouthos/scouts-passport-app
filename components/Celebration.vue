<script setup lang="ts">
/* The moment something is awarded. A medal flies in out of the dark, spinning,
   lands facing you with a ring of light, and hangs there on its ribbon,
   turning gently — with a real edge, because it is built in 3D: a face, a
   back with the troop crest, and a rim of stacked slices. Drag it and it
   spins under your finger. Confetti tumbles in depth behind it and the
   phoenix cheers below. Shown when a scout opens the notification that told
   them, so the moment lands somewhere. */
const props = defineProps<{ emoji: string, title: string, subtitle?: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const RIM = 12
/* fixed spreads rather than random, so it looks the same every time */
const SPARKS = Array.from({ length: 16 }, (_, i) => ({ angle: i * 22.5, len: 36 + (i % 3) * 14, delay: (i % 4) * 40 }))
const CONFETTI = Array.from({ length: 34 }, (_, i) => ({
  left: (i * 3.1 + (i % 4) * 5) % 100,
  depth: -((i * 53) % 320),
  delay: (i % 9) * 160,
  duration: 3000 + (i % 6) * 380,
  tone: ['#F5D547', '#2E7D5B', '#E7643C', '#4E8FD6', '#B87333', '#FFFFFF'][i % 6],
  spinX: 360 + (i % 5) * 180, spinY: (i % 2 ? 1 : -1) * (180 + (i % 4) * 120),
  wide: i % 3 === 0
}))

/* drag to spin: the medal follows the finger, then eases back to its sway */
const drag = ref<number | null>(null)
const spin = ref(0)
let startX = 0, startSpin = 0
function down(e: PointerEvent) {
  startX = e.clientX; startSpin = spin.value; drag.value = e.pointerId
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function move(e: PointerEvent) {
  if (drag.value !== e.pointerId) return
  spin.value = startSpin + (e.clientX - startX) * 1.1
}
function up() {
  drag.value = null
  // settle on the nearest face, front or back
  spin.value = Math.round(spin.value / 180) * 180
}
const landed = ref(false)
onMounted(() => { setTimeout(() => { landed.value = true }, 1250) })
</script>

<template>
  <div class="celebrate" role="dialog" aria-live="polite" @click.self="emit('close')">
    <div class="confetti-field" aria-hidden="true">
      <i v-for="(c, i) in CONFETTI" :key="i" class="cf" :class="{ wide: c.wide }"
         :style="{ left: c.left + '%', background: c.tone, '--z': c.depth + 'px',
                   '--sx': c.spinX + 'deg', '--sy': c.spinY + 'deg',
                   animationDelay: c.delay + 'ms', animationDuration: c.duration + 'ms' }" />
    </div>

    <div class="stage">
      <div class="rays" aria-hidden="true" />
      <div class="medal-wrap" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
        <div class="ribbon" aria-hidden="true"><i class="l" /><i class="r" /></div>
        <div class="flyer">
          <div class="medal" :class="{ dragging: drag !== null, landed }"
               :style="{ '--spin': spin + 'deg' }">
            <i v-for="k in RIM" :key="k" class="rim" :style="{ transform: `translateZ(${k - RIM / 2 - 0.5}px)` }" />
            <div class="face front">
              <div class="ring"><span class="emoji">{{ props.emoji }}</span></div>
            </div>
            <div class="face back"><img src="/images/logo-256.png" alt=""></div>
            <div class="gleam" />
          </div>
        </div>
        <div class="shock" :class="{ go: landed }" aria-hidden="true" />
        <div class="burst" :class="{ go: landed }" aria-hidden="true">
          <i v-for="(s, i) in SPARKS" :key="i" :style="{ '--a': s.angle + 'deg', '--l': s.len + 'px', animationDelay: s.delay + 'ms' }" />
        </div>
      </div>

      <div class="title">{{ props.title }}</div>
      <div v-if="props.subtitle" class="sub">{{ props.subtitle }}</div>
      <div class="hint">↔ {{ $t('spinMedal') }}</div>
      <button class="btn" @click.stop="emit('close')">{{ $t('nice') }}</button>
    </div>
    <MascotPhoenix class="cheer" pose="cheer" />
  </div>
</template>

<style scoped>
.celebrate{
  position:fixed; inset:0; z-index:120; display:grid; place-items:center; overflow:hidden; padding:24px;
  background:radial-gradient(80% 60% at 50% 40%, rgba(40,52,96,.88), rgba(6,10,24,.96));
  -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px);
  perspective:900px; animation:fade .3s both;
}
.stage{position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; text-align:center; max-width:330px}

/* light behind the medal */
.rays{
  position:absolute; top:-40px; left:50%; width:520px; height:520px; margin-left:-260px; border-radius:50%;
  background:repeating-conic-gradient(from 0deg, rgba(255,214,110,.22) 0deg 7deg, transparent 7deg 22deg);
  -webkit-mask:radial-gradient(circle, #000 18%, transparent 62%); mask:radial-gradient(circle, #000 18%, transparent 62%);
  animation:rays 18s linear infinite, fade 1s .9s both;
}

.medal-wrap{position:relative; width:180px; height:230px; perspective:700px; touch-action:none; cursor:grab}
.ribbon{position:absolute; left:50%; top:0; width:90px; height:96px; margin-left:-45px; animation:fade .4s 1s both}
.ribbon i{position:absolute; top:0; width:40px; height:96px}
.ribbon .l{left:2px; background:linear-gradient(90deg,#1F2A6B 0 45%,#F2C230 45% 55%,#1F2A6B 55%); transform:skewX(14deg); clip-path:polygon(0 0,100% 0,100% 100%,50% 86%,0 100%)}
.ribbon .r{right:2px; background:linear-gradient(90deg,#1F2A6B 0 45%,#F2C230 45% 55%,#1F2A6B 55%); transform:skewX(-14deg); clip-path:polygon(0 0,100% 0,100% 100%,50% 86%,0 100%)}

.flyer{position:absolute; left:50%; top:62px; width:160px; height:160px; margin-left:-80px; transform-style:preserve-3d;
  animation:fly 1.25s cubic-bezier(.16,.9,.3,1) both}
.medal{
  position:absolute; inset:0; transform-style:preserve-3d;
  transform:rotateY(var(--spin, 0deg));
  transition:transform .6s cubic-bezier(.3,1.4,.5,1);
}
.medal.dragging{transition:none}
.medal.landed:not(.dragging){animation:sway 4.5s ease-in-out infinite}
.rim{position:absolute; inset:0; border-radius:50%;
  background:linear-gradient(90deg,#7A5A0E,#E9C24A 35%,#FFF3B0 50%,#C99A22 70%,#6E500C);
  /* a ring, not a disc: the edge gets its thickness, and there is nothing in
     the middle to paint over either face as it turns */
  -webkit-mask:radial-gradient(circle closest-side, transparent calc(100% - 4px), #000 calc(100% - 3.5px));
  mask:radial-gradient(circle closest-side, transparent calc(100% - 4px), #000 calc(100% - 3.5px));}
.face{position:absolute; inset:0; border-radius:50%; backface-visibility:hidden; display:grid; place-items:center; overflow:hidden}
.front{
  transform:translateZ(6.5px);
  background:radial-gradient(circle at 36% 30%,#FFF4B8,#F7D053 42%,#E0A92A 72%,#B98217);
  box-shadow:inset 0 0 0 5px #F9E08A, inset 0 0 0 7px #B5841A, inset 0 -10px 24px rgba(120,70,0,.35);
}
.ring{
  width:112px; height:112px; border-radius:50%; display:grid; place-items:center;
  background:radial-gradient(circle at 40% 35%,#FFFBEA,#FBE7A6); box-shadow:inset 0 2px 8px rgba(150,100,10,.35), 0 1px 0 rgba(255,255,255,.7);
}
.emoji{font-size:58px; line-height:1; filter:drop-shadow(0 3px 2px rgba(120,70,0,.3))}
.back{transform:rotateY(180deg) translateZ(6.5px); background:#F4DE3A}
.back img{width:100%; height:100%; object-fit:cover}
.gleam{
  position:absolute; inset:0; border-radius:50%; transform:translateZ(7px); pointer-events:none;
  background:linear-gradient(115deg, transparent 36%, rgba(255,255,255,.7) 50%, transparent 64%);
  background-size:260% 100%; mix-blend-mode:screen; animation:gleam 3.2s 1.3s ease-in-out infinite;
}

/* the landing: a ring of light and a burst of sparks */
.shock{position:absolute; left:50%; top:142px; width:160px; height:160px; margin:-80px 0 0 -80px; border-radius:50%;
  border:3px solid rgba(255,220,120,.9); opacity:0}
.shock.go{animation:shock .8s ease-out both}
.burst{position:absolute; left:50%; top:142px}
.burst i{position:absolute; width:5px; height:18px; margin:-9px 0 0 -2.5px; border-radius:3px;
  background:linear-gradient(#FFF6C8,#F5C542); opacity:0; transform:rotate(var(--a)) translateY(-80px)}
.burst.go i{animation:spark .7s ease-out both}

.title{margin-top:6px; font-size:21px; font-weight:800; color:#FFF6DC; line-height:1.25; animation:up .6s 1.15s both}
.sub{margin-top:5px; font-size:13px; color:rgba(255,255,255,.78); animation:up .6s 1.25s both}
.hint{margin-top:10px; font-size:11px; color:rgba(255,255,255,.45); animation:up .6s 1.8s both}
.btn{margin-top:16px; background:linear-gradient(180deg,#FFD65C,#F0B429); color:#3E2C03; animation:up .6s 1.35s both}

/* confetti tumbling in depth */
.confetti-field{position:absolute; inset:0; transform-style:preserve-3d; pointer-events:none}
.cf{position:absolute; top:-30px; width:9px; height:14px; border-radius:2px; transform-style:preserve-3d;
  animation:fall linear infinite both}
.cf.wide{width:14px; height:7px}
.cheer{position:absolute; bottom:-34px; left:50%; width:150px; translate:-50% 0; z-index:1; animation:peek .8s 1.2s cubic-bezier(.3,1.4,.5,1) both}

@keyframes fade{from{opacity:0}}
@keyframes up{from{opacity:0; transform:translateY(14px)}}
@keyframes rays{to{rotate:360deg}}
@keyframes fly{
  0%{transform:translateZ(-900px) translateY(-60px) rotateY(-900deg) rotateX(30deg); opacity:0}
  25%{opacity:1}
  78%{transform:translateZ(40px) translateY(0) rotateY(12deg) rotateX(-4deg)}
  100%{transform:translateZ(0) translateY(0) rotateY(0) rotateX(0)}
}
@keyframes sway{0%,100%{transform:rotateY(calc(var(--spin, 0deg) - 16deg))}50%{transform:rotateY(calc(var(--spin, 0deg) + 16deg))}}
@keyframes gleam{0%,55%{background-position:120% 0}80%,100%{background-position:-20% 0}}
@keyframes shock{0%{opacity:1; transform:scale(.8)}100%{opacity:0; transform:scale(2.2); border-width:1px}}
@keyframes spark{
  0%{opacity:0; transform:rotate(var(--a)) translateY(-70px) scaleY(.4)}
  30%{opacity:1}
  100%{opacity:0; transform:rotate(var(--a)) translateY(calc(-80px - var(--l))) scaleY(1)}
}
@keyframes fall{
  from{transform:translate3d(0,-10vh,var(--z)) rotateX(0) rotateY(0)}
  to{transform:translate3d(0,112vh,var(--z)) rotateX(var(--sx)) rotateY(var(--sy))}
}
@keyframes peek{from{translate:-50% 120px}}

/* anyone who asked for less motion gets the medal, still */
@media (prefers-reduced-motion: reduce){
  .flyer, .medal.landed:not(.dragging), .rays, .gleam, .title, .sub, .btn, .hint, .ribbon, .cheer{animation:none}
  .cf, .burst, .shock{display:none}
}
</style>
