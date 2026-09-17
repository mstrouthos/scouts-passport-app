<script setup lang="ts">
/* The organiser: lays out the room before the doors open — drags the tables
   where they stand, adds the landmarks (bar, entrance, stage) a waiter
   steers by, sets how many tables there are. Saved as it changes. */
const props = defineProps<{ me: any }>()
const layout = ref<any>(props.me.event.layout || { tables: [], marks: [], seats: {} })
if (!layout.value.seats) layout.value.seats = {}
const tableCount = ref<number>(props.me.event.tableCount)
const saved = ref('')
let timer: any = null
const LANDMARKS = ['Μπαρ', 'Είσοδος', 'Σκηνή', 'Ταμείο', 'WC', 'Κουζίνα']
const hasMark = (label: string) => layout.value.marks.some((m: any) => m.label === label)

async function save() {
  try {
    await $fetch('/api/bar/layout', { method: 'POST', body: { ...layout.value, tableCount: tableCount.value } })
    saved.value = 'Αποθηκεύτηκε ✓'; clearTimeout(timer); timer = setTimeout(() => { saved.value = '' }, 1500)
  } catch { saved.value = 'Δεν αποθηκεύτηκε' }
}
function onChange(l: any) { layout.value = { tables: l.tables.map((t: any) => ({ ...t })), marks: l.marks.map((m: any) => ({ ...m })), seats: layout.value.seats }; save() }
// how many are booked at each table; saved a moment after the last tap
let seatTimer: any = null
function bumpSeats(no: number, by: number) {
  const cur = layout.value.seats[String(no)] || 0
  layout.value.seats = { ...layout.value.seats, [String(no)]: Math.max(0, Math.min(99, cur + by)) }
  clearTimeout(seatTimer); seatTimer = setTimeout(save, 600)
}
const totalSeats = computed(() => Object.values(layout.value.seats as Record<string, number>).reduce((a, b) => a + b, 0))
function toggleMark(label: string) {
  if (hasMark(label)) layout.value.marks = layout.value.marks.filter((m: any) => m.label !== label)
  // each new landmark lands a little further along the top, not on the last one
  else layout.value.marks = [...layout.value.marks, { id: label.toLowerCase(), label, x: 0.15 + 0.17 * (layout.value.marks.length % 5), y: 0.06 }]
  save()
}
function bumpTables(by: number) {
  tableCount.value = Math.min(200, Math.max(1, tableCount.value + by))
  layout.value.tables = layout.value.tables.filter((t: any) => t.no <= tableCount.value)
  save()
}
</script>

<template>
  <main>
    <div class="cat">Κάτοψη · σύρε τα τραπέζια εκεί που στέκονται</div>
    <BarPlan :table-count="tableCount" :layout="layout" editable @change="onChange" />
    <div style="display:flex;align-items:center;gap:10px">
      <span style="flex:1;font-size:13px;opacity:.7">Τραπέζια</span>
      <div class="q" style="display:flex;align-items:center;gap:8px">
        <button class="btn ghost sm" @click="bumpTables(-1)">−</button><b style="font-size:18px;min-width:28px;text-align:center">{{ tableCount }}</b><button class="btn sm" @click="bumpTables(1)">+</button>
      </div>
    </div>
    <div class="cat">Σημεία αναφοράς</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      <button v-for="l in LANDMARKS" :key="l" class="btn sm" :class="hasMark(l) ? '' : 'ghost'" @click="toggleMark(l)">{{ hasMark(l) ? '✓ ' : '+ ' }}{{ l }}</button>
    </div>
    <div class="cat">Άτομα ανά τραπέζι · {{ totalSeats }}</div>
    <div v-for="no in tableCount" :key="no" class="item" style="min-height:44px">
      <div class="nm">Τραπέζι {{ no }}</div>
      <div class="q">
        <button v-if="layout.seats[String(no)]" @click="bumpSeats(no, -1)">−</button>
        <b v-if="layout.seats[String(no)]">{{ layout.seats[String(no)] }}</b>
        <button class="plus" @click="bumpSeats(no, 1)">+</button>
      </div>
    </div>
    <div class="hint" style="text-align:left">Ό,τι αλλάζεις αποθηκεύεται αμέσως. Οι σερβιτόροι βλέπουν την κάτοψη όταν διαλέγουν τραπέζι.</div>
    <div v-if="saved" class="toast">{{ saved }}</div>
  </main>
</template>
