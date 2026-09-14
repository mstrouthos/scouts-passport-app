<script setup lang="ts">
/* The waiter: pick a table, tap what they want, send it to the bar. Then
   watch for "Έτοιμη", carry it over, and take the money — cash, or a card
   that the cashier will confirm. */
const props = defineProps<{ me: any }>()
const { orders, act, toast, say, refresh } = useBarOrders()
const tab = ref<'new' | 'mine'>('new')
const table = ref<number | null>(null)
const qty = reactive<Record<number, number>>({})
const sending = ref(false)

const menu = computed(() => {
  const cats = new Map<string, any[]>()
  for (const m of props.me.menu) cats.set(m.category, [...(cats.get(m.category) || []), m])
  return [...cats.entries()]
})
const lines = computed(() => props.me.menu.filter((m: any) => (qty[m.id] || 0) > 0).map((m: any) => ({ ...m, qty: qty[m.id] })))
const total = computed(() => lines.value.reduce((a: number, l: any) => a + l.priceCents * l.qty, 0))
function bump(id: number, by: number) { qty[id] = Math.max(0, (qty[id] || 0) + by) }
async function send() {
  if (!table.value || !lines.value.length || sending.value) return
  sending.value = true
  try {
    const r = await $fetch<any>('/api/bar/orders', { method: 'POST', body: { tableNo: table.value, items: lines.value.map((l: any) => ({ menuItemId: l.id, qty: l.qty })) } })
    for (const k of Object.keys(qty)) qty[Number(k)] = 0
    table.value = null
    say(`Στάλθηκε · #${r.number}`)
    await refresh(); tab.value = 'mine'
  } catch (e: any) { say(e?.data?.message || 'Κάτι πήγε στραβά') }
  finally { sending.value = false }
}
/* Mine: what is still moving first, then tonight's history. */
const active = computed(() => orders.value.filter(o => o.status !== 'cancelled' && !(o.status === 'delivered' && o.settled)))
const done = computed(() => orders.value.filter(o => o.status === 'cancelled' || (o.status === 'delivered' && o.settled)).slice().reverse())
const readyCount = computed(() => orders.value.filter(o => o.status === 'ready').length)
/* Cash or card, asked right there on the order rather than in a dialog. */
const paying = ref<number | null>(null)
async function pay(o: any, method: 'cash' | 'card') {
  if (await act(o.id, 'pay', { method })) paying.value = null
}
</script>

<template>
  <main>
    <template v-if="tab === 'new'">
      <div class="cat">Τραπέζι</div>
      <div class="grid">
        <button v-for="n in me.event.tableCount" :key="n" class="tbl" :class="{ on: table === n }" @click="table = table === n ? null : n">{{ n }}</button>
      </div>
      <template v-for="[cat, items] in menu" :key="cat">
        <div class="cat">{{ cat || 'Μενού' }}</div>
        <div v-for="m in items" :key="m.id" class="item">
          <div class="nm">{{ m.name }}</div>
          <div class="pr">{{ eur(m.priceCents) }}</div>
          <div class="q">
            <button v-if="qty[m.id]" @click="bump(m.id, -1)">−</button>
            <b v-if="qty[m.id]">{{ qty[m.id] }}</b>
            <button class="plus" @click="bump(m.id, 1)">+</button>
          </div>
        </div>
      </template>
      <div v-if="lines.length" class="sum">
        <button class="btn" :disabled="!table || sending" @click="send">
          {{ table ? `Στείλε · Τραπέζι ${table} · ${eur(total)}` : `Διάλεξε τραπέζι · ${eur(total)}` }}
        </button>
      </div>
    </template>

    <template v-else>
      <div v-if="!active.length && !done.length" class="empty">Καμία παραγγελία ακόμη.</div>
      <div v-for="o in active" :key="o.id" class="order">
        <div class="hd"><span class="no">#{{ o.number }}</span><span class="tb">Τραπέζι {{ o.tableNo }}</span>
          <span class="meta">{{ clock(o.createdAt) }}<br><span class="pill" :class="o.status">{{ ({ new: 'Στο μπαρ', ready: 'Έτοιμη!', delivered: 'Παραδόθηκε' } as any)[o.status] }}</span></span></div>
        <div class="lines"><div v-for="i in o.items" :key="i.id"><b>{{ i.qty }}×</b>{{ i.name }}</div></div>
        <div class="tot"><span class="pill" :class="payClass(o)">{{ payLabel(o) }}</span><b>{{ eur(o.totalCents) }}</b></div>
        <div class="acts">
          <button v-if="o.status === 'new'" class="btn red sm" @click="act(o.id, 'cancel')">Ακύρωση</button>
          <button v-if="o.status === 'ready'" class="btn ok" @click="act(o.id, 'delivered')">Παραδόθηκε στο τραπέζι</button>
          <template v-if="!o.paidAt && paying === o.id">
            <button class="btn ok" @click="pay(o, 'cash')">💶 Μετρητά</button>
            <button class="btn ok" @click="pay(o, 'card')">💳 Κάρτα</button>
            <button class="btn ghost sm" @click="paying = null">✕</button>
          </template>
          <button v-else-if="!o.paidAt" class="btn" @click="paying = o.id">Πληρώθηκε…</button>
          <button v-else-if="!o.cardConfirmedAt" class="btn ghost sm" @click="act(o.id, 'unpay')">Αναίρεση πληρωμής</button>
        </div>
      </div>
      <div v-if="done.length" class="cat">Ολοκληρωμένες · {{ done.length }}</div>
      <div v-for="o in done" :key="o.id" class="order" style="opacity:.6">
        <div class="hd"><span class="no">#{{ o.number }}</span><span class="tb">Τραπέζι {{ o.tableNo }}</span>
          <span class="meta"><span class="pill" :class="o.status === 'cancelled' ? 'cancelled' : payClass(o)">{{ o.status === 'cancelled' ? 'Ακυρώθηκε' : payLabel(o) }}</span></span></div>
        <div class="lines"><div v-for="i in o.items" :key="i.id"><b>{{ i.qty }}×</b>{{ i.name }}</div></div>
      </div>
    </template>

    <div v-if="toast" class="toast">{{ toast }}</div>
    <nav class="tabs">
      <button :class="{ on: tab === 'new' }" @click="tab = 'new'">Νέα παραγγελία</button>
      <button :class="{ on: tab === 'mine' }" @click="tab = 'mine'">Οι παραγγελίες μου<span v-if="readyCount" class="n">{{ readyCount }}</span></button>
    </nav>
  </main>
</template>
