<script setup lang="ts">
/* Every table's bill, for whoever is settling it: total, what is still
   owed, and — on tap — exactly what the table had and which orders it was. */
const props = defineProps<{ orders: any[] }>()
const open = ref<number | null>(null)
const tables = computed(() => {
  const m = new Map<number, { no: number; orders: any[]; cents: number; owed: number; items: Map<string, { name: string; qty: number; cents: number }> }>()
  for (const o of props.orders.filter(o => o.status !== 'cancelled')) {
    const r = m.get(o.tableNo) || { no: o.tableNo, orders: [], cents: 0, owed: 0, items: new Map() }
    r.orders.push(o); r.cents += o.totalCents; if (!o.settled) r.owed += o.totalCents
    for (const i of o.items) { const x = r.items.get(i.name) || { name: i.name, qty: 0, cents: 0 }; x.qty += i.qty; x.cents += i.qty * i.priceCents; r.items.set(i.name, x) }
    m.set(o.tableNo, r)
  }
  return [...m.values()].sort((a, b) => a.no - b.no).map(r => ({ ...r, items: [...r.items.values()].sort((a, b) => b.qty - a.qty) }))
})
</script>

<template>
  <div v-if="!tables.length" class="empty">Καμία παραγγελία ακόμη.</div>
  <div v-for="r in tables" :key="r.no" class="order" @click="open = open === r.no ? null : r.no">
    <div class="hd"><span class="tb">Τραπέζι {{ r.no }}</span>
      <span class="meta">{{ r.orders.length }} {{ r.orders.length === 1 ? 'παραγγελία' : 'παραγγελίες' }}<br><span v-if="r.owed" class="pill unpaid">οφείλει {{ eur(r.owed) }}</span><span v-else class="pill paid">εξοφλημένο</span></span></div>
    <div class="tot" style="border:0;padding:0"><span style="opacity:.6">{{ open === r.no ? 'Τι παρήγγειλε ▾' : 'Τι παρήγγειλε ▸' }}</span><b style="font-size:20px">{{ eur(r.cents) }}</b></div>
    <div v-if="open === r.no" class="lines" style="border-top:1px solid rgba(255,255,255,.1);padding-top:8px">
      <div v-for="i in r.items" :key="i.name"><b>{{ i.qty }}×</b><span style="flex:1">{{ i.name }}</span><span style="opacity:.6">{{ eur(i.cents) }}</span></div>
      <div v-for="o in r.orders" :key="o.id" style="display:flex;gap:8px;font-size:12px;opacity:.7;margin-top:4px">
        <span>#{{ o.number }}</span><span style="flex:1">{{ o.waiterName }}</span><span class="pill" :class="payClass(o)">{{ payLabel(o) }}</span><span>{{ eur(o.totalCents) }}</span>
      </div>
    </div>
  </div>
</template>
