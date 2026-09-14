<script setup lang="ts">
/* The cashier holds the card machine: every card payment a waiter has
   marked waits here until the cashier confirms it went through. */
defineProps<{ me: any }>()
const { orders, act, toast } = useBarOrders()
const tab = ref<'cards' | 'all'>('cards')
const pending = computed(() => orders.value.filter(o => o.status !== 'cancelled' && o.paidAt && o.paidMethod === 'card' && !o.cardConfirmedAt))
const live = computed(() => orders.value.filter(o => o.status !== 'cancelled'))
const sum = (xs: any[]) => xs.reduce((a, o) => a + o.totalCents, 0)
const cash = computed(() => sum(live.value.filter(o => o.paidMethod === 'cash' && o.paidAt)))
const card = computed(() => sum(live.value.filter(o => o.paidMethod === 'card' && o.cardConfirmedAt)))
const owed = computed(() => sum(live.value.filter(o => !o.paidAt)))
</script>

<template>
  <main>
    <template v-if="tab === 'cards'">
      <div v-if="!pending.length" class="empty">Καμία κάρτα σε αναμονή.</div>
      <div v-for="o in pending" :key="o.id" class="order">
        <div class="hd"><span class="no">#{{ o.number }}</span><span class="tb">Τραπέζι {{ o.tableNo }}</span>
          <span class="meta">{{ o.waiterName }} · {{ clock(o.paidAt) }}</span></div>
        <div class="lines"><div v-for="i in o.items" :key="i.id"><b>{{ i.qty }}×</b>{{ i.name }}</div></div>
        <div class="tot"><span>Κάρτα</span><b style="font-size:20px">{{ eur(o.totalCents) }}</b></div>
        <div class="acts"><button class="btn ok" @click="act(o.id, 'confirm-card')">Η κάρτα πέρασε ✓</button></div>
      </div>
    </template>
    <template v-else>
      <div class="card" style="gap:6px">
        <div style="display:flex;justify-content:space-between"><span>Μετρητά</span><b>{{ eur(cash) }}</b></div>
        <div style="display:flex;justify-content:space-between"><span>Κάρτες (επιβεβαιωμένες)</span><b>{{ eur(card) }}</b></div>
        <div style="display:flex;justify-content:space-between"><span>Απλήρωτα</span><b style="color:#FF9A8B">{{ eur(owed) }}</b></div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.1);padding-top:6px"><span>Παραγγελίες</span><b>{{ live.length }}</b></div>
      </div>
      <div v-for="o in live.slice().reverse()" :key="o.id" class="order">
        <div class="hd"><span class="no">#{{ o.number }}</span><span class="tb">Τραπέζι {{ o.tableNo }}</span>
          <span class="meta">{{ o.waiterName }} · {{ clock(o.createdAt) }}<br><span class="pill" :class="payClass(o)">{{ payLabel(o) }}</span></span></div>
        <div class="tot"><span class="pill" :class="o.status">{{ ({ new: 'Στο μπαρ', ready: 'Έτοιμη', delivered: 'Παραδόθηκε' } as any)[o.status] }}</span><b>{{ eur(o.totalCents) }}</b></div>
      </div>
    </template>
    <div v-if="toast" class="toast">{{ toast }}</div>
    <nav class="tabs">
      <button :class="{ on: tab === 'cards' }" @click="tab = 'cards'">Κάρτες<span v-if="pending.length" class="n">{{ pending.length }}</span></button>
      <button :class="{ on: tab === 'all' }" @click="tab = 'all'">Όλη η βραδιά</button>
    </nav>
  </main>
</template>
