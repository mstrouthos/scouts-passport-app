<script setup lang="ts">
/* The door, table by table: booked, arrived, who is still to come. A cashier
   lets a party in — count, cash or card (the kind they take), account for a
   card. Everyone else reads it. */
const props = defineProps<{ me: any; canAdmit?: boolean }>()
const arrivals = ref<any[]>([])
const toast = ref('')
let timer: any = null
const balances = ref<Record<number, { issued: number; used: number; left: number }>>({})
async function refresh() { try { [arrivals.value, balances.value] = await Promise.all([$fetch<any[]>('/api/bar/arrivals'), $fetch<any>('/api/bar/coupons')]) } catch {} }
onMounted(() => { refresh(); timer = setInterval(refresh, 4000) })
onUnmounted(() => clearInterval(timer))
function say(m: string) { toast.value = m; setTimeout(() => { toast.value = '' }, 2000) }

const seats = computed<Record<string, number>>(() => props.me.event.layout?.seats || {})
const kidSeats = computed<Record<string, number>>(() => props.me.event.layout?.kidSeats || {})
const ticket = computed(() => props.me.event.entranceCents || 0)
const tables = computed(() => Array.from({ length: props.me.event.tableCount }, (_, i) => i + 1).map(no => {
  const booked = seats.value[String(no)] || 0, kidsBooked = kidSeats.value[String(no)] || 0
  const mine = arrivals.value.filter(a => a.tableNo === no)
  const arrived = mine.reduce((s, a) => s + a.count, 0), kidsArrived = mine.reduce((s, a) => s + (a.kids || 0), 0)
  return { no, booked, arrived, extra: Math.max(0, arrived - booked), kidsBooked, kidsArrived, kidsExtra: Math.max(0, kidsArrived - kidsBooked), entries: mine }
}))
const shown = computed(() => tables.value.filter(t => t.booked || t.arrived || t.kidsBooked || t.kidsArrived))
const totals = computed(() => ({
  booked: shown.value.reduce((s, t) => s + t.booked, 0),
  arrived: shown.value.reduce((s, t) => s + t.arrived, 0),
  extra: shown.value.reduce((s, t) => s + t.extra, 0),
  kidsBooked: shown.value.reduce((s, t) => s + t.kidsBooked, 0),
  kidsArrived: shown.value.reduce((s, t) => s + t.kidsArrived, 0),
  cash: arrivals.value.filter(a => a.method === 'cash').reduce((s, a) => s + a.count, 0) * ticket.value,
  card: arrivals.value.filter(a => a.method === 'card' && a.confirmedAt).reduce((s, a) => s + a.count, 0) * ticket.value,
  cardPending: arrivals.value.filter(a => a.method === 'card' && !a.confirmedAt).reduce((s, a) => s + a.count, 0) * ticket.value
}))

/* letting a party in */
const accepts = computed<string[]>(() => props.me.accepts || [])
// anyone at the door can write down a card; only the machine's holder confirms it
const takesCard = computed(() => accepts.value.includes('card'))
const takesCash = computed(() => accepts.value.includes('cash'))
const pendingCards = computed(() => arrivals.value.filter(a => a.method === 'card' && !a.confirmedAt))
const confirming = ref<number | null>(null)
async function confirmCard(a: any) {
  if (!accountId.value) return say('Διάλεξε λογαριασμό')
  try { await $fetch(`/api/bar/arrivals/${a.id}/confirm`, { method: 'POST', body: { accountId: accountId.value } }); confirming.value = null; await refresh() }
  catch (e: any) { say(e?.data?.message || 'Κάτι πήγε στραβά') }
}
const open = ref<number | null>(null)
const count = ref(1)
const kids = ref(0)
const method = ref<'cash' | 'card'>(takesCash.value ? 'cash' : 'card')
const accountId = ref<number | null>(props.me.accounts?.[0]?.id ?? null)
function start(t: any) { open.value = t.no; count.value = Math.max(0, t.booked - t.arrived); kids.value = Math.max(0, t.kidsBooked - t.kidsArrived); if (!count.value && !kids.value) count.value = 1 }
async function admit() {
  try {
    const r = await $fetch<any>('/api/bar/arrivals', { method: 'POST', body: { tableNo: open.value, count: count.value, kids: kids.value, method: method.value, accountId: method.value === 'card' && takesCard.value ? accountId.value : undefined } })
    say(r.pending ? `Μπήκαν ${count.value + kids.value} · η κάρτα περιμένει το ταμείο καρτών` : `Μπήκαν ${count.value + kids.value} · Τραπέζι ${open.value}`); open.value = null; await refresh()
  } catch (e: any) { say(e?.data?.message || 'Κάτι πήγε στραβά') }
}
async function undo(a: any) {
  if (!confirm(`Αναίρεση: ${a.count} άτομα, Τραπέζι ${a.tableNo};`)) return
  try { await $fetch(`/api/bar/arrivals/${a.id}`, { method: 'DELETE' }); await refresh() } catch (e: any) { say(e?.data?.message || 'Κάτι πήγε στραβά') }
}
const clock = (iso: string) => new Date(iso).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div style="display:flex;flex-direction:column;gap:10px">
    <div class="card" style="flex-direction:row;justify-content:space-around;text-align:center;padding:10px">
      <div><b style="font-size:18px">{{ totals.arrived + totals.kidsArrived }}<span style="opacity:.5">/{{ totals.booked + totals.kidsBooked }}</span></b><br><span style="font-size:11px;opacity:.6">ΑΤΟΜΑ</span></div>
      <div><b style="font-size:18px">{{ totals.arrived }}<span style="opacity:.5">/{{ totals.booked }}</span></b><br><span style="font-size:11px;opacity:.6">ΕΝΗΛΙΚΕΣ</span></div>
      <div v-if="totals.kidsBooked || totals.kidsArrived"><b style="font-size:18px">{{ totals.kidsArrived }}<span style="opacity:.5">/{{ totals.kidsBooked }}</span></b><br><span style="font-size:11px;opacity:.6">ΠΑΙΔΙΑ</span></div>
      <div v-if="totals.extra"><b style="font-size:18px;color:#F0B429">+{{ totals.extra }}</b><br><span style="font-size:11px;opacity:.6">ΕΞΤΡΑ</span></div>
      <div v-if="ticket"><b style="font-size:18px">{{ eur(totals.cash + totals.card) }}</b><br><span style="font-size:11px;opacity:.6">ΕΙΣΟΔΟΣ</span></div>
      <div v-if="ticket && accepts.includes('cash')"><b style="font-size:16px">{{ eur(totals.cash) }}</b><br><span style="font-size:11px;opacity:.6">ΜΕΤΡΗΤΑ</span></div>
      <div v-if="ticket && accepts.includes('card')"><b style="font-size:16px">{{ eur(totals.card) }}</b><br><span style="font-size:11px;opacity:.6">ΚΑΡΤΑ</span></div>
      <div v-if="ticket && totals.cardPending"><b style="font-size:16px;color:#B7C2FF">{{ eur(totals.cardPending) }}</b><br><span style="font-size:11px;opacity:.6">ΚΑΡΤΑ · ΑΝΑΜΟΝΗ</span></div>
    </div>

    <!-- door cards written down by a cashier without the machine -->
    <template v-if="canAdmit && takesCard && pendingCards.length">
      <div class="cat">Κάρτες προς επιβεβαίωση · {{ pendingCards.length }}</div>
      <div v-for="a in pendingCards" :key="a.id" class="order" style="gap:6px">
        <div class="hd"><span class="tb">Τραπέζι {{ a.tableNo }}</span><span class="meta">{{ a.count }} άτομα · {{ a.cashierName }} · {{ clock(a.createdAt) }}</span></div>
        <div v-if="confirming === a.id" style="display:flex;flex-wrap:wrap;gap:6px">
          <button v-for="acc in me.accounts" :key="acc.id" class="btn sm" :class="accountId === acc.id ? '' : 'ghost'" @click="accountId = acc.id">🏦 {{ acc.name }}</button>
        </div>
        <div class="acts">
          <button class="btn ok" @click="confirming === a.id ? confirmCard(a) : (confirming = a.id)">{{ confirming === a.id ? 'Η κάρτα πέρασε ✓' : `Η κάρτα πέρασε… · ${eur(a.count * ticket)}` }}</button>
          <button v-if="confirming === a.id" class="btn ghost sm" @click="confirming = null">✕</button>
        </div>
      </div>
    </template>
    <div v-if="!ticket" class="hint" style="text-align:left">Η τιμή εισόδου δεν έχει οριστεί — τα άτομα μετριούνται, τα χρήματα όχι.</div>

    <div v-if="!shown.length" class="empty">Κανένα τραπέζι με κράτηση ακόμη.</div>
    <div v-for="t in shown" :key="t.no" class="order" style="gap:6px">
      <div class="hd"><span class="tb">Τραπέζι {{ t.no }}</span>
        <span class="meta" style="text-align:right">
          <b style="font-size:20px" :style="t.extra || t.kidsExtra ? 'color:#F0B429' : t.arrived + t.kidsArrived >= t.booked + t.kidsBooked && t.booked + t.kidsBooked ? 'color:#7BE0AC' : ''">{{ t.arrived + t.kidsArrived }}<span style="opacity:.5;font-size:14px">/{{ t.booked + t.kidsBooked }}</span></b>
          <br><span style="font-size:12px;opacity:.75">👤 {{ t.arrived }}/{{ t.booked }}<template v-if="t.kidsBooked || t.kidsArrived"> · 👶 {{ t.kidsArrived }}/{{ t.kidsBooked }}</template><template v-if="balances[t.no]?.issued"> · 🎟 {{ balances[t.no].used }}/{{ balances[t.no].issued }}</template></span>
          <span v-if="t.extra" class="pill pending" style="margin-left:6px">+{{ t.extra }} έξτρα</span>
          <span v-if="t.kidsExtra" class="pill pending" style="margin-left:6px">+{{ t.kidsExtra }} 👶</span>
        </span></div>
      <div v-if="t.entries.length" style="display:flex;flex-direction:column;gap:2px;font-size:12px;opacity:.75">
        <div v-for="a in t.entries" :key="a.id" style="display:flex;gap:8px;align-items:center">
          <span>{{ clock(a.createdAt) }}</span><span style="flex:1">{{ a.count }} ενήλ.<template v-if="a.kids"> + {{ a.kids }} παιδ.</template> · {{ a.count ? KIND[a.method] : 'δωρεάν' }}<template v-if="a.accountName"> · {{ a.accountName }}</template> · {{ a.cashierName }}<span v-if="a.method === 'card' && !a.confirmedAt" class="pill pending" style="margin-left:6px">αναμονή</span></span>
          <button v-if="canAdmit && a.cashierId === me.id" class="btn ghost sm" style="padding:3px 8px;font-size:11px" @click="undo(a)">✕</button>
        </div>
      </div>
      <template v-if="canAdmit">
        <div v-if="open === t.no" style="display:flex;flex-direction:column;gap:8px;border-top:1px solid rgba(255,255,255,.1);padding-top:8px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="flex:1">👤 Ενήλικες{{ ticket ? ' · ' + eur(ticket) : '' }}</span>
            <div class="q" style="display:flex;align-items:center;gap:8px">
              <button class="btn ghost sm" @click="count = Math.max(0, count - 1)">−</button><b style="font-size:20px;min-width:28px;text-align:center">{{ count }}</b><button class="btn sm" @click="count = Math.min(99, count + 1)">+</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="flex:1">👶 Παιδιά · δωρεάν</span>
            <div class="q" style="display:flex;align-items:center;gap:8px">
              <button class="btn ghost sm" @click="kids = Math.max(0, kids - 1)">−</button><b style="font-size:20px;min-width:28px;text-align:center">{{ kids }}</b><button class="btn sm" @click="kids = Math.min(99, kids + 1)">+</button>
            </div>
          </div>
          <div v-if="takesCash && count > 0" class="seg2" style="margin:0">
            <button :class="{ on: method === 'cash' }" @click="method = 'cash'">💶 Μετρητά</button>
            <button :class="{ on: method === 'card' }" @click="method = 'card'">💳 Κάρτα</button>
          </div>
          <div v-if="count > 0 && method === 'card' && takesCard" style="display:flex;flex-wrap:wrap;gap:6px">
            <button v-for="a in me.accounts" :key="a.id" class="btn sm" :class="accountId === a.id ? '' : 'ghost'" @click="accountId = a.id">🏦 {{ a.name }}</button>
            <span v-if="!me.accounts?.length" class="hint">Πρόσθεσε λογαριασμό στις Ρυθμίσεις</span>
          </div>
          <div v-else-if="count > 0 && method === 'card'" class="hint" style="text-align:left">Η κάρτα θα επιβεβαιωθεί από το ταμείο καρτών.</div>
          <div class="acts">
            <button class="btn ok" :disabled="(!count && !kids) || (count > 0 && method === 'card' && takesCard && !accountId)" @click="admit">Μπήκαν {{ count + kids }}{{ ticket ? ' · ' + eur(count * ticket) : '' }} ✓</button>
            <button class="btn ghost sm" @click="open = null">✕</button>
          </div>
        </div>
        <button v-else class="btn ghost sm" style="align-self:flex-start" @click="start(t)">+ Ήρθαν</button>
      </template>
    </div>
    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>
