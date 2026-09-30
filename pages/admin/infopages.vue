<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/info')
const editing = ref<any>(null)

const sectionName = (id: number | null) =>
  id == null ? t('wholeTroop') : (data.value?.sections || []).find((x: any) => x.id === id)?.nameEl ?? ''

/* Pages are grouped by who they are for: everyone first, then each sector. */
const groups = computed(() => {
  const pages = data.value?.pages || []
  const buckets: Array<{ id: number | null, label: string, pages: any[] }> = [
    { id: null, label: t('wholeTroop'), pages: pages.filter((p: any) => p.sectionId == null) }
  ]
  for (const sec of data.value?.sections || [])
    buckets.push({ id: sec.id, label: sec.nameEl, pages: pages.filter((p: any) => p.sectionId === sec.id) })
  return buckets
})

function open(page: any | null, sectionId: number | null = null) {
  editing.value = page
    ? { ...page, iconEmoji: page.icon, submitForApproval: !!page.pendingApproval }
    : { slug: '', iconEmoji: 'ℹ️', titleEl: '', titleEn: '', summaryEl: '',
        bodyEl: '', bodyEn: '', isPublished: false, submitForApproval: false, sectionId }
}
/* Every Βαθμοφόρος writes pages; an administrator publishes them. A published
   page is changed by administrators only — to anyone else it opens to read. */
const isAdmin = computed(() => !!data.value?.isAdmin)
const readOnly = computed(() => !!editing.value?.isPublished && !isAdmin.value && !!editing.value?.id)
async function approve() {
  try {
    await $fetch('/api/admin/info', { method: 'POST', body: { ...editing.value, isPublished: true } })
    await $fetch('/api/admin/info/approve', { method: 'POST', body: { id: editing.value.id } })
    editing.value = null
    await refresh(); show('✅ ' + t('infoApproved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
/* opened from the "waiting for approval" notification */
onMounted(() => {
  const id = Number(useRoute().query.open)
  const page = Number.isInteger(id) ? (data.value?.pages || []).find((p: any) => p.id === id) : null
  if (page) open(page)
})
/* Reordering: drag a page by its handle (⋮⋮) up or down within its group.
   Pointer events, not HTML drag-and-drop, so it works under a finger on a
   phone as well as with a mouse. The new order is saved on release. */
const drag = reactive({ key: '', from: -1, to: -1, y0: 0, dy: 0, rowH: 1, count: 0 })
let dragged = false
function dragStart(e: PointerEvent, key: string, i: number, count: number) {
  const row = (e.currentTarget as HTMLElement).closest('.it') as HTMLElement
  try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch {}
  Object.assign(drag, { key, from: i, to: i, y0: e.clientY, dy: 0, rowH: row.offsetHeight || 1, count })
  dragged = false
}
function dragMove(e: PointerEvent) {
  if (!drag.key) return
  drag.dy = e.clientY - drag.y0
  if (Math.abs(drag.dy) > 4) dragged = true
  drag.to = Math.max(0, Math.min(drag.count - 1, drag.from + Math.round(drag.dy / drag.rowH)))
}
async function dragEnd(pages: any[]) {
  if (!drag.key) return
  const { from, to } = drag
  Object.assign(drag, { key: '', from: -1, to: -1, dy: 0 })
  // the click that ends a drag must not open the page; the next one should
  setTimeout(() => { dragged = false }, 60)
  if (from === to) return
  const ids = pages.map(p => p.id)
  ids.splice(to, 0, ids.splice(from, 1)[0])
  try {
    await $fetch('/api/admin/info/order', { method: 'POST', body: { ids } })
    await refresh()
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
/* where each row sits while another is being dragged past it */
function rowStyle(key: string, i: number) {
  if (drag.key !== key) return {}
  if (i === drag.from) return { transform: `translateY(${drag.dy}px)`, zIndex: 2, position: 'relative', boxShadow: 'var(--shadow)', transition: 'none' }
  if (drag.from < drag.to && i > drag.from && i <= drag.to) return { transform: `translateY(${-drag.rowH}px)` }
  if (drag.from > drag.to && i >= drag.to && i < drag.from) return { transform: `translateY(${drag.rowH}px)` }
  return {}
}
function openUnlessDragged(p: any) { if (dragged) { dragged = false; return } open(p) }

/* Pictures in a page: picked, shrunk on the phone to a sensible size, uploaded,
   and placed in the text as a line of their own — ![caption](link) — where
   the cursor was. */
const bodyEl = ref<HTMLTextAreaElement | null>(null)
const uploading = ref(false)
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
async function addImage(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !editing.value) return
  uploading.value = true
  try {
    const res = await $fetch<any>('/api/admin/info/image', { method: 'POST', body: { name: file.name, ...(await shrink(file)) } })
    const caption = file.name.replace(/\.[^.]+$/, '').replace(/[\[\]]/g, '')
    const line = `![${caption}](${res.url})`
    const ta = bodyEl.value, text = editing.value.bodyEl || ''
    const at = ta ? ta.selectionStart : text.length
    const before = text.slice(0, at), after = text.slice(at)
    editing.value.bodyEl = `${before}${before && !before.endsWith('\n') ? '\n' : ''}${line}\n${after.startsWith('\n') ? after.slice(1) : after}`
    show('🖼️ ' + t('imageAdded'))
  } catch (err: any) { show(err?.data?.message || t('error')) }
  finally { uploading.value = false }
}

/* Preview: the page exactly as members and families see it — its title,
   text, pictures, maps and drawings — from what is in the editor now, saved
   or not, whatever section it is for. */
const previewing = ref(false)

/* A place: picked on a map, and placed in the text as a line of its own —
   "📍 name (lat, lng)" — where the cursor was; shown to readers as a map. */
const pickingPlace = ref(false)
function insertLine(line: string) {
  const ta = bodyEl.value, text = editing.value.bodyEl || ''
  const at = ta ? ta.selectionStart : text.length
  const before = text.slice(0, at), after = text.slice(at)
  editing.value.bodyEl = `${before}${before && !before.endsWith('\n') ? '\n' : ''}${line}\n${after.startsWith('\n') ? after.slice(1) : after}`
}
function placePicked(p: { lat: number, lng: number, label: string }) {
  insertLine(pinLine(p.lat, p.lng, p.label))
  pickingPlace.value = false
  show('📍 ' + t('locationAdded'))
}

async function save() {
  try {
    await $fetch('/api/admin/info', { method: 'POST', body: editing.value })
    editing.value = null
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="t('infoAdmin')" :sub="t('infoAdminSub')" back="/admin/more">
    <template v-for="g in groups" :key="String(g.id)">
      <div class="sec-title">{{ g.id == null ? '🏕️ ' + g.label : g.label }}</div>
      <div class="adm">
        <button v-for="(p, i) in g.pages" :key="p.id" class="it" :style="rowStyle(String(g.id), i)" @click="openUnlessDragged(p)">
          <span v-if="g.pages.length > 1 && data?.canReorder" class="grip" :aria-label="t('dragToReorder')"
                @pointerdown.stop="dragStart($event, String(g.id), i, g.pages.length)"
                @pointermove="dragMove" @pointerup="dragEnd(g.pages)" @pointercancel="dragEnd(g.pages)"
                @click.stop>
            <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true" fill="currentColor">
              <circle cx="2" cy="2" r="1.6" /><circle cx="8" cy="2" r="1.6" /><circle cx="2" cy="8" r="1.6" />
              <circle cx="8" cy="8" r="1.6" /><circle cx="2" cy="14" r="1.6" /><circle cx="8" cy="14" r="1.6" />
            </svg>
          </span>
          <div style="font-size:19px;width:26px;text-align:center">{{ p.icon }}</div>
          <div style="flex:1"><b>{{ lx(p) }}</b><span>{{ lx(p, 'summary') }}</span></div>
          <span class="pill" :class="p.isPublished ? 'ok' : p.pendingApproval ? 'live' : 'draft'">
            {{ p.isPublished ? t('publishedP') : p.pendingApproval ? t('infoPending') : t('draft') }}
          </span>
        </button>
        <button class="it" style="color:var(--accent-deep)" @click="open(null, g.id)">
          <div style="font-size:19px;width:26px;text-align:center">+</div>
          <div style="flex:1"><b>{{ t('newPage') }}</b><span>{{ g.label }}</span></div>
        </button>
      </div>
    </template>
    <div class="tiny muted">{{ t('infoSectionNote') }}</div>

    <Teleport to="body">
      <div v-if="editing" class="sheet-backdrop" @click.self="editing = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:11px;max-height:88dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ editing.id ? t('editPage') : t('newPage') }}</h3>
          <div v-if="editing.author" class="tiny muted" style="text-align:center">{{ t('writtenBy') }} {{ editing.author }}</div>
          <div v-if="readOnly" class="note">{{ t('infoPublishedAdminOnly') }}</div>
          <div v-else-if="editing.pendingApproval && isAdmin" class="note">{{ t('infoWaitingNote') }}</div>
          <div style="display:flex;gap:8px">
            <div style="flex:1"><label class="lab">{{ t('icon') }}</label><input v-model="editing.iconEmoji" class="in"></div>
            <!-- the identifier is made from the title; an administrator may set
                 one to write a section's own version of a troop-wide page -->
            <div v-if="isAdmin && !editing.id" style="flex:2"><label class="lab">{{ t('slug') }} <span class="tiny muted">({{ t('optional') }})</span></label><input v-model="editing.slug" class="in" :placeholder="t('slugAuto')"></div>
          </div>
          <div>
            <label class="lab">{{ t('whoFor') }}</label>
            <div class="chips">
              <button class="chip" :class="{ on: editing.sectionId == null }" @click="editing.sectionId = null">
                🏕️ {{ t('wholeTroop') }}
              </button>
              <button v-for="sec in data?.sections" :key="sec.id" class="chip"
                      :class="{ on: editing.sectionId === sec.id }" @click="editing.sectionId = sec.id">
                {{ lx(sec, 'name') }}
              </button>
            </div>
          </div>
          <div><label class="lab">{{ t('titleEl') }}</label><input v-model="editing.titleEl" class="in"></div>
          <div><label class="lab">{{ t('summary') }}</label><input v-model="editing.summaryEl" class="in"></div>
          <div>
            <label class="lab">{{ t('body') }}</label>
            <textarea ref="bodyEl" v-model="editing.bodyEl" class="in" rows="7" />
            <label class="chip" style="display:inline-flex;margin-top:7px;cursor:pointer" :style="{ opacity: uploading ? .6 : 1 }">
              📷 {{ uploading ? t('loading') : t('addImage') }}
              <input type="file" accept="image/*" style="display:none" :disabled="uploading" @change="addImage">
            </label>
            <button class="chip" style="display:inline-flex;margin:7px 0 0 6px" @click="pickingPlace = true">📍 {{ t('addLocation') }}</button>
            <div class="tiny muted" style="margin-top:4px">{{ t('addImageHint') }}</div>
          </div>
          <div><label class="lab">{{ t('bodyEn') }}</label><textarea v-model="editing.bodyEn" class="in" rows="4" :placeholder="t('enOptional')" /></div>
          <template v-if="!readOnly">
            <!-- an administrator publishes; anyone else submits for approval -->
            <button v-if="isAdmin" class="srow" style="box-shadow:none;border:1px solid var(--line)" @click="editing.isPublished = !editing.isPublished">
              <div class="txt"><b>{{ t('publishedQ') }}</b></div>
              <span class="sw" :class="{ off: !editing.isPublished }" />
            </button>
            <button v-else class="srow" style="box-shadow:none;border:1px solid var(--line)" @click="editing.submitForApproval = !editing.submitForApproval">
              <div class="txt"><b>{{ t('submitForApproval') }}</b><span>{{ t('submitForApprovalSub') }}</span></div>
              <span class="sw" :class="{ off: !editing.submitForApproval }" />
            </button>
            <button class="btn ghost" :disabled="!editing.titleEl?.trim()" @click="previewing = true">👁️ {{ t('previewPage') }}</button>
            <button v-if="isAdmin && editing.pendingApproval" class="btn" @click="approve">✅ {{ t('approveAndPublish') }}</button>
            <button class="btn" :class="{ ghost: isAdmin && editing.pendingApproval }" :disabled="!editing.titleEl?.trim()" @click="save">{{ t('save') }}</button>
          </template>
          <button class="btn ghost" @click="editing = null">{{ t('close') }}</button>
        </div>
      </div>
      <MapPicker v-if="pickingPlace" @pick="placePicked" @close="pickingPlace = false" />

      <!-- the page as readers see it -->
      <div v-if="previewing && editing" class="sheet-backdrop" @click.self="previewing = false">
        <div class="sheet preview">
          <div class="pv-tag">👁️ {{ t('previewPage') }} · {{ sectionName(editing.sectionId) }}</div>
          <div class="pv-head">
            <div class="pv-title">{{ editing.iconEmoji }} {{ editing.titleEl }}</div>
            <div class="pv-sub">{{ t('info') }}</div>
          </div>
          <div class="pv-body">
            <UniformArt v-if="editing.illustration === 'uniforms'" kind="formal" />
            <InfoBody :text="editing.bodyEl || ''" />
            <UniformArt v-if="editing.illustration === 'uniforms'" kind="work" />
          </div>
          <button class="btn ghost" @click="previewing = false">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
/* solid, not the sheet's frosted glass: the editor must not show through */
.preview{display:flex; flex-direction:column; gap:12px; min-height:72dvh; max-height:92dvh; overflow:auto;
  background:var(--bg) !important; -webkit-backdrop-filter:none !important; backdrop-filter:none !important}
.preview > .btn{margin-top:auto}
.pv-tag{align-self:center; font-size:11.5px; font-weight:700; color:var(--muted)}
.pv-head{margin:0 -4px; padding:16px 16px 18px; border-radius:18px; color:#fff; background:var(--grad-auth)}
.pv-title{font-size:19px; font-weight:800; letter-spacing:-.01em}
.pv-sub{font-size:12px; opacity:.8; margin-top:2px}
.pv-body{display:flex; flex-direction:column; gap:13px}
.it{transition:transform .18s ease}
.grip{flex:none; display:grid; place-items:center; width:26px; align-self:stretch; margin:-10px 0 -10px -8px;
  color:#9AA8BA; cursor:grab; touch-action:none; user-select:none}
.grip:active{cursor:grabbing}
</style>
