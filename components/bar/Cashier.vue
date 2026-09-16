<script setup lang="ts">
/* A cashier takes certain kinds of money — cash and coupons, say, or cards.
   Orders that will be paid that way queue up here until the cashier has
   the money in hand and confirms it; for a card, naming the account it
   went to. The card cashier can add accounts as they go. */
const props = defineProps<{ me: any }>()
const { orders, act, toast, say } = useBarOrders()
const tab = ref<'pending' | 'done' | 'tables' | 'all'>('pending')
const accepts = computed<string[]>(() => props.me.accepts || [])
const takesCard = computed(() => accepts.value.includes('card'))
const live = computed(() => orders.value.filter(o => o.status !== 'cancelled'))
const pending = computed(() => live.value.filter(o => !o.paidAt && accepts.value.includes(o.paidMethod)))
const done = computed(() => live.value.filter(o => o.paidBy === props.me.id).slice().reverse())
const sum = (xs: any[]) => xs.reduce((a, o) => a + o.totalCents, 0)
const byKind = (k: string) => sum(live.value.filter(o => o.paidAt && o.paidMethod === k))

/* card: pick the account, then confirm */
const accounts = ref<any[]>(props.me.accounts || [])
const picking = ref<number | null>(null)
const chosen = ref<number | null>(accounts.value[0]?.id ?? null)
async function pay(o: any) {
  if (o.paidMethod === 'card') {
    if (!accounts.value.length) return say('Πρόσθεσε πρώτα έναν λογαριασμό')
    if (picking.value !== o.id) { picking.value = o.id; return }
    if (await act(o.id, 'pay', { accountId: chosen.value })) picking.value = null
  } else await act(o.id, 'pay')
}
const adding = ref(false)
const newName = ref('')
async function addAccount() {
  const name = newName.value.trim(); if (!name) return
  try {
    const a = await $fetch<any>('/api/bar/accounts', { method: 'POST', body: { name } })
    accounts.value.push(a); chosen.value = a.id; newName.value = ''; adding.value = false
  } catch (e: any) { say(e?.data?.message || 'Κάτι πήγε στραβά') }
}
</script>

<template>
  <main>
    <div class="card" style="flex-direction:row;justify-content:space-around;text-align:center;padding:10px">
      <div v-for="k in accepts" :key="k"><b style="font-size:18px">{{ eur(byKind(k)) }}</b><br><span style="font-size:11px;opacity:.6">{{ KIND[k].toUpperCase() }}</span></div>
      <div><b style="font-size:18px;color:#FF9A8B">{{ eur(sum(pending)) }}</b><br><span style="font-size:11px;opacity:.6">ΕΚΚΡΕΜΟΥΝ</span></div>
    </div>

    <template v-if="tab === 'pending'">
      <div v-if="!pending.length" class="empty">Τίποτα προς πληρωμή. 👌</div>
      <div v-for="o in pending" :key="o.id" class="order">
        <div class="hd"><span class="no">#{{ o.number }}</span><span class="tb">Τραπέζι {{ o.tableNo }}</span>
          <span class="meta">{{ o.waiterName }} · {{ clock(o.createdAt) }}<br><span class="pill" :class="o.status">{{ ({ new: 'Στο μπαρ', ready: 'Έτοιμη', delivered: 'Παραδόθηκε' } as any)[o.status] }}</span></span></div>
        <div class="lines"><div v-for="i in o.items" :key="i.id"><b>{{ i.qty }}×</b>{{ i.name }}<span v-if="i.couponQty" class="cpn on">🎟 {{ i.couponQty * (i.couponCost || 1) }}</span></div></div>
        <div class="tot"><span class="pill" :class="payClass(o)">{{ KIND[o.paidMethod] }}</span><b style="font-size:20px">{{ eur(o.totalCents) }}</b></div>
        <div v-if="o.paidMethod === 'card' && picking === o.id" class="chips" style="display:flex;flex-wrap:wrap;gap:6px">
          <button v-for="a in accounts" :key="a.id" class="btn sm" :class="chosen === a.id ? '' : 'ghost'" @click="chosen = a.id">🏦 {{ a.name }}</button>
        </div>
        <div class="acts">
          <button class="btn ok" @click="pay(o)">
            {{ o.paidMethod === 'card' ? (picking === o.id ? 'Η κάρτα πέρασε ✓' : 'Η κάρτα πέρασε…') : o.paidMethod === 'coupon' ? 'Πήρα τα κουπόνια ✓' : 'Πήρα τα μετρητά ✓' }}
          </button>
          <button v-if="picking === o.id" class="btn ghost sm" @click="picking = null">✕</button>
        </div>
      </div>
    </template>

    <template v-else-if="tab === 'done'">
      <div v-if="!done.length" class="empty">Καμία πληρωμή ακόμη.</div>
      <div v-for="o in done" :key="o.id" class="order">
        <div class="hd"><span class="no">#{{ o.number }}</span><span class="tb">Τραπέζι {{ o.tableNo }}</span>
          <span class="meta">{{ clock(o.paidAt) }}<br><span class="pill paid">{{ payLabel(o) }}</span></span></div>
        <div class="tot"><button class="btn ghost sm" @click="act(o.id, 'unpay')">Αναίρεση</button><b>{{ eur(o.totalCents) }}</b></div>
      </div>
    </template>

    <template v-else-if="tab === 'tables'"><BarTables :orders="orders" /></template>

    <template v-else>
      <div v-if="takesCard" class="card" style="gap:8px">
        <b style="font-size:13px">🏦 Λογαριασμοί για κάρτες</b>
        <div v-for="a in accounts" :key="a.id" style="font-size:14px">{{ a.name }} <span style="opacity:.6">· {{ eur(sum(live.filter(o => o.accountId === a.id))) }}</span></div>
        <div v-if="!accounts.length" class="hint" style="text-align:left">Κανένας ακόμη — πρόσθεσε πού πάνε τα λεφτά της κάρτας.</div>
        <div v-if="adding" style="display:flex;gap:8px">
          <input v-model="newName" class="in" placeholder="π.χ. Τράπεζα Κύπρου · Σύστημα" @keyup.enter="addAccount">
          <button class="btn sm" @click="addAccount">OK</button>
        </div>
        <button v-else class="btn ghost sm" @click="adding = true">+ Λογαριασμός</button>
      </div>
      <div v-for="o in live.slice().reverse()" :key="o.id" class="order">
        <div class="hd"><span class="no">#{{ o.number }}</span><span class="tb">Τραπέζι {{ o.tableNo }}</span>
          <span class="meta">{{ o.waiterName }} · {{ clock(o.createdAt) }}<br><span class="pill" :class="payClass(o)">{{ payLabel(o) }}</span></span></div>
        <div class="tot"><span class="pill" :class="o.status">{{ ({ new: 'Στο μπαρ', ready: 'Έτοιμη', delivered: 'Παραδόθηκε' } as any)[o.status] }}</span><b>{{ eur(o.totalCents) }}</b></div>
      </div>
    </template>

    <div v-if="toast" class="toast">{{ toast }}</div>
    <nav class="tabs">
      <button :class="{ on: tab === 'pending' }" @click="tab = 'pending'">Προς πληρωμή<span v-if="pending.length" class="n">{{ pending.length }}</span></button>
      <button :class="{ on: tab === 'done' }" @click="tab = 'done'">Πληρωμένα</button>
      <button :class="{ on: tab === 'tables' }" @click="tab = 'tables'">Τραπέζια</button>
      <button :class="{ on: tab === 'all' }" @click="tab = 'all'">Όλα</button>
    </nav>
  </main>
</template>
