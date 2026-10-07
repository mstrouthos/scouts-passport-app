<script setup lang="ts">
/* A row that can be swiped away to the left — a notification, marked read
   and taken out of the list. Past a third of its width it flies off and says
   so (the parent removes it); short of that it springs back. Only a sideways
   drag moves it: scrolling the list up and down works as before, and a tap
   still reaches what is inside. */
const emit = defineEmits<{ (e: 'swiped'): void }>()
const dx = ref(0)
const gone = ref(false)
const dragging = ref(false)
let x0 = 0, y0 = 0, w = 1, axis: '' | 'x' | 'y' = '', moved = false, pid = -1

function down(e: PointerEvent) {
  if (gone.value || (e.pointerType === 'mouse' && e.button !== 0)) return
  x0 = e.clientX; y0 = e.clientY; axis = ''; moved = false; pid = e.pointerId
  w = (e.currentTarget as HTMLElement).offsetWidth || 1
}
function move(e: PointerEvent) {
  if (e.pointerId !== pid || gone.value) return
  const ddx = e.clientX - x0, ddy = e.clientY - y0
  if (!axis) {
    if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return
    axis = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y'
    if (axis === 'x') { dragging.value = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) }
  }
  if (axis !== 'x') return
  moved = true
  // only to the left; a little give to the right
  dx.value = ddx < 0 ? ddx : ddx * 0.15
}
function up(e: PointerEvent) {
  if (e.pointerId !== pid) return
  pid = -1
  dragging.value = false
  if (axis !== 'x') return
  if (-dx.value > w * 0.33) {
    gone.value = true
    dx.value = -w - 40
    sfx('pop')
    setTimeout(() => emit('swiped'), 220)
  } else dx.value = 0
}
// a swipe is not a tap on what is inside
function swallow(e: Event) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false } }
</script>

<template>
  <div class="swipe" :class="{ gone }">
    <div class="behind" :style="{ opacity: Math.min(1, -dx / 80) }"><span>✓</span></div>
    <div class="front" :class="{ dragging }" :style="{ transform: `translateX(${dx}px)` }"
         @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @click.capture="swallow">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.swipe{position:relative; overflow:hidden; border-radius:16px; transition:max-height .25s ease .15s, margin .25s ease .15s, opacity .2s ease .15s; max-height:400px}
.swipe.gone{max-height:0; opacity:0; margin-top:-10px}
.behind{position:absolute; inset:0; display:flex; align-items:center; justify-content:flex-end; padding-right:20px; background:var(--green, #2E7D5B); color:#fff; font-size:20px; font-weight:800; border-radius:16px}
.front{position:relative; touch-action:pan-y; transition:transform .22s cubic-bezier(.2,.8,.3,1)}
.front.dragging{transition:none}
.front > :deep(*){width:100%}
</style>
