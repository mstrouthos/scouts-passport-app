<script setup lang="ts">
/* A small ceremony for something just awarded: the disc pops in, a ring of
   sparks bursts once, and confetti falls behind it. Shown when a scout opens
   the notification that told them, so the moment lands somewhere. */
const props = defineProps<{ emoji: string, title: string, subtitle?: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()

/* Fixed spread rather than random placement, so it reads as a burst and not as
   scattered noise — and so it looks the same every time it is opened. */
const SPARKS = Array.from({ length: 12 }, (_, i) => ({ angle: i * 30, delay: (i % 4) * 60 }))
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 4.5 + (i % 3) * 2) % 100,
  delay: (i % 7) * 130,
  duration: 2400 + (i % 5) * 320,
  tone: ['#F5D547', '#2E7D5B', '#E7643C', '#4E8FD6', '#B87333'][i % 5],
  tilt: (i % 2 ? 1 : -1) * (18 + (i % 4) * 12)
}))
</script>

<template>
  <div class="celebrate" role="dialog" aria-live="polite" @click="emit('close')">
    <i v-for="(c, i) in CONFETTI" :key="'c' + i" class="confetti"
       :style="{ left: c.left + '%', background: c.tone,
                 animationDelay: c.delay + 'ms', animationDuration: c.duration + 'ms',
                 '--tilt': c.tilt + 'deg' }" />

    <div class="stage">
      <div class="burst">
        <i v-for="(s, i) in SPARKS" :key="'s' + i" class="spark"
           :style="{ '--a': s.angle + 'deg', animationDelay: s.delay + 'ms' }" />
        <div class="disc">{{ emoji }}</div>
      </div>
      <div class="ribbon">{{ title }}</div>
      <div v-if="subtitle" class="sub">{{ subtitle }}</div>
      <button class="btn" style="margin-top:16px" @click.stop="emit('close')">{{ $t('nice') }}</button>
    </div>
  </div>
</template>

<style scoped>
.celebrate{
  position:fixed; inset:0; z-index:120; display:grid; place-items:center;
  background:rgba(16,32,26,.72); -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px);
  overflow:hidden; padding:24px;
}
.stage{display:flex; flex-direction:column; align-items:center; text-align:center; max-width:320px}

.burst{position:relative; width:150px; height:150px; display:grid; place-items:center}
.disc{
  width:118px; height:118px; border-radius:50%; display:grid; place-items:center;
  font-size:56px; background:linear-gradient(150deg,#FFF6DF,#F3D98C);
  box-shadow:0 14px 34px rgba(0,0,0,.34), inset 0 0 0 5px rgba(255,255,255,.55);
  animation:pop .62s cubic-bezier(.18,1.5,.42,1) both;
}
.spark{
  position:absolute; width:7px; height:20px; border-radius:4px; background:#F5D547;
  transform:rotate(var(--a)) translateY(-52px) scale(0); transform-origin:50% 50%;
  animation:spark .78s ease-out both;
}
.ribbon{
  margin-top:16px; font-size:19px; font-weight:800; color:#fff; line-height:1.25;
  animation:rise .5s .34s ease-out both;
}
.sub{margin-top:5px; font-size:13px; color:rgba(255,255,255,.82); animation:rise .5s .44s ease-out both}

.confetti{
  position:absolute; top:-24px; width:9px; height:14px; border-radius:2px;
  animation:fall linear both;
}

@keyframes pop{
  0%{transform:scale(.2) rotate(-24deg); opacity:0}
  70%{transform:scale(1.12) rotate(6deg); opacity:1}
  100%{transform:scale(1) rotate(0); opacity:1}
}
@keyframes spark{
  0%{transform:rotate(var(--a)) translateY(-40px) scale(0); opacity:0}
  40%{opacity:1}
  100%{transform:rotate(var(--a)) translateY(-88px) scale(1); opacity:0}
}
@keyframes rise{from{transform:translateY(12px); opacity:0} to{transform:translateY(0); opacity:1}}
@keyframes fall{
  from{transform:translateY(-10vh) rotate(0)}
  to{transform:translateY(112vh) rotate(var(--tilt))}
}

/* Anyone who asked for less motion gets the moment without the movement. */
@media (prefers-reduced-motion: reduce){
  .disc, .ribbon, .sub{animation:none}
  .spark, .confetti{display:none}
}
</style>
