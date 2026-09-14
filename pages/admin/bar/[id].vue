<script setup lang="ts">
/* One night of the bar: its menu, its crew with their codes, its figures.
   The Αρχηγός Συστήματος sets it up; the Ομάδα's Αρχηγός reads it. */
const { t } = useI18n()
const { show } = useToast()
const route = useRoute()
const id = Number(route.params.id)
const { data, refresh } = await useFetch<any>(`/api/admin/bar/events/${id}`)
const tab = ref<'menu' | 'staff' | 'report' | 'orders'>('menu')
const canEdit = computed(() => data.value?.canEdit === true)
const eur = (c: number) => (c / 100).toFixed(2).replace('.', ',') + ' €'
const api = async (path: string, method: any, body?: any) => {
  try { const r = await $fetch<any>(`/api/admin/bar/events/${id}${path}`, { method, body }); await refresh(); return r }
  catch (e: any) { show(e?.data?.message || t('error')) }
}

/* settings */
async function rename() {
  const name = prompt(t('name'), data.value.name); if (name && name.trim()) await api('', 'PATCH', { name })
}
async function setTables() {
  const n = prompt(t('barTables'), String(data.value.tableCount)); if (n) await api('', 'PATCH', { tableCount: Number(n) })
}
async function toggleStatus() {
  const closing = data.value.status === 'open'
  if (closing && !confirm(t('barCloseConfirm'))) return
  await api('', 'PATCH', { status: closing ? 'closed' : 'open' })
}

/* menu */
const mform = reactive({ category: '', name: '', price: '' })
const cats = computed(() => [...new Set((data.value?.menu || []).map((m: any) => m.category))] as string[])
async function addItem() {
  if (!mform.name.trim()) return
  await api('/menu', 'POST', { category: mform.category, name: mform.name, price: Number(String(mform.price).replace(',', '.')) })
  mform.name = ''; mform.price = ''
}
async function editItem(m: any) {
  const name = prompt(t('name'), m.name); if (name === null) return
  const price = prompt(t('barPrice'), (m.priceCents / 100).toFixed(2)); if (price === null) return
  await api(`/menu/${m.id}`, 'PATCH', { name, price: Number(price.replace(',', '.')) })
}
async function removeItem(m: any) {
  if (!confirm(t('barRemoveItem', { name: m.name }))) return
  await api(`/menu/${m.id}`, 'DELETE')
}
/* the printed menu of the Μουσική Βραδιά, ready to load in one tap */
const DEFAULT_MENU = [
  { category: 'Ποτά', name: 'Νερό', price: 1 }, { category: 'Ποτά', name: 'Αναψυκτικά', price: 2 },
  { category: 'Ποτά', name: 'Μπύρα KEO 330ml', price: 3 }, { category: 'Ποτά', name: 'Bucket 6 μπύρες KEO 330ml', price: 15 },
  { category: 'Ποτά', name: 'Ζιβανία 200ml', price: 10 }, { category: 'Ποτά', name: 'Ποτήρι κρασί', price: 3 },
  { category: 'Ποτά', name: 'Μπουκάλι κρασί', price: 10 },
  { category: 'Σνακ', name: 'Nachos με dips', price: 5 }, { category: 'Σνακ', name: 'Platter αλλαντικών και τυριών', price: 10 }
]
async function loadDefault() { await api('/menu', 'POST', { items: DEFAULT_MENU }) }

/* crew */
const sform = reactive({ name: '', role: 'waiter', bartenderId: 0 })
const bartenders = computed(() => (data.value?.staff || []).filter((x: any) => x.role === 'bartender' && x.isActive))
const crew = computed(() => (data.value?.staff || []).filter((x: any) => x.isActive))
const roleName = (r: string) => ({ waiter: t('barWaiter'), bartender: 'Bartender', cashier: t('barCashier') } as any)[r]
const bartenderName = (bid: number | null) => bartenders.value.find((b: any) => b.id === bid)?.name || '—'
const fmtCode = (c: string) => c.slice(0, 3) + ' ' + c.slice(3)
async function addStaff() {
  if (!sform.name.trim()) return
  await api('/staff', 'POST', { name: sform.name, role: sform.role, bartenderId: sform.role === 'waiter' ? sform.bartenderId || null : null })
  sform.name = ''
}
async function reassign(w: any) {
  const opts = bartenders.value.map((b: any, i: number) => `${i + 1} = ${b.name}`).join('\n')
  const pick = prompt(`${t('barAssignTo')}\n${opts}`, '')
  const b = bartenders.value[Number(pick) - 1]
  if (b) await api(`/staff/${w.id}`, 'PATCH', { bartenderId: b.id })
}
async function renameStaff(x: any) {
  const name = prompt(t('name'), x.name); if (name && name.trim()) await api(`/staff/${x.id}`, 'PATCH', { name })
}
async function newCode(x: any) {
  if (!confirm(t('barNewCodeConfirm', { name: x.name }))) return
  await api(`/staff/${x.id}`, 'PATCH', { newCode: true })
}
async function removeStaff(x: any) {
  if (!confirm(t('barRemoveStaff', { name: x.name }))) return
  await api(`/staff/${x.id}`, 'DELETE')
}
function share(x: any) {
  const text = `${x.name}, ο κωδικός σου για το μπαρ (${data.value.name}) είναι ${fmtCode(x.code)}.\nΆνοιξε ${location.origin}/bar και βάλ' τον.`
  if (navigator.share) navigator.share({ text }).catch(() => {})
  else { navigator.clipboard?.writeText(text); show('📋 ' + t('copied')) }
}

/* the books */
const report = ref<any>(null)
const orders = ref<any[]>([])
watch(tab, async (v) => {
  if (v === 'report') report.value = await $fetch(`/api/admin/bar/events/${id}/report`)
  if (v === 'orders') orders.value = await $fetch(`/api/admin/bar/events/${id}/orders`)
})
const payLabel = (o: any) => !o.paidAt ? t('barUnpaid') : o.paidMethod === 'cash' ? t('barCash') : o.cardConfirmedAt ? t('barCard') + ' ✓' : t('barCardPending')
const clock = (iso: string) => new Date(iso).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <AppShell v-if="data" no-tabs :title="data.name" :sub="`${data.eventDate || ''} · ${data.tableCount} ${t('barTables').toLowerCase()} · ${data.status === 'open' ? t('barOpen') : t('barClosed')}`" back="/admin/bar">
    <template #actions>
      <button v-if="canEdit" class="iconbtn" :aria-label="t('edit')" @click="rename">✎</button>
    </template>

    <div class="seg">
      <button :class="{ on: tab === 'menu' }" @click="tab = 'menu'">{{ t('barMenu') }}</button>
      <button :class="{ on: tab === 'staff' }" @click="tab = 'staff'">{{ t('barCrew') }}</button>
      <button :class="{ on: tab === 'orders' }" @click="tab = 'orders'">{{ t('barOrdersTab') }}</button>
      <button :class="{ on: tab === 'report' }" @click="tab = 'report'">{{ t('barReport') }}</button>
    </div>

    <!-- menu -->
    <template v-if="tab === 'menu'">
      <div v-if="canEdit && !data.menu.length" class="card" style="display:flex;flex-direction:column;gap:8px">
        <div class="tiny muted">{{ t('barMenuEmpty') }}</div>
        <button class="btn ghost" @click="loadDefault">📋 {{ t('barLoadDefault') }}</button>
      </div>
      <div v-for="c in cats" :key="c" class="adm">
        <div class="hdr">{{ c || t('barMenu') }}</div>
        <div v-for="m in data.menu.filter((x: any) => x.category === c)" :key="m.id" class="it" :style="m.isActive ? '' : 'opacity:.45'">
          <div style="flex:1"><b>{{ m.name }}</b><span>{{ eur(m.priceCents) }}<template v-if="!m.isActive"> · {{ t('barHidden') }}</template></span></div>
          <template v-if="canEdit">
            <button class="chip ic" :aria-label="t('edit')" @click="editItem(m)"><NavIcon name="pencil" /></button>
            <button class="chip ic" :aria-label="m.isActive ? t('barHide') : t('barShow')" @click="api(`/menu/${m.id}`, 'PATCH', { isActive: !m.isActive })"><NavIcon :name="m.isActive ? 'eyeOff' : 'eye'" /></button>
            <button class="chip ic" :aria-label="t('delete')" @click="removeItem(m)"><NavIcon name="trash" /></button>
          </template>
        </div>
      </div>
      <div v-if="canEdit" class="card" style="display:flex;flex-direction:column;gap:8px">
        <b style="font-size:13px">+ {{ t('barAddItem') }}</b>
        <input v-model="mform.category" class="in" :placeholder="t('barCategory')" list="cats">
        <datalist id="cats"><option v-for="c in cats" :key="c" :value="c" /></datalist>
        <div style="display:flex;gap:8px">
          <input v-model="mform.name" class="in" style="flex:1" :placeholder="t('name')">
          <input v-model="mform.price" class="in" style="width:90px" inputmode="decimal" placeholder="€">
        </div>
        <button class="btn" :disabled="!mform.name.trim()" @click="addItem">{{ t('add') }}</button>
      </div>
    </template>

    <!-- crew -->
    <template v-if="tab === 'staff'">
      <div class="note">{{ t('barCrewNote') }}</div>
      <div v-for="role in ['bartender', 'waiter', 'cashier']" :key="role" class="adm">
        <div class="hdr">{{ roleName(role) }} · {{ crew.filter((x: any) => x.role === role).length }}</div>
        <div v-for="x in crew.filter((y: any) => y.role === role)" :key="x.id" class="it" style="flex-wrap:wrap">
          <div style="flex:1;min-width:140px"><b>{{ x.name }}</b>
            <span v-if="x.role === 'waiter'">→ {{ bartenderName(x.bartenderId) }}</span>
            <span v-else-if="x.role === 'bartender'">{{ crew.filter((w: any) => w.bartenderId === x.id).map((w: any) => w.name).join(', ') || t('barNoWaiters') }}</span>
          </div>
          <code v-if="canEdit" style="font-size:15px;font-weight:700;letter-spacing:.1em;background:var(--bg2);padding:4px 8px;border-radius:8px">{{ fmtCode(x.code) }}</code>
          <template v-if="canEdit">
            <button class="chip ic" :aria-label="t('edit')" @click="renameStaff(x)"><NavIcon name="pencil" /></button>
            <button class="chip" @click="share(x)">📤 {{ t('barCode') }}</button>
            <button v-if="x.role === 'waiter'" class="chip" @click="reassign(x)">↔ Bartender</button>
            <button class="chip" @click="newCode(x)">🔁 {{ t('barNewCode') }}</button>
            <button class="chip ic" :aria-label="t('delete')" @click="removeStaff(x)"><NavIcon name="trash" /></button>
          </template>
        </div>
      </div>
      <div v-if="canEdit" class="card" style="display:flex;flex-direction:column;gap:8px">
        <b style="font-size:13px">+ {{ t('barAddStaff') }}</b>
        <input v-model="sform.name" class="in" :placeholder="t('name')">
        <div class="chips">
          <button v-for="r in ['bartender', 'waiter', 'cashier']" :key="r" class="chip" :class="{ on: sform.role === r }" @click="sform.role = r">{{ roleName(r) }}</button>
        </div>
        <div v-if="sform.role === 'waiter'">
          <label class="lab">{{ t('barAssignTo') }}</label>
          <div class="chips">
            <button v-for="b in bartenders" :key="b.id" class="chip" :class="{ on: sform.bartenderId === b.id }" @click="sform.bartenderId = b.id">{{ b.name }}</button>
            <span v-if="!bartenders.length" class="tiny muted">{{ t('barAddBartenderFirst') }}</span>
          </div>
        </div>
        <button class="btn" :disabled="!sform.name.trim() || (sform.role === 'waiter' && !sform.bartenderId)" @click="addStaff">{{ t('add') }}</button>
      </div>
      <button v-if="canEdit" class="btn" :class="data.status === 'open' ? 'danger' : ''" @click="toggleStatus">
        {{ data.status === 'open' ? '🔒 ' + t('barClose') : '🔓 ' + t('barReopen') }}
      </button>
      <button v-if="canEdit" class="btn ghost" @click="setTables">🪑 {{ t('barTables') }}: {{ data.tableCount }}</button>
    </template>

    <!-- orders -->
    <template v-if="tab === 'orders'">
      <div class="adm">
        <div class="hdr">{{ t('barOrdersTab') }} · {{ orders.length }}</div>
        <div v-for="o in orders.slice().reverse()" :key="o.id" class="it" :style="o.status === 'cancelled' ? 'opacity:.45' : ''">
          <div style="flex:1"><b>#{{ o.number }} · {{ t('barTable') }} {{ o.tableNo }} · {{ eur(o.totalCents) }}</b>
            <span>{{ o.items.map((i: any) => `${i.qty}× ${i.name}`).join(', ') }}</span>
            <span style="display:block">{{ clock(o.createdAt) }} · {{ o.waiterName }} → {{ o.bartenderName }} · {{ o.status === 'cancelled' ? t('barCancelled') : payLabel(o) }}</span>
          </div>
        </div>
        <div v-if="!orders.length" class="it"><span>{{ t('barNoOrders') }}</span></div>
      </div>
    </template>

    <!-- the books -->
    <template v-if="tab === 'report' && report">
      <div class="stats">
        <div class="stat"><b>{{ eur(report.paidCents) }}</b><span>{{ t('barTakings') }}</span></div>
        <div class="stat"><b>{{ report.orders }}</b><span>{{ t('barOrders') }}</span></div>
        <div class="stat"><b>{{ eur(report.avgOrderCents) }}</b><span>{{ t('barAvgOrder') }}</span></div>
        <div class="stat"><b>{{ eur(report.cashCents) }}</b><span>{{ t('barCash') }}</span></div>
        <div class="stat"><b>{{ eur(report.cardCents) }}</b><span>{{ t('barCard') }}</span></div>
        <div class="stat" :style="report.unpaidCents ? 'color:var(--danger)' : ''"><b>{{ eur(report.unpaidCents) }}</b><span>{{ t('barUnpaid') }} · {{ report.unpaidOrders }}</span></div>
        <div v-if="report.cardPendingCents" class="stat"><b>{{ eur(report.cardPendingCents) }}</b><span>{{ t('barCardPending') }}</span></div>
        <div class="stat"><b>{{ report.avgPrepMin ?? '—' }}′</b><span>{{ t('barAvgPrep') }}</span></div>
        <div v-if="report.cancelled" class="stat"><b>{{ report.cancelled }}</b><span>{{ t('barCancelled') }}</span></div>
      </div>
      <div class="adm">
        <div class="hdr">{{ t('barSold') }}</div>
        <div v-for="i in report.items" :key="i.name" class="it">
          <div style="flex:1"><b>{{ i.name }}</b><span>{{ eur(i.cents) }}</span></div><b style="font-size:16px">{{ i.qty }}</b>
        </div>
      </div>
      <div class="adm">
        <div class="hdr">{{ t('barByTable') }}</div>
        <div v-for="r in report.tables" :key="r.label" class="it">
          <div style="flex:1"><b>{{ r.label }}</b><span>{{ r.orders }} {{ t('barOrders') }}<template v-if="r.paidCents !== r.cents"> · {{ t('barUnpaid') }} {{ eur(r.cents - r.paidCents) }}</template></span></div><b>{{ eur(r.cents) }}</b>
        </div>
      </div>
      <div class="adm">
        <div class="hdr">{{ t('barWaiters') }}</div>
        <div v-for="r in report.waiters" :key="r.label" class="it">
          <div style="flex:1"><b>{{ r.label }}</b><span>{{ r.orders }} {{ t('barOrders') }}</span></div><b>{{ eur(r.cents) }}</b>
        </div>
      </div>
      <div class="adm">
        <div class="hdr">Bartenders</div>
        <div v-for="r in report.bartenders" :key="r.label" class="it">
          <div style="flex:1"><b>{{ r.label }}</b><span>{{ r.orders }} {{ t('barOrders') }}</span></div><b>{{ eur(r.cents) }}</b>
        </div>
      </div>
      <div class="adm">
        <div class="hdr">{{ t('barByHour') }}</div>
        <div v-for="r in report.hours" :key="r.label" class="it">
          <div style="flex:1"><b>{{ r.label }}</b><span>{{ r.orders }} {{ t('barOrders') }}</span></div><b>{{ eur(r.cents) }}</b>
        </div>
      </div>
    </template>
  </AppShell>
</template>

<style scoped>
.chip.ic{padding:6px 9px;display:inline-flex}
.chip.ic svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.stat{background:var(--card);border-radius:14px;padding:12px 8px;text-align:center;box-shadow:var(--shadow)}
.stat b{display:block;font-size:17px;letter-spacing:-.02em}
.stat span{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
</style>
