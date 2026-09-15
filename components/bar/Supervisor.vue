<script setup lang="ts">
/* The supervisor walks the floor with the whole night in hand: what is
   pending, what is owed, what is done, what each table had and owes, and
   what is selling. Reads everything, touches nothing. */
defineProps<{ me: any }>()
const { orders } = useBarOrders()
const tab = ref<'pending' | 'unpaid' | 'done' | 'tables' | 'items'>('pending')
const live = computed(() => orders.value.filter(o => o.status !== 'cancelled'))
const pending = computed(() => live.value.filter(o => o.status === 'new' || o.status === 'ready'))
const unpaid = computed(() => live.value.filter(o => !o.settled))
const done = computed(() => live.value.filter(o => o.status === 'delivered' && o.settled).slice().reverse())
const sum = (xs: any[]) => xs.reduce((a, o) => a + o.totalCents, 0)
const statusLabel = (s: string) => ({ new: 'Στο μπαρ', ready: 'Έτοιμη', delivered: 'Παραδόθηκε' } as any)[s]

/* per table: orders, total, owed, and the items added up */
const openTable = ref<number | null>(null)
const tables = computed(() => {
  const m = new Map<number, { no: number; orders: any[]; cents: number; owed: number; items: Map<string, { name: string; qty: number; cents: number }> }>()
  for (const o of live.value) {
    const r = m.get(o.tableNo) || { no: o.tableNo, orders: [], cents: 0, owed: 0, items: new Map() }
    r.orders.push(o); r.cents += o.totalCents; if (!o.settled) r.owed += o.totalCents
    for (const i of o.items) { const x = r.items.get(i.name) || { name: i.name, qty: 0, cents: 0 }; x.qty += i.qty; x.cents += i.qty * i.priceCents; r.items.set(i.name, x) }
    m.set(o.tableNo, r)
  }
  return [...m.values()].sort((a, b) => a.no - b.no).map(r => ({ ...r, items: [...r.items.values()].sort((a, b) => b.qty - a.qty) }))
})
const items = computed(() => {
  const m = new Map<string, { name: string; qty: number; cents: number }>()
  for (const o of live.value) for (const i of o.items) { const x = m.get(i.name) || { name: i.name, qty: 0, cents: 0 }; x.qty += i.qty; x.cents += i.qty * i.priceCents; m.set(i.name, x) }
  return [...m.values()].sort((a, b) => b.qty - a.qty)
})
</script>

<template>
  <main>
    <div class="card" style="flex-direction:row;justify-content:space-around;text-align:center;padding:10px">
      <div><b style="font-size:18px">{{ eur(sum(live)) }}</b><br><span style="font-size:11px;opacity:.6">ΣΥΝΟΛΟ</span></div>
      <div><b style="font-size:18px;color:#7BE0AC">{{ eur(sum(live.filter(o => o.settled))) }}</b><br><span style="font-size:11px;opacity:.6">ΠΛΗΡΩΜΕΝΑ</span></div>
      <div><b style="font-size:18px;color:#FF9A8B">{{ eur(sum(unpaid)) }}</b><br><span style="font-size:11px;opacity:.6">ΟΦΕΙΛΟΝΤΑΙ</span></div>
      <div><b style="font-size:18px">{{ live.length }}</b><br><span style="font-size:11px;opacity:.6">ΠΑΡΑΓΓ.</span></div>
    </div>

    <template v-if="tab === 'pending' || tab === 'unpaid' || tab === 'done'">
      <div v-if="!(tab === 'pending' ? pending : tab === 'unpaid' ? unpaid : done).length" class="empty">Τίποτα εδώ.</div>
      <div v-for="o in (tab === 'pending' ? pending : tab === 'unpaid' ? unpaid : done)" :key="o.id" class="order">
        <div class="hd"><span class="no">#{{ o.number }}</span><span class="tb">Τραπέζι {{ o.tableNo }}</span>
          <span class="meta">{{ o.waiterName }} → {{ o.bartenderName }}<br>{{ clock(o.createdAt) }}</span></div>
        <div class="lines"><div v-for="i in o.items" :key="i.id"><b>{{ i.qty }}×</b>{{ i.name }}</div></div>
        <div class="tot"><span><span class="pill" :class="o.status">{{ statusLabel(o.status) }}</span> <span class="pill" :class="payClass(o)">{{ payLabel(o) }}</span></span><b>{{ eur(o.totalCents) }}</b></div>
      </div>
    </template>

    <template v-else-if="tab === 'tables'">
      <div v-if="!tables.length" class="empty">Καμία παραγγελία ακόμη.</div>
      <div v-for="r in tables" :key="r.no" class="order" @click="openTable = openTable === r.no ? null : r.no">
        <div class="hd"><span class="tb">Τραπέζι {{ r.no }}</span>
          <span class="meta">{{ r.orders.length }} παραγγελίες<br><span v-if="r.owed" class="pill unpaid">οφείλει {{ eur(r.owed) }}</span><span v-else class="pill paid">εξοφλημένο</span></span></div>
        <div class="tot" style="border:0;padding:0"><span style="opacity:.6">{{ openTable === r.no ? 'Τι παρήγγειλε ▾' : 'Τι παρήγγειλε ▸' }}</span><b style="font-size:20px">{{ eur(r.cents) }}</b></div>
        <div v-if="openTable === r.no" class="lines" style="border-top:1px solid rgba(255,255,255,.1);padding-top:8px">
          <div v-for="i in r.items" :key="i.name"><b>{{ i.qty }}×</b><span style="flex:1">{{ i.name }}</span><span style="opacity:.6">{{ eur(i.cents) }}</span></div>
          <div style="opacity:.6;font-size:12px;margin-top:6px">Παραγγελίες: {{ r.orders.map(o => '#' + o.number).join(', ') }}</div>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="!items.length" class="empty">Τίποτα ακόμη.</div>
      <div v-for="i in items" :key="i.name" class="item">
        <div class="nm">{{ i.name }}</div><div class="pr">{{ eur(i.cents) }}</div><b style="font-size:20px;min-width:40px;text-align:right;color:#F0B429">{{ i.qty }}</b>
      </div>
    </template>

    <nav class="tabs">
      <button :class="{ on: tab === 'pending' }" @click="tab = 'pending'">Εκκρεμείς<span v-if="pending.length" class="n">{{ pending.length }}</span></button>
      <button :class="{ on: tab === 'unpaid' }" @click="tab = 'unpaid'">Απλήρωτες<span v-if="unpaid.length" class="n">{{ unpaid.length }}</span></button>
      <button :class="{ on: tab === 'done' }" @click="tab = 'done'">Τέλος</button>
      <button :class="{ on: tab === 'tables' }" @click="tab = 'tables'">Τραπέζια</button>
      <button :class="{ on: tab === 'items' }" @click="tab = 'items'">Είδη</button>
    </nav>
  </main>
</template>
