<script setup lang="ts">
/* The floor plan: tables as numbered discs, landmarks as labels, on a canvas
   whose coordinates are fractions so it fits any screen. Read-only by
   default; the organiser drags things about with `editable`. A table with
   no position yet is parked in a row along the bottom. */
const props = defineProps<{
  tableCount: number
  layout: { tables: Array<{ no: number; x: number; y: number }>; marks: Array<{ id: string; label: string; x: number; y: number }> } | null
  editable?: boolean
  selected?: number | null
  owed?: Record<number, number>
  coupons?: Record<number, { issued: number; left: number }>
}>()
const emit = defineEmits<{ (e: 'pick', no: number): void; (e: 'change', layout: { tables: any[]; marks: any[] }): void }>()

const box = ref<HTMLElement | null>(null)
const tables = ref<Array<{ no: number; x: number; y: number; placed: boolean }>>([])
const marks = ref<Array<{ id: string; label: string; x: number; y: number }>>([])
watch(() => [props.layout, props.tableCount], () => {
  const known = new Map((props.layout?.tables || []).map(t => [t.no, t]))
  tables.value = Array.from({ length: props.tableCount }, (_, i) => {
    const no = i + 1
    const t = known.get(no)
    // parked, evenly, along the bottom until someone places it
    return t ? { ...t, placed: true } : { no, x: (i + 0.5) / props.tableCount, y: 0.92, placed: false }
  })
  marks.value = (props.layout?.marks || []).map(m => ({ ...m }))
}, { immediate: true, deep: true })

/* dragging: pointer events on the disc, position relative to the canvas */
let drag: { kind: 'table' | 'mark'; idx: number; moved: boolean } | null = null
function down(e: PointerEvent, kind: 'table' | 'mark', idx: number) {
  if (!props.editable) return
  drag = { kind, idx, moved: false }
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}
function move(e: PointerEvent) {
  if (!drag || !box.value) return
  const r = box.value.getBoundingClientRect()
  const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
  const it = drag.kind === 'table' ? tables.value[drag.idx] : marks.value[drag.idx]
  it.x = x; it.y = y; drag.moved = true
}
function up() {
  if (drag?.moved) emit('change', { tables: tables.value, marks: marks.value })
  drag = null
}
function tap(no: number) { if (!props.editable) emit('pick', no) }
defineExpose({ tables, marks })
</script>

<template>
  <div>
  <div ref="box" class="plan" :class="{ edit: editable }" @pointermove="move" @pointerup="up" @pointercancel="up">
    <div v-for="(m, i) in marks" :key="m.id" class="mark" :style="{ left: m.x * 100 + '%', top: m.y * 100 + '%' }"
         @pointerdown="down($event, 'mark', i)">{{ m.label }}</div>
    <button v-for="(t, i) in tables.filter(t => editable || t.placed)" :key="t.no" class="tbl" :class="{ on: selected === t.no, owed: owed && owed[t.no] }"
            :style="{ left: t.x * 100 + '%', top: t.y * 100 + '%' }"
            @pointerdown="down($event, 'table', tables.indexOf(t))" @click="tap(t.no)">{{ t.no }}<span v-if="coupons?.[t.no]?.issued" class="tcp">🎟{{ Math.max(0, coupons[t.no].left) }}</span></button>
  </div>
  <!-- tables the organiser has not placed yet: still pickable, in a row below -->
  <div v-if="!editable && tables.some(t => !t.placed)" class="unplaced">
    <button v-for="t in tables.filter(t => !t.placed)" :key="t.no" class="tbl flat" :class="{ on: selected === t.no }" style="position:relative" @click="tap(t.no)">{{ t.no }}<span v-if="coupons?.[t.no]?.issued" class="tcp">🎟{{ Math.max(0, coupons[t.no].left) }}</span></button>
  </div>
  </div>
</template>

<style scoped>
.plan{position:relative;width:100%;aspect-ratio:3/4;background:#141E3C;border-radius:16px;border:1.5px solid #2C3A66;overflow:hidden;touch-action:pan-y;user-select:none;-webkit-user-select:none}
/* dragging needs the touches; a waiter only taps, so the page still scrolls */
.plan.edit{touch-action:none}
.unplaced{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.tbl.flat{position:static;transform:none;width:40px;height:40px;box-shadow:none}
.plan::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:10% 10%}
.tbl{position:absolute;transform:translate(-50%,-50%);width:44px;height:44px;border-radius:50%;border:2px solid #2C3A66;background:#1B2648;color:#fff;font:inherit;font-size:17px;font-weight:800;display:grid;place-items:center;padding:0;box-shadow:0 4px 12px rgba(0,0,0,.35)}
.tbl.on{background:#F0B429;color:#2B1F05;border-color:#F0B429}
.tbl.owed{border-color:#FF9A8B}
.edit .tbl,.edit .mark{cursor:grab}
.mark{position:absolute;transform:translate(-50%,-50%);padding:5px 10px;border-radius:8px;background:rgba(240,180,41,.18);color:#F0B429;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.tcp{position:absolute;right:-6px;top:-8px;font-size:10px;font-weight:800;background:#F0B429;color:#2B1F05;border-radius:999px;padding:1px 5px;line-height:1.3}
.tbl.on .tcp{background:#2B1F05;color:#F0B429}
</style>
