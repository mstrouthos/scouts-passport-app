<script setup lang="ts">
/* The bartender: the queue in arrival order, one big button per order when
   it is on the counter; and, on the other tab, whatever is still owed. The
   waiter brings the money here, so the bar is who marks an order paid. */
const props = defineProps<{ me: any }>()
const { orders: all, act, toast } = useBarOrders()
const orders = computed(() => all.value.filter(o => o.bartenderId === props.me.id))
const tab = ref<'queue' | 'unpaid' | 'tables'>('queue')
const queue = computed(() => orders.value.filter(o => o.status === 'new' || o.status === 'ready'))
const unpaid = computed(() => orders.value.filter(o => o.status !== 'cancelled' && !o.settled))
const age = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
/* Cash or card, asked right there on the order rather than in a dialog. */
const paying = ref<number | null>(null)
async function pay(o: any, method: 'cash' | 'card') {
  if (await act(o.id, 'pay', { method })) paying.value = null
}
</script>

<template>
  <main>
    <template v-if="tab === 'queue'">
      <div v-if="!queue.length" class="empty">Τίποτα σε αναμονή. 🍺</div>
      <div v-for="o in queue" :key="o.id" class="order" :style="o.status === 'ready' ? 'opacity:.7' : ''">
        <div class="hd"><span class="no">#{{ o.number }}</span><span class="tb">Τραπέζι {{ o.tableNo }}</span>
          <span class="meta">{{ o.waiterName }} · {{ clock(o.createdAt) }}<br>πριν {{ age(o.createdAt) }}′</span></div>
        <div class="lines"><div v-for="i in o.items" :key="i.id" style="font-size:19px"><b>{{ i.qty }}×</b>{{ i.name }}<span v-if="i.couponQty" class="cpn on">🎟 {{ i.couponQty }} κουπόνι</span></div></div>
        <div v-if="o.note" style="font-size:13px;opacity:.75">📝 {{ o.note }}</div>
        <div class="tot"><span class="pill" :class="payClass(o)">{{ payLabel(o) }}</span><b>{{ eur(o.totalCents) }}</b></div>
        <div class="acts">
          <button v-if="o.status === 'new'" class="btn ok" @click="act(o.id, 'ready')">Έτοιμη — παραδόθηκε στον σερβιτόρο</button>
          <span v-else class="pill ready" style="align-self:center">Έτοιμη · περιμένει τον {{ o.waiterName }}</span>
        </div>
        <div class="acts">
          <template v-if="!o.paidAt && paying === o.id">
            <button class="btn ok" @click="pay(o, 'cash')">💶 Μετρητά</button>
            <button class="btn ok" @click="pay(o, 'card')">💳 Κάρτα</button>
            <button class="btn ghost sm" @click="paying = null">✕</button>
          </template>
          <button v-else-if="!o.paidAt" class="btn ghost" @click="paying = o.id">Πληρώθηκε…</button>
          <button v-else-if="!o.cardConfirmedAt" class="btn ghost sm" @click="act(o.id, 'unpay')">Αναίρεση πληρωμής</button>
        </div>
      </div>
    </template>
    <template v-else-if="tab === 'tables'"><BarTables :orders="all" /></template>
    <template v-else>
      <div v-if="!unpaid.length" class="empty">Όλα πληρωμένα. 👌</div>
      <div v-for="o in unpaid" :key="o.id" class="order">
        <div class="hd"><span class="no">#{{ o.number }}</span><span class="tb">Τραπέζι {{ o.tableNo }}</span>
          <span class="meta">{{ o.waiterName }} · {{ clock(o.createdAt) }}<br><span class="pill" :class="payClass(o)">{{ payLabel(o) }}</span></span></div>
        <div class="lines"><div v-for="i in o.items" :key="i.id"><b>{{ i.qty }}×</b>{{ i.name }}<span v-if="i.couponQty" class="cpn on">🎟 {{ i.couponQty }}</span></div></div>
        <div class="tot"><span class="pill" :class="o.status">{{ ({ new: 'Στο μπαρ', ready: 'Έτοιμη', delivered: 'Παραδόθηκε' } as any)[o.status] }}</span><b>{{ eur(o.totalCents) }}</b></div>
        <div class="acts">
          <template v-if="!o.paidAt && paying === o.id">
            <button class="btn ok" @click="pay(o, 'cash')">💶 Μετρητά</button>
            <button class="btn ok" @click="pay(o, 'card')">💳 Κάρτα</button>
            <button class="btn ghost sm" @click="paying = null">✕</button>
          </template>
          <button v-else-if="!o.paidAt" class="btn" @click="paying = o.id">Πληρώθηκε…</button>
          <button v-else-if="!o.cardConfirmedAt" class="btn ghost sm" @click="act(o.id, 'unpay')">Αναίρεση πληρωμής</button>
        </div>
      </div>
    </template>
    <div v-if="toast" class="toast">{{ toast }}</div>
    <nav class="tabs">
      <button :class="{ on: tab === 'queue' }" @click="tab = 'queue'">Εκκρεμείς<span v-if="queue.filter(o => o.status === 'new').length" class="n">{{ queue.filter(o => o.status === 'new').length }}</span></button>
      <button :class="{ on: tab === 'unpaid' }" @click="tab = 'unpaid'">Απλήρωτες<span v-if="unpaid.length" class="n">{{ unpaid.length }}</span></button>
      <button :class="{ on: tab === 'tables' }" @click="tab = 'tables'">Τραπέζια</button>
    </nav>
  </main>
</template>
