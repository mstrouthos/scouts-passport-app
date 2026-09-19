<script setup lang="ts">
/* The organiser: lays out the room before the doors open — drags the tables
   where they stand, adds the landmarks (bar, entrance, stage) a waiter
   steers by, sets how many tables there are. Saved as it changes. */
const props = defineProps<{ me: any }>()
const layout = ref<any>(props.me.event.layout || { tables: [], marks: [], seats: {} })
if (!layout.value.seats) layout.value.seats = {}
if (!layout.value.kidSeats) layout.value.kidSeats = {}
if (!layout.value.waiters) layout.value.waiters = {}
function setWaiter(no: number, id: number) {
  const cur = layout.value.waiters[String(no)]
  layout.value.waiters = { ...layout.value.waiters, [String(no)]: cur === id ? 0 : id }
  clearTimeout(seatTimer); seatTimer = setTimeout(save, 400)
}
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
function onChange(l: any) { layout.value = { tables: l.tables.map((t: any) => ({ ...t })), marks: l.marks.map((m: any) => ({ ...m })), seats: layout.value.seats, kidSeats: layout.value.kidSeats, waiters: layout.value.waiters }; save() }
// how many are booked at each table; saved a moment after the last tap
let seatTimer: any = null
function bumpSeats(no: number, by: number, kind: 'seats' | 'kidSeats' = 'seats') {
  const cur = layout.value[kind][String(no)] || 0
  layout.value[kind] = { ...layout.value[kind], [String(no)]: Math.max(0, Math.min(99, cur + by)) }
  clearTimeout(seatTimer); seatTimer = setTimeout(save, 600)
}
const totalSeats = computed(() => Object.values(layout.value.seats as Record<string, number>).reduce((a, b) => a + b, 0))
const totalKids = computed(() => Object.values(layout.value.kidSeats as Record<string, number>).reduce((a, b) => a + b, 0))
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
    <div class="cat">Άτομα ανά τραπέζι · {{ totalSeats }} ενήλικες · {{ totalKids }} παιδιά</div>
    <div v-for="no in tableCount" :key="no" class="item" style="min-height:44px;flex-wrap:wrap">
      <div class="nm">Τραπέζι {{ no }}</div>
      <div class="q" style="gap:4px"><span style="font-size:11px;opacity:.6;margin-right:4px">👤</span>
        <button v-if="layout.seats[String(no)]" @click="bumpSeats(no, -1)">−</button>
        <b v-if="layout.seats[String(no)]">{{ layout.seats[String(no)] }}</b>
        <button class="plus" @click="bumpSeats(no, 1)">+</button>
      </div>
      <div class="q" style="gap:4px"><span style="font-size:11px;opacity:.6;margin-right:4px">👶</span>
        <button v-if="layout.kidSeats[String(no)]" @click="bumpSeats(no, -1, 'kidSeats')">−</button>
        <b v-if="layout.kidSeats[String(no)]">{{ layout.kidSeats[String(no)] }}</b>
        <button class="plus" @click="bumpSeats(no, 1, 'kidSeats')">+</button>
      </div>
    </div>
    <div class="cat">Σερβιτόρος ανά τραπέζι</div>
    <div class="hint" style="text-align:left;margin-top:-4px">Όταν ένα τραπέζι καλεί (QR), χτυπάει ο σερβιτόρος του· χωρίς ανάθεση χτυπούν όλοι.</div>
    <div v-for="no in tableCount" :key="'w' + no" class="item" style="min-height:44px;flex-wrap:wrap">
      <div class="nm" style="flex:0 0 auto;min-width:88px">Τραπέζι {{ no }}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;flex:1">
        <button v-for="w in me.waiterList" :key="w.id" class="btn sm" :class="layout.waiters[String(no)] === w.id ? '' : 'ghost'" style="padding:6px 10px;font-size:12px" @click="setWaiter(no, w.id)">{{ w.name }}</button>
        <span v-if="!me.waiterList?.length" class="hint">Δεν υπάρχουν σερβιτόροι ακόμη.</span>
      </div>
    </div>
    <div class="hint" style="text-align:left">Ό,τι αλλάζεις αποθηκεύεται αμέσως. Οι σερβιτόροι βλέπουν την κάτοψη όταν διαλέγουν τραπέζι.</div>
    <div v-if="saved" class="toast">{{ saved }}</div>
  </main>
</template>
