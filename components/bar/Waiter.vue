<script setup lang="ts">
/* The waiter: pick a table, tap what they want, send it to the bar. Then
   watch for "Έτοιμη", carry it over, and bring the money back to the bar,
   which writes it down — the waiter only sees whether it is paid. */
const props = defineProps<{ me: any }>()
const { orders: all, act, toast, say, refresh } = useBarOrders()
// the night is everyone's; the list of "mine" is what I carried
const orders = computed(() => all.value.filter(o => o.waiterId === props.me.id))
const tab = ref<'new' | 'mine' | 'tables'>('new')
const table = ref<number | null>(null)
// the room as the organiser drew it, if they did; the number grid otherwise
const hasPlan = computed(() => !!props.me.event.layout?.tables?.length)
const showPlan = ref(true)
const qty = reactive<Record<number, number>>({})
// how many of each line come with a door coupon — free, one drink each
const coupon = reactive<Record<number, number>>({})
const sending = ref(false)
// how the table says it will pay — the cashier who takes that confirms it
const method = ref<'cash' | 'card'>('cash')

const menu = computed(() => {
  const cats = new Map<string, any[]>()
  for (const m of props.me.menu) cats.set(m.category, [...(cats.get(m.category) || []), m])
  return [...cats.entries()]
})
const lines = computed(() => props.me.menu.filter((m: any) => (qty[m.id] || 0) > 0).map((m: any) => ({ ...m, qty: qty[m.id], couponQty: Math.min(qty[m.id], coupon[m.id] || 0) })))
const total = computed(() => lines.value.reduce((a: number, l: any) => a + l.priceCents * (l.qty - l.couponQty), 0))
// coupons to collect: units covered × what each unit costs in coupons
const coupons = computed(() => lines.value.reduce((a: number, l: any) => a + l.couponQty * (l.couponCost || 1), 0))
function bump(id: number, by: number) { qty[id] = Math.max(0, (qty[id] || 0) + by); coupon[id] = Math.min(qty[id], coupon[id] || 0) }
function bumpCoupon(id: number) { coupon[id] = ((coupon[id] || 0) + 1) % ((qty[id] || 0) + 1) }
async function send() {
  if (!table.value || !lines.value.length || sending.value) return
  sending.value = true
  try {
    const r = await $fetch<any>('/api/bar/orders', { method: 'POST', body: { tableNo: table.value, method: method.value, items: lines.value.map((l: any) => ({ menuItemId: l.id, qty: l.qty, couponQty: l.couponQty })) } })
    for (const k of Object.keys(qty)) { qty[Number(k)] = 0; coupon[Number(k)] = 0 }
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
</script>

<template>
  <main>
    <template v-if="tab === 'new'">
      <div class="cat" style="display:flex;align-items:center">Τραπέζι<span v-if="hasPlan" class="cpn" :class="{ on: showPlan }" @click="showPlan = !showPlan">{{ showPlan ? 'κάτοψη' : 'αριθμοί' }}</span></div>
      <BarPlan v-if="hasPlan && showPlan" :table-count="me.event.tableCount" :layout="me.event.layout" :selected="table" @pick="table = table === $event ? null : $event" />
      <div v-else class="grid">
        <button v-for="n in me.event.tableCount" :key="n" class="tbl" :class="{ on: table === n }" @click="table = table === n ? null : n">{{ n }}</button>
      </div>
      <template v-for="[cat, items] in menu" :key="cat">
        <div class="cat">{{ cat || 'Μενού' }}</div>
        <div v-for="m in items" :key="m.id" class="item" :class="{ cp: coupon[m.id] }">
          <div class="nm">{{ m.name }}<span v-if="m.couponOk && qty[m.id]" class="cpn" :class="{ on: coupon[m.id] }" @click.stop="bumpCoupon(m.id)">🎟 {{ coupon[m.id] ? `${coupon[m.id]} με κουπόνι${m.couponCost > 1 ? ` (${coupon[m.id] * m.couponCost} 🎟)` : ''}` : (m.couponCost > 1 ? `κουπόνι; ×${m.couponCost}` : 'κουπόνι;') }}</span></div>
          <div class="pr">{{ eur(m.priceCents) }}</div>
          <div class="q">
            <button v-if="qty[m.id]" @click="bump(m.id, -1)">−</button>
            <b v-if="qty[m.id]">{{ qty[m.id] }}</b>
            <button class="plus" @click="bump(m.id, 1)">+</button>
          </div>
        </div>
      </template>
      <div v-if="lines.length" class="sum">
        <div v-if="total > 0" class="seg2">
          <button :class="{ on: method === 'cash' }" @click="method = 'cash'">💶 Μετρητά</button>
          <button :class="{ on: method === 'card' }" @click="method = 'card'">💳 Κάρτα</button>
        </div>
        <div v-else class="seg2"><button class="on">🎟 Μόνο κουπόνια</button></div>
        <button class="btn" :disabled="!table || sending" @click="send">
          {{ table ? `Στείλε · Τραπέζι ${table} · ${eur(total)}` : `Διάλεξε τραπέζι · ${eur(total)}` }}<template v-if="coupons"> · 🎟 {{ coupons }}</template>
        </button>
      </div>
    </template>

    <template v-else-if="tab === 'tables'"><BarTables :orders="all" /></template>

    <template v-else>
      <div v-if="!active.length && !done.length" class="empty">Καμία παραγγελία ακόμη.</div>
      <div v-for="o in active" :key="o.id" class="order">
        <div class="hd"><span class="no">#{{ o.number }}</span><span class="tb">Τραπέζι {{ o.tableNo }}</span>
          <span class="meta">{{ clock(o.createdAt) }}<br><span class="pill" :class="o.status">{{ ({ new: 'Στο μπαρ', ready: 'Έτοιμη!', delivered: 'Παραδόθηκε' } as any)[o.status] }}</span></span></div>
        <div class="lines"><div v-for="i in o.items" :key="i.id"><b>{{ i.qty }}×</b>{{ i.name }}<span v-if="i.couponQty" class="cpn on">🎟 {{ i.couponQty * (i.couponCost || 1) }}</span></div></div>
        <div class="tot"><span class="pill" :class="payClass(o)">{{ payLabel(o) }}</span><b>{{ eur(o.totalCents) }}</b></div>
        <div class="acts">
          <button v-if="o.status === 'new' && !o.paidAt" class="btn red sm" @click="act(o.id, 'cancel')">Ακύρωση</button>
          <button v-if="o.status === 'ready'" class="btn ok" @click="act(o.id, 'delivered')">Παραδόθηκε στο τραπέζι</button>
          <button v-if="!o.paidAt && o.paidMethod === 'cash'" class="btn ghost sm" @click="act(o.id, 'method', { method: 'card' })">Τελικά με κάρτα</button>
          <button v-if="!o.paidAt && o.paidMethod === 'card'" class="btn ghost sm" @click="act(o.id, 'method', { method: 'cash' })">Τελικά με μετρητά</button>
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
      <button :class="{ on: tab === 'tables' }" @click="tab = 'tables'">Τραπέζια</button>
    </nav>
  </main>
</template>
