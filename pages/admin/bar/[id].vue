<script setup lang="ts">
/* One night of the bar: its menu, its crew with their codes, its figures.
   The Αρχηγός Συστήματος sets it up; the Ομάδα's Αρχηγός reads it. */
const { t } = useI18n()
const { show } = useToast()
const route = useRoute()
const id = Number(route.params.id)
const { data, refresh } = await useFetch<any>(`/api/admin/bar/events/${id}`)
const tab = ref<'menu' | 'staff' | 'report' | 'orders' | 'settings'>('menu')
const canEdit = computed(() => data.value?.canEdit === true)
const eur = (c: number) => (c / 100).toFixed(2).replace('.', ',') + ' €'
const api = async (path: string, method: any, body?: any) => {
  try { const r = await $fetch<any>(`/api/admin/bar/events/${id}${path}`, { method, body }); await refresh(); return r }
  catch (e: any) { show(e?.data?.message || t('error')) }
}

/* settings: the event's own fields, edited together */
const eform = reactive({ name: '', eventDate: '', tableCount: 10, entrance: '' })
watch(() => data.value, d => { if (d) { eform.name = d.name; eform.eventDate = d.eventDate || ''; eform.tableCount = d.tableCount; eform.entrance = d.entranceCents ? (d.entranceCents / 100).toFixed(2) : '' } }, { immediate: true })
async function saveEvent() { if (await api('', 'PATCH', { name: eform.name, eventDate: eform.eventDate || null, tableCount: eform.tableCount, entranceCents: Math.round(Number(String(eform.entrance).replace(',', '.')) * 100) || 0 })) show('✅ ' + t('saved')) }
async function toggleStatus() {
  const closing = data.value.status === 'open'
  if (closing && !confirm(t('barCloseConfirm'))) return
  await api('', 'PATCH', { status: closing ? 'closed' : 'open' })
}

/* menu, in the order the waiters see it; drag the ≡ to change that, and an
   item dropped among another group's items joins that group */
const list = ref<any[]>([])
watch(() => data.value?.menu, m => { list.value = (m || []).map((x: any) => ({ ...x })) }, { immediate: true })
const rows = ref<HTMLElement[]>([])
let drag: { idx: number; moved: boolean } | null = null
const dragging = ref<number | null>(null)
function dragStart(e: PointerEvent, idx: number) {
  if (!canEdit.value) return
  drag = { idx, moved: false }; dragging.value = list.value[idx].id
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function dragMove(e: PointerEvent) {
  if (!drag) return
  const y = e.clientY
  const els = rows.value.filter(Boolean)
  let to = drag.idx
  for (let i = 0; i < els.length; i++) {
    const r = els[i].getBoundingClientRect()
    if (y < r.top + r.height / 2) { to = i; break }
    to = i
  }
  if (to !== drag.idx) {
    const [it] = list.value.splice(drag.idx, 1)
    list.value.splice(to, 0, it)
    drag.idx = to; drag.moved = true
  }
}
async function dragEnd() {
  if (!drag) return
  const moved = drag.moved, idx = drag.idx
  drag = null; dragging.value = null
  if (!moved) return
  // join the neighbours' group: the one above, else the one below
  const it = list.value[idx]
  const near = list.value[idx - 1] || list.value[idx + 1]
  if (near && near.category !== it.category) it.category = near.category
  await api('/menu/reorder', 'POST', { items: list.value.map(x => ({ id: x.id, category: x.category })) })
}
/* one form for a new item and for changing one — a sheet, not a chain of
   prompts */
const mform = reactive({ id: 0 as number, category: '', name: '', price: '', couponOk: false, couponCost: 1 })
const mopen = ref(false)
const cats = computed(() => [...new Set((data.value?.menu || []).map((m: any) => m.category))] as string[])
function openItem(m?: any) {
  mform.id = m?.id || 0
  mform.category = m?.category ?? (mform.category || cats.value[0] || '')
  mform.name = m?.name || ''
  mform.price = m ? (m.priceCents / 100).toFixed(2) : ''
  mform.couponOk = m?.couponOk ?? false
  mform.couponCost = m?.couponCost ?? 1
  mopen.value = true
}
async function saveItem() {
  if (!mform.name.trim()) return
  const body = { category: mform.category, name: mform.name, price: Number(String(mform.price).replace(',', '.')), couponOk: mform.couponOk, couponCost: mform.couponCost }
  const r = mform.id ? await api(`/menu/${mform.id}`, 'PATCH', body) : await api('/menu', 'POST', body)
  if (r) mopen.value = false
}
async function removeItem(m: any) {
  if (!confirm(t('barRemoveItem', { name: m.name }))) return
  await api(`/menu/${m.id}`, 'DELETE')
}
/* saved menus: keep this one for next time, or start from an earlier one */
const { data: templates, refresh: refreshTemplates } = await useFetch<any[]>('/api/admin/bar/templates')
async function saveTemplate() {
  const name = prompt(t('barTemplateName'), data.value.name); if (!name || !name.trim()) return
  try { await $fetch('/api/admin/bar/templates', { method: 'POST', body: { name, fromEventId: id } }); await refreshTemplates(); show('✅ ' + t('barTemplateSaved')) }
  catch (e: any) { show(e?.data?.message || t('error')) }
}
async function loadTemplate(tid: number) { await api('/menu/from-template', 'POST', { templateId: tid }) }
async function deleteTemplate(tpl: any) {
  if (!confirm(t('barTemplateDelete', { name: tpl.name }))) return
  try { await $fetch(`/api/admin/bar/templates/${tpl.id}`, { method: 'DELETE' }); await refreshTemplates() } catch (e: any) { show(e?.data?.message || t('error')) }
}

/* crew */
const sform = reactive({ name: '', role: 'waiter', bartenderId: 0, accepts: ['cash', 'coupon'] as string[] })
const KINDS = [['cash', '💶 ' + t('barCash')], ['card', '💳 ' + t('barCard')], ['coupon', '🎟 ' + t('barCoupons')]]
// orders taken before the method was asked have none — say so, don't crash
const kindLabel = (k: string | null) => (KINDS.find(x => x[0] === k) || [k, k || '— —'])[1] as string
function toggleKind(k: string) { sform.accepts = sform.accepts.includes(k) ? sform.accepts.filter(x => x !== k) : [...sform.accepts, k] }
async function setAccepts(x: any, k: string) {
  const cur = (x.accepts || '').split(',').filter(Boolean)
  await api(`/staff/${x.id}`, 'PATCH', { accepts: cur.includes(k) ? cur.filter((y: string) => y !== k) : [...cur, k] })
}
/* where card money lands */
const aform = ref('')
async function addAccount() { if (!aform.value.trim()) return; await api('/accounts', 'POST', { name: aform.value }); aform.value = '' }
async function removeAccount(a: any) { if (confirm(t('barRemoveAccount', { name: a.name }))) await api(`/accounts/${a.id}`, 'DELETE') }
const bartenders = computed(() => (data.value?.staff || []).filter((x: any) => x.role === 'bartender' && x.isActive))
const crew = computed(() => (data.value?.staff || []).filter((x: any) => x.isActive))
const roleName = (r: string) => ({ waiter: t('barWaiter'), bartender: 'Bartender', cashier: t('barCashier'), supervisor: t('barSupervisor'), organiser: t('barOrganiser') } as any)[r]
const bartenderName = (bid: number | null) => bartenders.value.find((b: any) => b.id === bid)?.name || '—'
const fmtCode = (c: string) => c.slice(0, 3) + ' ' + c.slice(3)
async function addStaff() {
  if (!sform.name.trim()) return
  await api('/staff', 'POST', { name: sform.name, role: sform.role, bartenderId: sform.role === 'waiter' ? sform.bartenderId || null : null, accepts: sform.role === 'cashier' ? sform.accepts : [] })
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

/* wiping the night's orders: a typed word, then gone */
const wipeOpen = ref(false)
const wipeWord = ref('')
async function wipe() {
  const r = await api('/reset', 'POST', { confirm: wipeWord.value })
  if (r) { wipeOpen.value = false; wipeWord.value = ''; show('🧹 ' + t('barWiped', { n: r.cleared })); if (tab.value === 'orders') orders.value = []; if (tab.value === 'report') report.value = await $fetch(`/api/admin/bar/events/${id}/report`) }
}

/* the books */
const report = ref<any>(null)
const orders = ref<any[]>([])
watch(tab, async (v) => {
  if (v === 'report') report.value = await $fetch(`/api/admin/bar/events/${id}/report`)
  if (v === 'orders') orders.value = await $fetch(`/api/admin/bar/events/${id}/orders`)
})
const openTable = ref<string | null>(null)
const payLabel = (o: any) => `${kindLabel(o.paidMethod).slice(2).trim()} ${o.paidAt ? '✓' + (o.accountName ? ' ' + o.accountName : '') : '· ' + t('pending').toLowerCase()}`
const clock = (iso: string) => new Date(iso).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <AppShell v-if="data" no-tabs :title="data.name" :sub="`${data.eventDate || ''} · ${data.tableCount} ${t('barTables').toLowerCase()} · ${data.status === 'open' ? t('barOpen') : t('barClosed')}`" back="/admin/bar">
    <template #actions>
      <button v-if="canEdit" class="iconbtn" :aria-label="t('edit')" @click="tab = 'settings'">✎</button>
    </template>

    <div class="seg" style="overflow-x:auto;-webkit-overflow-scrolling:touch">
      <button :class="{ on: tab === 'menu' }" @click="tab = 'menu'">{{ t('barMenu') }}</button>
      <button :class="{ on: tab === 'staff' }" @click="tab = 'staff'">{{ t('barCrew') }}</button>
      <button :class="{ on: tab === 'orders' }" @click="tab = 'orders'">{{ t('barOrdersTab') }}</button>
      <button :class="{ on: tab === 'report' }" @click="tab = 'report'">{{ t('barReport') }}</button>
      <button :class="{ on: tab === 'settings' }" @click="tab = 'settings'">{{ t('settings') }}</button>
    </div>

    <!-- menu -->
    <template v-if="tab === 'menu'">
      <div v-if="canEdit && !data.menu.length" class="card" style="display:flex;flex-direction:column;gap:8px">
        <div class="tiny muted">{{ t('barMenuEmpty') }}</div>
        <button v-for="tpl in templates" :key="tpl.id" class="btn ghost" @click="loadTemplate(tpl.id)">📋 {{ tpl.name }} · {{ tpl.items.length }}</button>
      </div>
      <div v-if="list.length" class="adm" style="touch-action:pan-y" @pointermove="dragMove" @pointerup="dragEnd" @pointercancel="dragEnd">
        <template v-for="(m, i) in list" :key="m.id">
          <div v-if="i === 0 || list[i - 1].category !== m.category" class="hdr">{{ m.category || t('barMenu') }}</div>
          <div :ref="el => { if (el) rows[i] = el as HTMLElement }" class="it" :class="{ lift: dragging === m.id }" :style="m.isActive ? '' : 'opacity:.45'">
          <span v-if="canEdit" class="grip" @pointerdown="dragStart($event, i)">≡</span>
          <div style="flex:1;min-width:0"><b>{{ m.name }}</b><span>{{ eur(m.priceCents) }}<template v-if="m.couponOk"> · 🎟 {{ m.couponCost > 1 ? '×' + m.couponCost : t('barCouponOk') }}</template><template v-if="!m.isActive"> · {{ t('barHidden') }}</template></span></div>
          <template v-if="canEdit">
            <button class="chip" :class="{ on: m.couponOk }" :aria-label="t('barCouponOk')" @click="api(`/menu/${m.id}`, 'PATCH', { couponOk: !m.couponOk })">🎟</button>
            <button class="chip ic" :aria-label="t('edit')" @click="openItem(m)"><NavIcon name="pencil" /></button>
            <button class="chip ic" :aria-label="m.isActive ? t('barHide') : t('barShow')" @click="api(`/menu/${m.id}`, 'PATCH', { isActive: !m.isActive })"><NavIcon :name="m.isActive ? 'eyeOff' : 'eye'" /></button>
            <button class="chip ic" :aria-label="t('delete')" @click="removeItem(m)"><NavIcon name="trash" /></button>
          </template>
          </div>
        </template>
      </div>
      <button v-if="canEdit" class="btn" @click="openItem()">+ {{ t('barAddItem') }}</button>
      <div v-if="mopen" class="sheet-backdrop" @click.self="mopen = false">
        <div class="sheet">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ mform.id ? t('edit') : t('barAddItem') }}</h3>
          <div><label class="lab">{{ t('name') }}</label><input v-model="mform.name" class="in" autofocus></div>
          <div style="display:flex;gap:8px">
            <div style="flex:1"><label class="lab">{{ t('barCategory') }}</label>
              <input v-model="mform.category" class="in" list="cats" placeholder="Ποτά"><datalist id="cats"><option v-for="c in cats" :key="c" :value="c" /></datalist></div>
            <div style="width:110px"><label class="lab">{{ t('barPrice') }}</label><input v-model="mform.price" class="in" inputmode="decimal" placeholder="0.00"></div>
          </div>
          <label class="tiny" style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input v-model="mform.couponOk" type="checkbox"> 🎟 {{ t('barCouponOkLong') }}</label>
          <div v-if="mform.couponOk" style="display:flex;align-items:center;gap:10px">
            <span class="tiny muted" style="flex:1">{{ t('barCouponCost') }}</span>
            <button class="chip" @click="mform.couponCost = Math.max(1, mform.couponCost - 1)">−</button>
            <b style="min-width:24px;text-align:center">{{ mform.couponCost }}</b>
            <button class="chip" @click="mform.couponCost = Math.min(20, mform.couponCost + 1)">+</button>
          </div>
          <button class="btn" :disabled="!mform.name.trim()" @click="saveItem">{{ t('save') }}</button>
          <button class="btn ghost" @click="mopen = false">{{ t('close') }}</button>
        </div>
      </div>
      <div v-if="canEdit" class="card" style="display:flex;flex-direction:column;gap:8px">
        <b style="font-size:13px">📋 {{ t('barTemplates') }}</b>
        <div class="tiny muted">{{ t('barTemplatesNote') }}</div>
        <button class="btn ghost" :disabled="!data.menu.length" @click="saveTemplate">💾 {{ t('barSaveTemplate') }}</button>
        <div v-for="tpl in templates" :key="tpl.id" style="display:flex;align-items:center;gap:8px;font-size:13px">
          <span style="flex:1"><b>{{ tpl.name }}</b> <span class="muted">· {{ tpl.items.length }}</span></span>
          <button class="chip" @click="loadTemplate(tpl.id)">{{ t('barLoadTemplate') }}</button>
          <button class="chip ic" :aria-label="t('delete')" @click="deleteTemplate(tpl)"><NavIcon name="trash" /></button>
        </div>
      </div>
    </template>

    <!-- crew -->
    <template v-if="tab === 'staff'">
      <div class="note">{{ t('barCrewNote') }}</div>
      <div v-for="role in ['bartender', 'waiter', 'cashier', 'supervisor', 'organiser']" :key="role" class="adm">
        <div class="hdr">{{ roleName(role) }} · {{ crew.filter((x: any) => x.role === role).length }}</div>
        <div v-for="x in crew.filter((y: any) => y.role === role)" :key="x.id" class="it" style="flex-wrap:wrap">
          <div style="flex:1;min-width:140px"><b>{{ x.name }}</b>
            <span v-if="x.role === 'waiter'">→ {{ bartenderName(x.bartenderId) }}</span>
            <span v-else-if="x.role === 'cashier'" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:3px">
              <button v-for="[k, l] in KINDS" :key="k" class="chip" :class="{ on: (x.accepts || '').split(',').includes(k) }" :disabled="!canEdit" @click="setAccepts(x, k)">{{ l }}</button>
            </span>
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
          <button v-for="r in ['bartender', 'waiter', 'cashier', 'supervisor', 'organiser']" :key="r" class="chip" :class="{ on: sform.role === r }" @click="sform.role = r">{{ roleName(r) }}</button>
        </div>
        <div v-if="sform.role === 'cashier'">
          <label class="lab">{{ t('barAccepts') }}</label>
          <div class="chips">
            <button v-for="[k, l] in KINDS" :key="k" class="chip" :class="{ on: sform.accepts.includes(k) }" @click="toggleKind(k)">{{ l }}</button>
          </div>
        </div>
        <div v-if="sform.role === 'waiter'">
          <label class="lab">{{ t('barAssignTo') }}</label>
          <div class="chips">
            <button v-for="b in bartenders" :key="b.id" class="chip" :class="{ on: sform.bartenderId === b.id }" @click="sform.bartenderId = b.id">{{ b.name }}</button>
            <span v-if="!bartenders.length" class="tiny muted">{{ t('barAddBartenderFirst') }}</span>
          </div>
        </div>
        <button class="btn" :disabled="!sform.name.trim() || (sform.role === 'waiter' && !sform.bartenderId) || (sform.role === 'cashier' && !sform.accepts.length)" @click="addStaff">{{ t('add') }}</button>
      </div>
    </template>

    <!-- the event itself: what it is called, when, how many tables; the till's
         accounts; closing it; wiping its orders -->
    <template v-if="tab === 'settings'">
      <div class="card" style="display:flex;flex-direction:column;gap:10px">
        <div><label class="lab">{{ t('name') }}</label><input v-model="eform.name" class="in" :disabled="!canEdit"></div>
        <div style="display:flex;gap:8px">
          <div style="flex:1"><label class="lab">{{ t('date') }}</label><input v-model="eform.eventDate" type="date" class="in" :disabled="!canEdit"></div>
          <div style="width:110px"><label class="lab">🪑 {{ t('barTables') }}</label><input v-model.number="eform.tableCount" type="number" min="1" max="200" class="in" :disabled="!canEdit"></div>
        </div>
        <div><label class="lab">🎫 {{ t('barTicket') }}</label><input v-model="eform.entrance" class="in" inputmode="decimal" placeholder="0.00" :disabled="!canEdit"></div>
        <button v-if="canEdit" class="btn" :disabled="!eform.name.trim()" @click="saveEvent">{{ t('save') }}</button>
      </div>
      <div class="adm">
        <div class="hdr">🏦 {{ t('barAccounts') }} · {{ data.accounts?.length || 0 }}</div>
        <div v-for="a in data.accounts" :key="a.id" class="it">
          <div style="flex:1"><b>{{ a.name }}</b></div>
          <button v-if="canEdit" class="chip ic" :aria-label="t('delete')" @click="removeAccount(a)"><NavIcon name="trash" /></button>
        </div>
        <div v-if="canEdit" class="it" style="gap:8px">
          <input v-model="aform" class="in" style="flex:1" :placeholder="t('barAccountPh')" @keyup.enter="addAccount">
          <button class="chip" @click="addAccount">{{ t('add') }}</button>
        </div>
      </div>
      <button v-if="canEdit" class="btn" :class="data.status === 'open' ? 'danger' : ''" @click="toggleStatus">
        {{ data.status === 'open' ? '🔒 ' + t('barClose') : '🔓 ' + t('barReopen') }}
      </button>
      <button v-if="canEdit" class="btn danger" @click="wipeOpen = true">🧹 {{ t('barWipe') }}</button>
      <div v-if="wipeOpen" class="sheet-backdrop" @click.self="wipeOpen = false">
        <div class="sheet">
          <h3 style="margin:0;font-size:17px;text-align:center">🧹 {{ t('barWipe') }}</h3>
          <div class="note">{{ t('barWipeNote') }}</div>
          <div><label class="lab">{{ t('barWipeWord') }}</label><input v-model="wipeWord" class="in" placeholder="ΚΑΘΑΡΙΣΜΟΣ" autocapitalize="characters"></div>
          <button class="btn danger" :disabled="wipeWord.trim().toUpperCase() !== 'ΚΑΘΑΡΙΣΜΟΣ'" @click="wipe">{{ t('barWipe') }}</button>
          <button class="btn ghost" @click="wipeOpen = false">{{ t('close') }}</button>
        </div>
      </div>
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
      <div class="stats" style="grid-template-columns:1fr 1fr">
        <div class="stat" style="background:var(--green-soft)"><b>{{ eur(report.grandCents) }}</b><span>{{ t('barGrand') }}</span></div>
        <div class="stat"><b>{{ eur(report.door.cents) }}</b><span>{{ t('barDoorIncome') }}</span></div>
      </div>
      <div class="sec-title">🎫 {{ t('barDoor') }}</div>
      <div class="stats">
        <div class="stat"><b>{{ report.door.arrived }}<span style="font-size:12px;color:var(--muted)">/{{ report.door.booked }}</span></b><span>{{ t('barAdults') }}</span></div>
        <div class="stat"><b>{{ report.door.kidsArrived }}<span style="font-size:12px;color:var(--muted)">/{{ report.door.kidsBooked }}</span></b><span>{{ t('barKids') }}</span></div>
        <div class="stat"><b>+{{ report.door.extra }}<span v-if="report.door.kidsExtra" style="font-size:12px;color:var(--muted)"> · +{{ report.door.kidsExtra }} 👶</span></b><span>{{ t('barExtra') }}</span></div>
        <div class="stat"><b>{{ eur(report.door.ticketCents) }}</b><span>{{ t('barTicket') }}</span></div>
        <div class="stat"><b>{{ eur(report.door.cashCents) }}</b><span>{{ t('barCash') }}</span></div>
        <div class="stat"><b>{{ eur(report.door.cardCents) }}</b><span>{{ t('barCard') }}</span></div>
      </div>
      <div v-if="report.door.accounts?.length" class="adm">
        <div class="hdr">🎫 🏦 {{ t('barAccounts') }}</div>
        <div v-for="r in report.door.accounts" :key="r.label" class="it">
          <div style="flex:1"><b>{{ r.label }}</b><span>{{ r.people }} {{ t('barPeople').toLowerCase() }}</span></div><b>{{ eur(r.cents) }}</b>
        </div>
      </div>
      <div v-if="report.door.tables?.length" class="adm">
        <div class="hdr">🎫 {{ t('barByTable') }}</div>
        <div v-for="r in report.door.tables" :key="r.no" class="it">
          <div style="flex:1"><b>{{ t('barTable') }} {{ r.no }}</b><span><template v-if="r.kidsBooked || r.kidsArrived">👶 {{ r.kidsArrived }}/{{ r.kidsBooked }}</template><template v-if="r.extra"> · <span style="color:var(--gold)">+{{ r.extra }} {{ t('barExtra').toLowerCase() }}</span></template></span></div><b>{{ r.arrived }}<span style="font-weight:400;color:var(--muted)">/{{ r.booked }}</span></b>
        </div>
      </div>
      <div class="sec-title">🍻 {{ t('barBar') }}</div>
      <div class="stats">
        <div class="stat"><b>{{ eur(report.paidCents) }}</b><span>{{ t('barTakings') }}</span></div>
        <div class="stat"><b>{{ report.orders }}</b><span>{{ t('barOrders') }}</span></div>
        <div class="stat"><b>{{ eur(report.avgOrderCents) }}</b><span>{{ t('barAvgOrder') }}</span></div>
        <div class="stat"><b>{{ eur(report.cashCents) }}</b><span>{{ t('barCash') }}</span></div>
        <div class="stat"><b>{{ eur(report.cardCents) }}</b><span>{{ t('barCard') }}</span></div>
        <div class="stat" :style="report.unpaidCents ? 'color:var(--danger)' : ''"><b>{{ eur(report.unpaidCents) }}</b><span>{{ t('barUnpaid') }} · {{ report.unpaidOrders }}</span></div>
        <div v-if="report.cardPendingCents" class="stat"><b>{{ eur(report.cardPendingCents) }}</b><span>{{ t('barCardPending') }}</span></div>
        <div v-if="report.cashPendingCents" class="stat"><b>{{ eur(report.cashPendingCents) }}</b><span>{{ t('barCashPending') }}</span></div>
        <div class="stat"><b>{{ report.avgPrepMin ?? '—' }}′</b><span>{{ t('barAvgPrep') }}</span></div>
        <div class="stat"><b>🎟 {{ report.coupons }}</b><span>{{ t('barCoupons') }} · {{ eur(report.couponCents) }}</span></div>
        <div v-if="report.cancelled" class="stat"><b>{{ report.cancelled }}</b><span>{{ t('barCancelled') }}</span></div>
      </div>
      <div v-if="report.accounts?.length" class="adm">
        <div class="hdr">🏦 {{ t('barAccounts') }}</div>
        <div v-for="r in report.accounts" :key="r.label" class="it">
          <div style="flex:1"><b>{{ r.label }}</b><span>{{ r.orders }} {{ t('barOrders') }}</span></div><b>{{ eur(r.cents) }}</b>
        </div>
      </div>
      <div class="adm">
        <div class="hdr">{{ t('barSold') }}</div>
        <div v-for="i in report.items" :key="i.name" class="it">
          <div style="flex:1"><b>{{ i.name }}</b><span>{{ eur(i.cents) }}<template v-if="i.coupons"> · 🎟 {{ i.coupons }}</template></span></div><b style="font-size:16px">{{ i.qty }}</b>
        </div>
      </div>
      <div class="adm">
        <div class="hdr">{{ t('barByTable') }}</div>
        <template v-for="r in report.tables" :key="r.label">
          <button class="it" style="width:100%;text-align:left" @click="openTable = openTable === r.label ? null : r.label">
            <span class="chev" :style="openTable === r.label ? 'transform:rotate(90deg)' : ''">›</span>
            <div style="flex:1"><b>{{ r.label }}</b><span>{{ r.orders }} {{ t('barOrders') }}<template v-if="r.paidCents !== r.cents"> · {{ t('barUnpaid') }} {{ eur(r.cents - r.paidCents) }}</template></span></div><b>{{ eur(r.cents) }}</b>
          </button>
          <div v-if="openTable === r.label" v-for="i in r.items" :key="i.name" class="it" style="padding-left:40px;background:var(--bg2)">
            <div style="flex:1"><b style="font-weight:500">{{ i.qty }}× {{ i.name }}</b></div><span>{{ eur(i.cents) }}</span>
          </div>
        </template>
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
.seg button{white-space:nowrap;flex:none;padding-left:12px;padding-right:12px}
.grip{flex:none;width:28px;text-align:center;font-size:20px;color:var(--muted);cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
.it.lift{background:var(--bg2);box-shadow:0 6px 18px rgba(0,0,0,.12);position:relative;z-index:1}
.chip.ic{padding:6px 9px;display:inline-flex}
.chip.ic svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.stat{background:var(--card);border-radius:14px;padding:12px 8px;text-align:center;box-shadow:var(--shadow)}
.stat b{display:block;font-size:17px;letter-spacing:-.02em}
.stat span{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
</style>
