<script setup lang="ts">
/* The bartender: the queue in arrival order, one big button per order when
   it is on the counter; and, on the other tab, whatever is still owed —
   which a cashier, not the bar, will settle. */
const props = defineProps<{ me: any }>()
const { orders: all, act, toast } = useBarOrders()
const orders = computed(() => all.value.filter(o => o.bartenderId === props.me.id))
const tab = ref<'queue' | 'ready' | 'unpaid' | 'tables'>('queue')
// to make, and made-but-not-collected — kept apart so the queue stays short
const queue = computed(() => orders.value.filter(o => o.status === 'new'))
const ready = computed(() => orders.value.filter(o => o.status === 'ready'))
const unpaid = computed(() => orders.value.filter(o => o.status !== 'cancelled' && !o.settled))
const age = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))

</script>

<template>
  <main>
    <template v-if="tab === 'queue'">
      <div v-if="!queue.length" class="empty">Τίποτα σε αναμονή. 🍺</div>
      <div v-for="o in queue" :key="o.id" class="order">
        <div class="hd"><span class="no">#{{ o.number }}</span><span class="tb">Τραπέζι {{ o.tableNo }}</span>
          <span class="meta">{{ o.waiterName }} · {{ clock(o.createdAt) }}<br>πριν {{ age(o.createdAt) }}′</span></div>
        <div class="lines"><div v-for="i in o.items" :key="i.id" style="font-size:19px"><b>{{ i.qty }}×</b>{{ i.name }}<span v-if="i.couponQty" class="cpn on">🎟 {{ i.couponQty * (i.couponCost || 1) }} κουπόνι</span></div></div>
        <div v-if="o.note" style="font-size:13px;opacity:.75">📝 {{ o.note }}</div>
        <div class="tot"><span class="pill" :class="payClass(o)">{{ payLabel(o) }}</span><b>{{ eur(o.totalCents) }}</b></div>
        <div class="acts"><button class="btn ok" @click="act(o.id, 'ready')">Έτοιμη — παραδόθηκε στον σερβιτόρο</button></div>
      </div>
    </template>
    <template v-else-if="tab === 'ready'">
      <div v-if="!ready.length" class="empty">Τίποτα στον πάγκο.</div>
      <div v-for="o in ready" :key="o.id" class="order">
        <div class="hd"><span class="no">#{{ o.number }}</span><span class="tb">Τραπέζι {{ o.tableNo }}</span>
          <span class="meta">{{ o.waiterName }} · έτοιμη {{ clock(o.readyAt) }}<br>περιμένει {{ age(o.readyAt) }}′</span></div>
        <div class="lines"><div v-for="i in o.items" :key="i.id"><b>{{ i.qty }}×</b>{{ i.name }}<span v-if="i.couponQty" class="cpn on">🎟 {{ i.couponQty * (i.couponCost || 1) }}</span></div></div>
        <div class="tot"><span class="pill ready">Περιμένει τον {{ o.waiterName }}</span><span class="pill" :class="payClass(o)">{{ payLabel(o) }}</span></div>
      </div>
    </template>
    <template v-else-if="tab === 'tables'"><BarTables :orders="all" /></template>
    <template v-else>
      <div v-if="!unpaid.length" class="empty">Όλα πληρωμένα. 👌</div>
      <div v-for="o in unpaid" :key="o.id" class="order">
        <div class="hd"><span class="no">#{{ o.number }}</span><span class="tb">Τραπέζι {{ o.tableNo }}</span>
          <span class="meta">{{ o.waiterName }} · {{ clock(o.createdAt) }}<br><span class="pill" :class="payClass(o)">{{ payLabel(o) }}</span></span></div>
        <div class="lines"><div v-for="i in o.items" :key="i.id"><b>{{ i.qty }}×</b>{{ i.name }}<span v-if="i.couponQty" class="cpn on">🎟 {{ i.couponQty * (i.couponCost || 1) }}</span></div></div>
        <div class="tot"><span class="pill" :class="o.status">{{ ({ new: 'Στο μπαρ', ready: 'Έτοιμη', delivered: 'Παραδόθηκε' } as any)[o.status] }}</span><b>{{ eur(o.totalCents) }}</b></div>

      </div>
    </template>
    <div v-if="toast" class="toast">{{ toast }}</div>
    <nav class="tabs">
      <button :class="{ on: tab === 'queue' }" @click="tab = 'queue'">Εκκρεμείς<span v-if="queue.length" class="n">{{ queue.length }}</span></button>
      <button :class="{ on: tab === 'ready' }" @click="tab = 'ready'">Έτοιμες<span v-if="ready.length" class="n" style="background:#2FA36B">{{ ready.length }}</span></button>
      <button :class="{ on: tab === 'unpaid' }" @click="tab = 'unpaid'">Απλήρωτες<span v-if="unpaid.length" class="n">{{ unpaid.length }}</span></button>
      <button :class="{ on: tab === 'tables' }" @click="tab = 'tables'">Τραπέζια</button>
    </nav>
  </main>
</template>
