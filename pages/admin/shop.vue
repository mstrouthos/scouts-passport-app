<script setup lang="ts">
/* The shop. Whoever it is open to (the Αρχηγός Συστήματος decides: the
   Βαθμοφόροι, the members of any κλάδος) sees what it sells, for how much,
   and its pictures — nothing is bought or ordered here — and can take the
   price list away as Excel or PDF. Whoever runs it (set by the Αρχηγός
   Συστήματος) also keeps its items and their pictures, and its till: what is
   in cash and in the bank, payments in, money out, cash taken to the bank,
   counts of the till, and what was sold over any stretch of days. */
const { t } = useI18n()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/shop')
const manager = computed(() => !!data.value?.manager)
const tab = ref<'items' | 'till'>('items')

const eur = (c: number | null | undefined) => ((c ?? 0) / 100).toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })
const when = (iso: string) => new Date(iso).toLocaleString('el-GR', { timeZone: 'Europe/Nicosia', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const shown = computed(() => (data.value?.items || []).filter((i: any) => i.visible))
const viewing = ref<any>(null)
const cover = (i: any) => i.images?.[0]?.url || null

/* ---- who sees the shop: the Αρχηγός Συστήματος's to set ---- */
const audience = computed(() => data.value?.audience || null)
async function setAudience(patch: { leaders?: boolean, section?: number }) {
  const a = audience.value
  const sections = new Set<number>(a.sections)
  if (patch.section != null) sections.has(patch.section) ? sections.delete(patch.section) : sections.add(patch.section)
  try {
    await $fetch('/api/admin/shop/audience', { method: 'POST', body: { leaders: patch.leaders ?? a.leaders, sections: [...sections] } })
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(errMsg(e)) }
}

/* ---- taking it away: the price list, and the sales over some days ---- */
const busy = ref('')
async function download(path: string, query: Record<string, string>, name: string) {
  busy.value = path + query.format
  try {
    const blob = await $fetch<Blob>(path, { query, responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = name
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  } catch (e: any) { show(errMsg(e)) }
  finally { busy.value = '' }
}
const todayIs = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })
const range = reactive({ from: todayIs().slice(0, 8) + '01', to: todayIs() })
function preset(which: 'month' | 'last' | 'year') {
  const d = todayIs(), y = Number(d.slice(0, 4)), m = Number(d.slice(5, 7))
  const pad = (n: number) => String(n).padStart(2, '0')
  if (which === 'month') { range.from = `${y}-${pad(m)}-01`; range.to = d }
  else if (which === 'year') { range.from = `${y}-01-01`; range.to = d }
  else {
    const ly = m === 1 ? y - 1 : y, lm = m === 1 ? 12 : m - 1
    range.from = `${ly}-${pad(lm)}-01`
    range.to = `${ly}-${pad(lm)}-${pad(new Date(Date.UTC(ly, lm, 0)).getUTCDate())}`
  }
}
const exportCatalogue = (format: 'xlsx' | 'pdf') => download('/api/admin/shop/export/catalogue', { format }, `${t('shopCatalogueFile')}-${todayIs()}.${format}`)
function exportSales(format: 'xlsx' | 'pdf') {
  if (!range.from || !range.to || range.from > range.to) return show(t('shopRangeBad'))
  download('/api/admin/shop/export/sales', { format, from: range.from, to: range.to }, `${t('shopSalesFile')}-${range.from}_${range.to}.${format}`)
}
/* counting the stock: off unless the manager turns it on */
const tracking = computed(() => !!data.value?.trackStock)
async function setTracking(on: boolean) {
  try { await $fetch('/api/admin/shop/settings', { method: 'POST', body: { trackStock: on } }); await refresh(); show('✅ ' + t('saved')) } catch (e: any) { show(errMsg(e)) }
}

/* ---- an item, new or changed ---- */
const item = ref<any>(null)
function openItem(i?: any) {
  item.value = i
    ? { id: i.id, name: i.name, description: i.description || '', price: (i.priceCents / 100).toFixed(2).replace('.', ','), stock: i.stock ?? '', visible: i.visible, images: i.images || [] }
    : { id: null, name: '', description: '', price: '', stock: '', visible: true, images: [] }
}
/* its pictures: picked (several at once), shrunk on the phone, added in turn;
   the first is its cover, and any can be moved to the front or taken off */
const MAX_IMAGES = 8
const uploading = ref(0)
async function shrink(file: File): Promise<{ mime: string, dataBase64: string }> {
  const img = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  const blob: Blob = await new Promise(r => c.toBlob(b => r(b!), 'image/jpeg', 0.85))
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return { mime: 'image/jpeg', dataBase64: btoa(bin) }
}
const syncImages = () => {
  const fresh = (data.value?.items || []).find((x: any) => x.id === item.value?.id)
  if (fresh && item.value) item.value.images = fresh.images || []
}
async function addImages(e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files || [])].slice(0, Math.max(0, MAX_IMAGES - (item.value?.images?.length || 0)))
  input.value = ''
  if (!files.length || !item.value?.id) return
  uploading.value = files.length
  try {
    for (const f of files) {
      await $fetch(`/api/admin/shop/items/${item.value.id}/images`, { method: 'POST', body: { name: f.name, ...(await shrink(f)) } })
      uploading.value--
    }
    show('🖼️ ' + t('imageAdded'))
  } catch (err: any) { show(errMsg(err)) }
  finally { uploading.value = 0; await refresh(); syncImages() }
}
async function removeImage(fileId: number) {
  if (!confirm(t('shopImageDeleteQ'))) return
  try { await $fetch(`/api/admin/shop/items/${item.value.id}/images/${fileId}`, { method: 'DELETE' }); await refresh(); syncImages() } catch (e: any) { show(errMsg(e)) }
}
async function makeCover(fileId: number) {
  const order = [fileId, ...item.value.images.map((p: any) => p.id).filter((x: number) => x !== fileId)]
  try { await $fetch(`/api/admin/shop/items/${item.value.id}`, { method: 'PATCH', body: { images: order } }); await refresh(); syncImages() } catch (e: any) { show(errMsg(e)) }
}
async function saveItem() {
  const it = item.value
  try {
    // the stock only while it is counted; otherwise what was kept stays as it is
    const body: any = { name: it.name, description: it.description, price: it.price, visible: it.visible }
    if (tracking.value) body.stock = it.stock === '' ? null : it.stock
    if (it.id) { await $fetch(`/api/admin/shop/items/${it.id}`, { method: 'PATCH', body }); item.value = null }
    // a new item stays open, for its pictures
    else { const r = await $fetch<any>('/api/admin/shop/items', { method: 'POST', body }); it.id = r.id }
    await refresh(); show(it.id && item.value ? '✅ ' + t('shopItemSavedPics') : '✅ ' + t('saved'))
  } catch (e: any) { show(errMsg(e)) }
}
async function deleteItem() {
  if (!confirm(t('shopItemDeleteQ', { name: item.value.name }))) return
  try { await $fetch(`/api/admin/shop/items/${item.value.id}`, { method: 'DELETE' }); item.value = null; await refresh(); show('🗑️ ' + t('deleted')) } catch (e: any) { show(errMsg(e)) }
}

/* ---- a line in the till's book ---- */
type Kind = 'payment' | 'expense' | 'deposit' | 'count'
const entry = ref<any>(null)
function openEntry(kind: Kind) {
  entry.value = { kind, method: 'cash', amount: '', payer: '', note: '', qty: {} as Record<number, number> }
}
const picked = computed(() => entry.value ? (data.value?.items || []).filter((i: any) => (entry.value.qty[i.id] || 0) > 0) : [])
const itemsTotal = computed(() => picked.value.reduce((n: number, i: any) => n + i.priceCents * entry.value.qty[i.id], 0))
function stepQty(i: any, d: number) {
  const q = Math.max(0, (entry.value.qty[i.id] || 0) + d)
  if (i.stock != null && q > i.stock) return
  entry.value.qty = { ...entry.value.qty, [i.id]: q }
}
const bookFor = (m: string) => m === 'bank' ? data.value?.till?.bank : data.value?.till?.cash
async function saveEntry() {
  const e = entry.value
  try {
    const r = await $fetch<any>('/api/admin/shop/entries', {
      method: 'POST',
      body: {
        kind: e.kind, method: e.method, amount: e.amount, payer: e.payer, note: e.note,
        items: Object.entries(e.qty).filter(([, q]) => (q as number) > 0).map(([id, qty]) => ({ id: Number(id), qty }))
      }
    })
    entry.value = null; await refresh()
    show(r.nothing ? '✅ ' + t('shopCountSame') : '✅ ' + t('saved'))
  } catch (err: any) { show(errMsg(err)) }
}
/* a wrong line: cancelled, with why */
const voiding = ref<any>(null)
const voidReason = ref('')
async function voidEntry() {
  try {
    await $fetch(`/api/admin/shop/entries/${voiding.value.id}/void`, { method: 'POST', body: { reason: voidReason.value } })
    voiding.value = null; voidReason.value = ''; await refresh(); show('✅ ' + t('shopVoided'))
  } catch (e: any) { show(errMsg(e)) }
}
const ICON: Record<string, string> = { payment: '💶', expense: '📤', deposit: '🏦', count: '🧮' }
/** what a line did to the till, as one signed sum */
function lineSum(e: any) {
  if (e.kind === 'expense') return -e.amountCents
  return e.amountCents
}
function lineTitle(e: any) {
  if (e.kind === 'payment') return e.payer || t('shopPayment')
  if (e.kind === 'expense') return e.note || t('shopExpense')
  if (e.kind === 'deposit') return t('shopDeposit')
  return t('shopCountLine')
}
const methodLabel = (m: string | null) => m === 'bank' ? t('shopBank') : m === 'cash' ? t('shopCash') : t('shopCashToBank')
</script>

<template>
  <AppShell :title="t('shop')" :sub="manager ? t('shopSubManager') : t('shopSub')" back="/admin/more">
    <div v-if="manager" class="seg">
      <button :class="{ on: tab === 'items' }" @click="tab = 'items'">🛍️ {{ t('shopItems') }}</button>
      <button :class="{ on: tab === 'till' }" @click="tab = 'till'">💰 {{ t('shopTill') }}</button>
    </div>

    <!-- what the shop sells: everyone sees it; only the manager changes it -->
    <template v-if="!manager || tab === 'items'">
      <div v-if="!manager" class="tiny muted" style="text-align:center">{{ t('shopNote') }}</div>
      <!-- who sees it: set by the Αρχηγός Συστήματος -->
      <div v-if="audience" class="card aud">
        <b>👥 {{ t('shopAudience') }}</b>
        <span class="tiny muted">{{ t('shopAudienceSub') }}</span>
        <button class="srow" @click="setAudience({ leaders: !audience.leaders })">
          <div class="ico">⚜️</div><div class="txt"><b>{{ t('shopAudLeaders') }}</b></div>
          <span class="sw" :class="{ off: !audience.leaders }" />
        </button>
        <button v-for="sec in audience.options" :key="sec.id" class="srow" @click="setAudience({ section: sec.id })">
          <div class="ico">🏕️</div><div class="txt"><b>{{ t('shopAudMembers', { name: sec.nameEl }) }}</b></div>
          <span class="sw" :class="{ off: !audience.sections.includes(sec.id) }" />
        </button>
      </div>
      <button v-if="manager" class="btn" @click="openItem()">＋ {{ t('shopItemAdd') }}</button>
      <button v-if="manager" class="srow" @click="setTracking(!tracking)">
        <div class="ico">📦</div>
        <div class="txt"><b>{{ t('shopTrack') }}</b><span>{{ tracking ? t('shopTrackOn') : t('shopTrackOff') }}</span></div>
        <span class="sw" :class="{ off: !tracking }" />
      </button>
      <div v-if="(manager ? data?.items : shown)?.length" class="items">
        <button v-for="i in (manager ? data.items : shown)" :key="i.id" class="item" :class="{ off: !i.visible, gone: i.stock === 0 }"
                   @click="manager ? openItem(i) : (viewing = i)">
          <img v-if="cover(i)" :src="cover(i)" alt="" class="thumb" loading="lazy">
          <div v-else-if="data.items.some((x: any) => x.images?.length)" class="thumb none">🛍️</div>
          <div class="it">
            <b>{{ i.name }}</b>
            <span v-if="i.description">{{ i.description }}</span>
            <small v-if="i.stock === 0" class="tag out">{{ t('shopSoldOut') }}</small>
            <small v-else-if="manager && i.stock != null" class="tag">{{ t('shopLeft', { n: i.stock }) }}</small>
            <small v-if="!i.visible" class="tag">🙈 {{ t('shopHidden') }}</small>
          </div>
          <div class="price">{{ eur(i.priceCents) }}</div>
          <span class="chev">›</span>
        </button>
      </div>
      <div v-else class="card tiny muted" style="text-align:center">{{ t('shopEmpty') }}</div>
      <div v-if="shown.length" class="exp">
        <span>⬇️ {{ t('shopCatalogueExport') }}</span>
        <button class="chip" :disabled="!!busy" @click="exportCatalogue('xlsx')">📊 Excel</button>
        <button class="chip" :disabled="!!busy" @click="exportCatalogue('pdf')">📄 PDF</button>
      </div>
    </template>

    <!-- the till: only the manager -->
    <template v-if="manager && tab === 'till'">
      <div class="balances">
        <div class="bal"><span>💶 {{ t('shopCash') }}</span><b>{{ eur(data?.till?.cash) }}</b></div>
        <div class="bal"><span>🏦 {{ t('shopBank') }}</span><b>{{ eur(data?.till?.bank) }}</b></div>
      </div>
      <div class="total tiny muted">{{ t('shopTotal') }}: <b>{{ eur((data?.till?.cash || 0) + (data?.till?.bank || 0)) }}</b></div>
      <div class="acts">
        <button class="btn" @click="openEntry('payment')">💶 {{ t('shopPaymentAdd') }}</button>
        <button class="btn ghost" @click="openEntry('expense')">📤 {{ t('shopExpenseAdd') }}</button>
        <button class="btn ghost" @click="openEntry('deposit')">🏦 {{ t('shopDepositAdd') }}</button>
        <button class="btn ghost" @click="openEntry('count')">🧮 {{ t('shopCountAdd') }}</button>
      </div>
      <div class="card sales">
        <b>⬇️ {{ t('shopSalesExport') }}</b>
        <span class="tiny muted">{{ t('shopSalesExportSub') }}</span>
        <div class="chips">
          <button class="chip" @click="preset('month')">{{ t('shopThisMonth') }}</button>
          <button class="chip" @click="preset('last')">{{ t('shopLastMonth') }}</button>
          <button class="chip" @click="preset('year')">{{ t('shopThisYear') }}</button>
        </div>
        <div class="two">
          <div><label class="lab">{{ t('shopFrom') }}</label><input v-model="range.from" type="date" class="in"></div>
          <div><label class="lab">{{ t('shopTo') }}</label><input v-model="range.to" type="date" class="in"></div>
        </div>
        <div class="two">
          <button class="btn ghost" :disabled="!!busy" @click="exportSales('xlsx')">📊 Excel</button>
          <button class="btn ghost" :disabled="!!busy" @click="exportSales('pdf')">📄 PDF</button>
        </div>
      </div>
      <div class="sec-title">{{ t('shopBook') }}</div>
      <div v-if="data?.entries?.length" class="book">
        <div v-for="e in data.entries" :key="e.id" class="line" :class="{ void: e.voidedAt }">
          <span class="ic">{{ ICON[e.kind] }}</span>
          <div class="lt">
            <b>{{ lineTitle(e) }}</b>
            <span v-if="e.items?.length">{{ e.items.map((x: any) => `${x.qty}× ${x.name}`).join(', ') }}</span>
            <span v-if="e.note && e.kind !== 'expense'">{{ e.note }}</span>
            <small>{{ methodLabel(e.method) }} · {{ when(e.at) }} · {{ e.by }}</small>
            <small v-if="e.voidedAt" class="vr">✖ {{ t('shopVoidedBy', { name: e.voidedBy }) }}: {{ e.voidReason }}</small>
          </div>
          <div class="amt" :class="{ neg: lineSum(e) < 0 }">{{ e.kind === 'deposit' ? '⇄ ' : lineSum(e) > 0 ? '+' : '' }}{{ eur(lineSum(e)) }}</div>
          <button v-if="!e.voidedAt" class="chip vbtn" :aria-label="t('shopVoid')" @click="voiding = e; voidReason = ''">✖</button>
        </div>
      </div>
      <div v-else class="card tiny muted" style="text-align:center">{{ t('shopBookEmpty') }}</div>
    </template>

    <Teleport to="body">
      <!-- an item -->
      <div v-if="item" class="sheet-backdrop" @click.self="item = null">
        <div class="sheet form">
          <h3>{{ item.id ? t('shopItemEdit') : t('shopItemAdd') }}</h3>
          <div><label class="lab">{{ t('shopItemName') }}</label><input v-model="item.name" class="in" maxlength="120"></div>
          <div><label class="lab">{{ t('shopItemDesc') }} <span class="tiny muted">({{ t('optional') }})</span></label><input v-model="item.description" class="in" maxlength="500"></div>
          <div :class="{ two: tracking }">
            <div><label class="lab">{{ t('shopItemPrice') }} (€)</label><input v-model="item.price" class="in" inputmode="decimal" placeholder="0,00"></div>
            <div v-if="tracking"><label class="lab">{{ t('shopItemStock') }} <span class="tiny muted">({{ t('optional') }})</span></label><input v-model="item.stock" class="in" inputmode="numeric" :placeholder="t('shopItemStockPh')"></div>
          </div>
          <!-- its pictures, the first its cover -->
          <div class="pics">
            <label class="lab">{{ t('shopItemPics') }} <span class="tiny muted">({{ item.images.length }}/{{ MAX_IMAGES }})</span></label>
            <div v-if="item.id" class="pgrid">
              <div v-for="(p, k) in item.images" :key="p.id" class="pic" :class="{ first: k === 0 }">
                <img :src="p.url" alt="">
                <span v-if="k === 0" class="cv">{{ t('shopCover') }}</span>
                <button v-else class="mk" :aria-label="t('shopMakeCover')" @click="makeCover(p.id)">★</button>
                <button class="rm" :aria-label="t('delete')" @click="removeImage(p.id)">✕</button>
              </div>
              <label v-if="item.images.length < MAX_IMAGES" class="pic add" :class="{ busy: uploading }">
                <span>{{ uploading ? '⏳' : '📷' }}</span><small>{{ uploading ? t('loading') : t('addImage') }}</small>
                <input type="file" accept="image/*" multiple hidden :disabled="!!uploading" @change="addImages">
              </label>
            </div>
            <div v-else class="tiny muted">{{ t('shopPicsAfterSave') }}</div>
          </div>
          <button class="srow" @click="item.visible = !item.visible">
            <div class="ico">👀</div><div class="txt"><b>{{ t('shopItemVisible') }}</b><span>{{ t('shopItemVisibleSub') }}</span></div>
            <span class="sw" :class="{ off: !item.visible }" />
          </button>
          <button class="btn" :disabled="!item.name.trim() || !String(item.price).trim()" @click="saveItem">{{ t('save') }}</button>
          <button v-if="item.id" class="btn ghost" @click="viewing = { ...data.items.find((x: any) => x.id === item.id) }">👀 {{ t('shopPreview') }}</button>
          <button v-if="item.id" class="btn danger" @click="deleteItem">🗑 {{ t('delete') }}</button>
          <button class="btn ghost" @click="item = null">{{ t('close') }}</button>
        </div>
      </div>

      <!-- a line in the book -->
      <div v-if="entry" class="sheet-backdrop" @click.self="entry = null">
        <div class="sheet form">
          <h3>{{ ICON[entry.kind] }} {{ entry.kind === 'payment' ? t('shopPaymentAdd') : entry.kind === 'expense' ? t('shopExpenseAdd') : entry.kind === 'deposit' ? t('shopDepositAdd') : t('shopCountAdd') }}</h3>
          <div v-if="entry.kind !== 'deposit'" class="seg">
            <button :class="{ on: entry.method === 'cash' }" @click="entry.method = 'cash'">💶 {{ t('shopCash') }}</button>
            <button :class="{ on: entry.method === 'bank' }" @click="entry.method = 'bank'">🏦 {{ t('shopBank') }}</button>
          </div>
          <!-- a payment: for items of the shop, or for anything by a note -->
          <template v-if="entry.kind === 'payment'">
            <div v-if="data?.items?.length" class="pick">
              <div class="tiny muted">{{ t('shopPaymentItems') }}</div>
              <div v-for="i in data.items" :key="i.id" class="pr">
                <span class="pn">{{ i.name }} <small>{{ eur(i.priceCents) }}</small></span>
                <button class="qb" :disabled="!(entry.qty[i.id] > 0)" @click="stepQty(i, -1)">−</button>
                <b class="qn">{{ entry.qty[i.id] || 0 }}</b>
                <button class="qb" :disabled="i.stock != null && (entry.qty[i.id] || 0) >= i.stock" @click="stepQty(i, 1)">＋</button>
              </div>
              <div v-if="itemsTotal" class="tiny" style="text-align:right">{{ t('shopItemsTotal') }}: <b>{{ eur(itemsTotal) }}</b></div>
            </div>
            <div><label class="lab">{{ t('shopPayer') }}</label><input v-model="entry.payer" class="in" maxlength="120" :placeholder="t('shopPayerPh')"></div>
          </template>
          <div v-if="entry.kind === 'count'" class="tiny muted">{{ t('shopCountNow', { m: entry.method === 'bank' ? t('shopBank') : t('shopCash'), s: eur(bookFor(entry.method)) }) }}</div>
          <div>
            <label class="lab">{{ entry.kind === 'count' ? t('shopCounted') : t('shopAmount') }} (€)</label>
            <input v-model="entry.amount" class="in" inputmode="decimal" :placeholder="entry.kind === 'payment' && itemsTotal ? (itemsTotal / 100).toFixed(2).replace('.', ',') : '0,00'">
            <div v-if="entry.kind === 'payment' && itemsTotal" class="tiny muted">{{ t('shopAmountFromItems') }}</div>
          </div>
          <div><label class="lab">{{ t('shopNoteLabel') }} <span v-if="entry.kind !== 'expense'" class="tiny muted">({{ t('optional') }})</span></label><input v-model="entry.note" class="in" maxlength="300"></div>
          <button class="btn" @click="saveEntry">{{ t('save') }}</button>
          <button class="btn ghost" @click="entry = null">{{ t('close') }}</button>
        </div>
      </div>

      <!-- cancelling a line -->
      <div v-if="voiding" class="sheet-backdrop" @click.self="voiding = null">
        <div class="sheet form">
          <h3>✖ {{ t('shopVoid') }}</h3>
          <div class="tiny muted">{{ t('shopVoidNote') }}</div>
          <div><label class="lab">{{ t('shopVoidReason') }}</label><input v-model="voidReason" class="in" maxlength="300"></div>
          <button class="btn danger" :disabled="!voidReason.trim()" @click="voidEntry">{{ t('shopVoid') }}</button>
          <button class="btn ghost" @click="voiding = null">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
    <ShopItemSheet v-if="viewing" :item="viewing" @close="viewing = null" />
  </AppShell>
</template>

<style scoped>
.items{display:flex; flex-direction:column; gap:8px}
.item{display:flex; align-items:center; gap:12px; background:#fff; border:0; border-radius:16px; padding:12px 14px; text-align:left; width:100%;
  box-shadow:0 1px 6px rgba(20,40,70,.06); color:var(--ink)}
.item.off{opacity:.55}
.thumb{flex:none; width:54px; height:54px; border-radius:12px; object-fit:cover; background:#F3F5F8}
.thumb.none{display:grid; place-items:center; font-size:22px; opacity:.5}
.aud, .sales{display:flex; flex-direction:column; gap:8px}
.chips{display:flex; flex-wrap:wrap; gap:6px}
.exp{display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:8px; font-size:13px; color:var(--muted); font-weight:700}
.pics{display:flex; flex-direction:column; gap:6px}
.pgrid{display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:8px}
.pic{position:relative; aspect-ratio:1/1; border-radius:12px; overflow:hidden; background:#F3F5F8}
.pic img{width:100%; height:100%; object-fit:cover; display:block}
.pic.first{outline:3px solid var(--green, #2E7D5B); outline-offset:-3px}
.pic .cv{position:absolute; left:0; right:0; bottom:0; background:rgba(46,125,91,.9); color:#fff; font-size:10px; font-weight:800; text-align:center; padding:2px 0}
.pic .rm, .pic .mk{position:absolute; top:4px; width:24px; height:24px; border-radius:50%; border:0; background:rgba(255,255,255,.92); font-size:12px; font-weight:800; display:grid; place-items:center; box-shadow:0 1px 4px rgba(0,0,0,.2)}
.pic .rm{right:4px; color:#B3261E}
.pic .mk{left:4px; color:#C68A00}
.pic.add{display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; cursor:pointer; border:2px dashed #CBD5E1; background:#fff}
.pic.add span{font-size:22px}
.pic.add small{font-size:10.5px; color:var(--muted); font-weight:700; text-align:center}
.pic.add.busy{opacity:.6}
.item.gone .price{color:var(--muted); text-decoration:line-through}
.it{flex:1; min-width:0; display:flex; flex-direction:column; gap:2px}
.it b{font-size:15px}
.it span{font-size:12.5px; color:var(--muted)}
.tag{align-self:flex-start; font-size:11px; font-weight:700; background:var(--accent-soft); color:var(--accent-deep); border-radius:999px; padding:2px 8px}
.tag.out{background:#FDECEC; color:#B3261E}
.price{flex:none; font-size:16px; font-weight:800; color:var(--green, #2E7D5B); font-variant-numeric:tabular-nums}
.chev{color:var(--muted); font-size:18px}
.balances{display:grid; grid-template-columns:1fr 1fr; gap:10px}
.bal{background:#fff; border-radius:18px; padding:14px; display:flex; flex-direction:column; gap:4px; box-shadow:0 1px 6px rgba(20,40,70,.06)}
.bal span{font-size:12.5px; color:var(--muted); font-weight:700}
.bal b{font-size:22px; font-variant-numeric:tabular-nums}
.total{text-align:center}
.acts{display:grid; grid-template-columns:1fr 1fr; gap:8px}
.acts .btn{font-size:13px; padding:12px 8px}
.book{display:flex; flex-direction:column; background:#fff; border-radius:18px; overflow:hidden; box-shadow:0 1px 6px rgba(20,40,70,.06)}
.line{display:flex; align-items:flex-start; gap:10px; padding:10px 12px}
.line + .line{border-top:1px solid #EEF2F6}
.line .ic{font-size:20px; line-height:1.2}
.lt{flex:1; min-width:0; display:flex; flex-direction:column; gap:1px}
.lt b{font-size:14px}
.lt span{font-size:12.5px; color:var(--ink)}
.lt small{font-size:11px; color:var(--muted)}
.lt .vr{color:#B3261E}
.amt{flex:none; font-weight:800; font-size:14px; color:var(--green, #2E7D5B); font-variant-numeric:tabular-nums}
.amt.neg{color:#B3261E}
.line.void .lt b, .line.void .amt{text-decoration:line-through; opacity:.6}
.vbtn{flex:none; padding:4px 8px; font-size:12px}
.form{display:flex; flex-direction:column; gap:10px; max-height:88dvh; overflow:auto}
.form h3{margin:0; font-size:17px; text-align:center}
.two{display:grid; grid-template-columns:1fr 1fr; gap:10px}
.pick{display:flex; flex-direction:column; gap:6px; background:#F6F8FB; border-radius:14px; padding:10px}
.pr{display:flex; align-items:center; gap:8px}
.pn{flex:1; min-width:0; font-size:13.5px; font-weight:600}
.pn small{color:var(--muted); font-weight:600}
.qb{width:32px; height:32px; border-radius:50%; border:0; background:#fff; font-size:16px; font-weight:800; box-shadow:0 1px 4px rgba(20,40,70,.1)}
.qb:disabled{opacity:.35}
.qn{width:22px; text-align:center; font-variant-numeric:tabular-nums}
</style>
