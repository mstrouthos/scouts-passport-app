<script setup lang="ts">
/* A signature, drawn with a finger, a pen or the mouse. What comes out is a
   PNG (as a data URL) of the strokes, or null once cleared. The canvas is
   drawn at the screen's real pixel density, so it stays sharp on a phone. */
const props = defineProps<{ modelValue: string | null, invalid?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [string | null] }>()
const { t } = useI18n()
const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let drawing = false
let last: { x: number, y: number } | null = null
const empty = ref(!props.modelValue)

function size() {
  const c = canvas.value
  if (!c) return
  const r = c.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  c.width = Math.round(r.width * dpr)
  c.height = Math.round(r.height * dpr)
  ctx = c.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#16233B'
}
// a resize clears the canvas, and with it the signature: start again cleanly
function onResize() { size(); clear() }
onMounted(() => { size(); window.addEventListener('resize', onResize) })
onUnmounted(() => window.removeEventListener('resize', onResize))

function at(e: PointerEvent) {
  const r = canvas.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}
function down(e: PointerEvent) {
  if (!ctx) return
  canvas.value!.setPointerCapture(e.pointerId)
  drawing = true
  last = at(e)
  // a tap leaves a dot
  ctx.beginPath(); ctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2); ctx.fillStyle = '#16233B'; ctx.fill()
}
function move(e: PointerEvent) {
  if (!drawing || !ctx || !last) return
  const p = at(e)
  ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke()
  last = p
}
function up() {
  if (!drawing) return
  drawing = false
  last = null
  empty.value = false
  emit('update:modelValue', canvas.value!.toDataURL('image/png'))
}
function clear() {
  const c = canvas.value
  if (c && ctx) ctx.clearRect(0, 0, c.width, c.height)
  empty.value = true
  emit('update:modelValue', null)
}
</script>

<template>
  <div class="sigpad" :class="{ invalid }">
    <canvas ref="canvas" @pointerdown.prevent="down" @pointermove.prevent="move"
            @pointerup="up" @pointercancel="up" @pointerleave="up" />
    <span v-if="empty" class="hint">✍️ {{ t('formSignHere') }}</span>
    <button v-else type="button" class="clear" @click="clear">{{ t('formSignClear') }}</button>
  </div>
</template>

<style scoped>
.sigpad{position:relative; background:#fff; border:1.5px dashed #C6D4E4; border-radius:14px; height:170px}
.sigpad.invalid{border-color:var(--danger)}
canvas{display:block; width:100%; height:100%; touch-action:none; cursor:crosshair; border-radius:14px}
.hint{position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; color:var(--muted); font-size:13px}
.clear{position:absolute; top:8px; right:8px; border:0; background:var(--hair); color:var(--muted); border-radius:999px; padding:5px 11px; font:inherit; font-size:12px; font-weight:600}
</style>
