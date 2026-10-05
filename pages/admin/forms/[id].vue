<script setup lang="ts">
/* One form: building it (modules of questions, the tickboxes at the end, the
   signature), its settings (link, texts, open or closed), and what has come
   back. Nothing is saved until Save — the page says when there are changes. */
import { FIELD_TYPES, WITH_OPTIONS, CHOICE_TYPES, YES_NO, newId, type FormSpec, type FormQuestion, type FieldType } from '~/utils/formSpec'
const { t, locale } = useI18n()
const me = useMe()
const { show } = useToast()
const route = useRoute()
const id = Number(route.params.id)
if (me.value && me.value.role !== 'troop_leader') navigateTo('/admin/more', { replace: true })

const tab = ref<'build' | 'settings' | 'responses'>(route.query.tab === 'responses' ? 'responses' : 'build')
watch(tab, v => navigateTo({ query: { ...route.query, tab: v } }, { replace: true }))

const { data: form, refresh } = await useFetch<any>(`/api/admin/forms/${id}`)
const spec = ref<FormSpec>({ modules: [], ticks: [], signature: { enabled: false, required: true, label: '' } })
const settings = reactive({ titleEl: '', slug: '', introEl: '', thanksEl: '', isOpen: false, closesAt: '' })
const open = ref<string | null>(null)    // the question being edited
let saved = ''
const snapshot = () => JSON.stringify({ s: spec.value, x: settings })
const dirty = ref(false)

function fill(f: any) {
  if (!f) return
  spec.value = JSON.parse(JSON.stringify(f.spec))
  Object.assign(settings, {
    titleEl: f.titleEl, slug: f.slug, introEl: f.introEl || '', thanksEl: f.thanksEl || '',
    isOpen: f.isOpen, closesAt: f.closesAt ? toLocalInput(f.closesAt) : ''
  })
  saved = snapshot(); dirty.value = false
}
watch(form, fill, { immediate: true })
watch([spec, settings], () => { dirty.value = snapshot() !== saved }, { deep: true })
function toLocalInput(iso: string) {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
if (import.meta.client) {
  const warn = (e: BeforeUnloadEvent) => { if (dirty.value) { e.preventDefault(); e.returnValue = '' } }
  onMounted(() => window.addEventListener('beforeunload', warn))
  onUnmounted(() => window.removeEventListener('beforeunload', warn))
}
onBeforeRouteLeave(() => !dirty.value || confirm(t('formUnsaved')))

const busy = ref(false)
async function save() {
  busy.value = true
  try {
    for (const m of spec.value.modules) for (const q of m.questions)
      q.options = q.type === 'yesno' ? [...YES_NO] : WITH_OPTIONS.includes(q.type) ? cleanOptions(q.options) : []
    await $fetch(`/api/admin/forms/${id}`, {
      method: 'PATCH',
      body: { ...settings, closesAt: settings.closesAt ? new Date(settings.closesAt).toISOString() : null, spec: spec.value }
    })
    await refresh()
    show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) } finally { busy.value = false }
}

/* building */
const TYPE_ICON: Record<FieldType, string> = {
  text: '✏️', textarea: '📝', number: '🔢', email: '✉️', phone: '📞', date: '📅', yesno: '👍', radio: '🔘', checkbox: '☑️', select: '🔽', file: '📎'
}
function addModule() {
  spec.value.modules.push({ id: newId(), title: '', questions: [] })
}
function addQuestion(mi: number) {
  const q: FormQuestion = { id: newId(), type: 'text', label: '', required: false, options: [] }
  spec.value.modules[mi].questions.push(q)
  open.value = q.id
}
function duplicate(mi: number, qi: number) {
  const src = spec.value.modules[mi].questions[qi]
  const q = { ...JSON.parse(JSON.stringify(src)), id: newId() }
  spec.value.modules[mi].questions.splice(qi + 1, 0, q)
  open.value = q.id
}
function move<T>(list: T[], i: number, by: number) {
  const j = i + by
  if (j < 0 || j >= list.length) return
  const [x] = list.splice(i, 1)
  list.splice(j, 0, x)
}
/* a whole section copied, placed right after it: every question gets a new
   identity, and a question shown only for an answer given inside the same
   section now follows that answer in the copy rather than in the original */
function duplicateModule(mi: number) {
  const src = spec.value.modules[mi]
  const ids = new Map(src.questions.map(q => [q.id, newId()]))
  const copy = JSON.parse(JSON.stringify(src))
  copy.id = newId()
  copy.title = src.title ? `${src.title} (${t('formCopy')})` : ''
  for (const q of copy.questions) {
    q.id = ids.get(q.id)
    if (q.showIf && ids.has(q.showIf.q)) q.showIf.q = ids.get(q.showIf.q)
  }
  spec.value.modules.splice(mi + 1, 0, copy)
  open.value = null
  show('⧉ ' + t('formModuleCopied'))
}
function removeModule(mi: number) {
  const m = spec.value.modules[mi]
  if (m.questions.length && !confirm(t('formRemoveModuleQ', { n: m.questions.length }))) return
  spec.value.modules.splice(mi, 1)
}
/* what a condition can depend on: the choice questions before it, with their
   options as currently typed */
type Source = { id: string, label: string, options: string[] }
const liveOptions = (q: FormQuestion) => q.type === 'yesno' ? [...YES_NO] : cleanOptions(q.options)
const asSource = (q: FormQuestion): Source => ({ id: q.id, label: q.label, options: liveOptions(q) })
function sourcesBefore(mi: number, qi?: number): Source[] {
  const out: Source[] = []
  spec.value.modules.forEach((m, i) => {
    if (i > mi) return
    m.questions.forEach((q, j) => {
      if (i === mi && (qi === undefined || j >= qi)) return
      if (CHOICE_TYPES.includes(q.type)) out.push(asSource(q))
    })
  })
  return out
}
/** "if «Πρώτη εγγραφή;» is Ναι" — for the module's and the question's heading. */
function condLabel(c?: { q: string, anyOf: string[] }) {
  if (!c) return ''
  const src = spec.value.modules.flatMap(m => m.questions).find(q => q.id === c.q)
  return t('formCondSummary', { q: src?.label || '?', a: c.anyOf.join(' / ') || '…' })
}
/* a list question's choices, one box each: add, remove, reorder. Enter in a
   box starts the next one, as typing a list naturally goes. */
const cleanOptions = (list: string[]) => [...new Set(list.map(x => x.trim()).filter(Boolean))]
async function addOption(q: FormQuestion, at = q.options.length) {
  q.options.splice(at, 0, '')
  await nextTick()
  ;(document.querySelector(`[data-opt="${q.id}-${at}"]`) as HTMLInputElement | null)?.focus()
}
function removeOption(q: FormQuestion, i: number) { q.options.splice(i, 1) }
/* a question turned into a list starts with two empty choices to fill in */
watch(() => spec.value.modules.flatMap(m => m.questions.map(q => q.type)), () => {
  for (const m of spec.value.modules) for (const q of m.questions)
    if (WITH_OPTIONS.includes(q.type) && !q.options.length) q.options.push('', '')
    else if (q.type === 'yesno' && q.options.join() !== YES_NO.join()) q.options = [...YES_NO]
})
function addTick() { spec.value.ticks.push({ id: newId(), label: '', required: true }) }

const link = computed(() => `https://forms.scouts30.org/${form.value?.slug || settings.slug}`)
async function copyLink() {
  try { await navigator.clipboard.writeText(link.value); show('📋 ' + t('copied')) } catch { show(link.value) }
}
const previewHref = computed(() => `/forms/${form.value?.slug}?preview=1`)

async function removeForm() {
  if (!confirm(t('formDeleteQ'))) return
  await $fetch(`/api/admin/forms/${id}`, { method: 'DELETE' })
  dirty.value = false
  show('🗑️ ' + t('deleted'))
  await navigateTo('/admin/forms')
}

/* what has come back */
const responses = ref<any[] | null>(null)
async function loadResponses() {
  try { responses.value = await $fetch<any[]>(`/api/admin/forms/${id}/responses`) }
  catch (e: any) { show(e?.data?.message || t('error')) }
}
watch(tab, v => { if (v === 'responses') loadResponses() }, { immediate: true })
const exporting = ref(false)
async function exportCsv() {
  exporting.value = true
  try {
    const f = await $fetch<{ fileId: number, name: string }>(`/api/admin/forms/${id}/export`, { method: 'POST' })
    await downloadFormFile(f.fileId, f.name)
  } catch (e: any) { show(e?.data?.message || t('error')) } finally { exporting.value = false }
}
const stamp = (iso: string) => `${fmtDate(iso, locale.value)} · ${fmtTime(iso)}`
</script>

<template>
  <AppShell :title="form?.titleEl || t('forms')" :sub="form?.accepting ? '🟢 ' + t('formOpen') : '⚪ ' + t('formClosedShort')" back="/admin/forms">
    <div class="seg">
      <button :class="{ on: tab === 'build' }" @click="tab = 'build'">🧩 {{ t('formTabBuild') }}</button>
      <button :class="{ on: tab === 'settings' }" @click="tab = 'settings'">⚙️ {{ t('formTabSettings') }}</button>
      <button :class="{ on: tab === 'responses' }" @click="tab = 'responses'">📥 {{ t('formTabResponses') }}</button>
    </div>

    <!-- ===== building ===== -->
    <template v-if="tab === 'build'">
      <div v-for="(m, mi) in spec.modules" :key="m.id" class="card mod">
        <div class="mhead">
          <span class="mnum">{{ mi + 1 }}</span>
          <input v-model="m.title" class="in" :placeholder="t('formModuleTitlePh')">
          <button class="ib" :disabled="mi === 0" :aria-label="t('moveUp')" @click="move(spec.modules, mi, -1)">↑</button>
          <button class="ib" :disabled="mi === spec.modules.length - 1" :aria-label="t('moveDown')" @click="move(spec.modules, mi, 1)">↓</button>
          <button class="ib" :aria-label="t('formDuplicateModule')" :title="t('formDuplicateModule')" @click="duplicateModule(mi)">⧉</button>
          <button class="ib del" :aria-label="t('delete')" @click="removeModule(mi)">🗑</button>
        </div>
        <textarea v-model="m.description" class="in" rows="2" :placeholder="t('formModuleDescPh')" />
        <FormConditionEdit v-if="mi > 0 || m.showIf" v-model="m.showIf" :sources="sourcesBefore(mi)" what="module" />

        <div v-for="(q, qi) in m.questions" :key="q.id" class="qq" :class="{ editing: open === q.id }">
          <button class="qrow" @click="open = open === q.id ? null : q.id">
            <span class="qi">{{ TYPE_ICON[q.type] }}</span>
            <span class="ql">{{ q.label || t('formUntitledQ') }}<span v-if="q.required" class="req">*</span>
              <small v-if="q.showIf" class="cl">🔀 {{ condLabel(q.showIf) }}</small></span>
            <span class="tiny muted">{{ t('ftype_' + q.type) }}</span>
            <span class="chev">{{ open === q.id ? '▾' : '›' }}</span>
          </button>
          <div v-if="open === q.id" class="qedit">
            <div><label class="lab">{{ t('formQuestion') }}</label><input v-model="q.label" class="in" :placeholder="t('formQuestionPh')"></div>
            <div>
              <label class="lab">{{ t('formAnswerType') }}</label>
              <select v-model="q.type" class="in">
                <option v-for="ft in FIELD_TYPES" :key="ft" :value="ft">{{ TYPE_ICON[ft] }} {{ t('ftype_' + ft) }}</option>
              </select>
            </div>
            <div v-if="WITH_OPTIONS.includes(q.type)">
              <label class="lab">{{ t('formOptions') }}</label>
              <div class="optlist">
                <div v-for="(o, oi) in q.options" :key="oi" class="optrow">
                  <span class="mark">{{ q.type === 'checkbox' ? '☐' : q.type === 'select' ? (oi + 1) + '.' : '○' }}</span>
                  <input v-model="q.options[oi]" class="in" :data-opt="`${q.id}-${oi}`" :placeholder="`${t('formOption')} ${oi + 1}`"
                         @keydown.enter.prevent="addOption(q, oi + 1)">
                  <button class="ib" :disabled="oi === 0" :aria-label="t('moveUp')" @click="move(q.options, oi, -1)">↑</button>
                  <button class="ib del" :aria-label="t('delete')" @click="removeOption(q, oi)">✕</button>
                </div>
              </div>
              <button class="chip" style="margin-top:7px" @click="addOption(q)">+ {{ t('formAddOption') }}</button>
            </div>
            <div v-if="q.type === 'file'" class="tiny muted">📎 {{ t('formFileBuilderNote') }}</div>
            <div><label class="lab">{{ t('formHelp') }}</label><input v-model="q.help" class="in" :placeholder="t('formHelpPh')"></div>
            <label class="tog"><input v-model="q.required" type="checkbox"> {{ t('formRequired') }}</label>
            <FormConditionEdit v-model="q.showIf" :sources="sourcesBefore(mi, qi)" what="question" />
            <div class="qtools">
              <button class="chip" :disabled="qi === 0" @click="move(m.questions, qi, -1)">↑</button>
              <button class="chip" :disabled="qi === m.questions.length - 1" @click="move(m.questions, qi, 1)">↓</button>
              <button v-if="mi > 0" class="chip" @click="spec.modules[mi - 1].questions.push(m.questions.splice(qi, 1)[0])">⇡ {{ t('formToPrevModule') }}</button>
              <button v-if="mi < spec.modules.length - 1" class="chip" @click="spec.modules[mi + 1].questions.unshift(m.questions.splice(qi, 1)[0])">⇣ {{ t('formToNextModule') }}</button>
              <button class="chip" @click="duplicate(mi, qi)">⧉ {{ t('formDuplicate') }}</button>
              <button class="chip" style="color:var(--danger)" @click="m.questions.splice(qi, 1); open = null">🗑 {{ t('delete') }}</button>
            </div>
          </div>
        </div>
        <button class="btn ghost" @click="addQuestion(mi)">+ {{ t('formAddQuestion') }}</button>
      </div>
      <button class="btn ghost" @click="addModule">+ {{ t('formAddModule') }}</button>

      <div class="sec-title">☑️ {{ t('formTicks') }}</div>
      <div class="card mod">
        <div class="tiny muted">{{ t('formTicksNote') }}</div>
        <div v-for="(x, xi) in spec.ticks" :key="x.id" class="tickrow">
          <textarea v-model="x.label" class="in" rows="2" :placeholder="t('formTickPh')" />
          <div class="qtools">
            <label class="tog"><input v-model="x.required" type="checkbox"> {{ t('formRequired') }}</label>
            <span style="flex:1" />
            <button class="chip" :disabled="xi === 0" @click="move(spec.ticks, xi, -1)">↑</button>
            <button class="chip" :disabled="xi === spec.ticks.length - 1" @click="move(spec.ticks, xi, 1)">↓</button>
            <button class="chip" style="color:var(--danger)" @click="spec.ticks.splice(xi, 1)">🗑</button>
          </div>
        </div>
        <button class="btn ghost" @click="addTick">+ {{ t('formAddTick') }}</button>
      </div>

      <div class="sec-title">✍️ {{ t('formSignature') }}</div>
      <div class="card mod">
        <label class="tog"><input v-model="spec.signature.enabled" type="checkbox"> {{ t('formSignatureOn') }}</label>
        <div v-if="spec.signature.enabled" class="tiny muted">{{ t('formSignatureAuto') }}</div>
        <template v-if="spec.signature.enabled">
          <div><label class="lab">{{ t('formSignatureLabel') }}</label><input v-model="spec.signature.label" class="in" :placeholder="t('formSignatureLabelPh')"></div>
          <label class="tog"><input v-model="spec.signature.required" type="checkbox"> {{ t('formRequired') }}</label>
        </template>
      </div>
    </template>

    <!-- ===== settings ===== -->
    <template v-else-if="tab === 'settings'">
      <div class="card mod">
        <div><label class="lab">{{ t('formTitle') }}</label><input v-model="settings.titleEl" class="in"></div>
        <div>
          <label class="lab">{{ t('formLink') }}</label>
          <div class="slug"><span>forms.scouts30.org/</span><input v-model="settings.slug" class="in"></div>
        </div>
        <div><label class="lab">{{ t('formIntro') }}</label><textarea v-model="settings.introEl" class="in" rows="4" :placeholder="t('formIntroPh')" /></div>
        <div><label class="lab">{{ t('formThanks') }}</label><textarea v-model="settings.thanksEl" class="in" rows="2" :placeholder="t('formSentText')" /></div>
      </div>
      <div class="card mod">
        <label class="tog"><input v-model="settings.isOpen" type="checkbox"> <b>{{ t('formAccepting') }}</b></label>
        <div>
          <label class="lab">{{ t('formClosesAt') }}</label>
          <input v-model="settings.closesAt" type="datetime-local" class="in">
          <div class="tiny muted">{{ t('formClosesAtNote') }}</div>
        </div>
      </div>
      <button class="btn danger" @click="removeForm">🗑 {{ t('formDelete') }}</button>
    </template>

    <!-- ===== responses ===== -->
    <template v-else>
      <div class="rtools">
        <span class="tiny muted" style="flex:1">{{ responses?.length ?? '…' }} {{ t('formResponsesN') }}</span>
        <button class="chip" :disabled="!responses?.length || exporting" @click="exportCsv">⬇️ {{ t('formExport') }}</button>
      </div>
      <div v-if="responses && !responses.length" class="empty">{{ t('formNoResponses') }}</div>
      <div v-else-if="responses" class="adm">
        <NuxtLink v-for="r in responses" :key="r.id" :to="`/admin/forms/response/${r.id}`" class="it">
          <span class="dot" :class="{ on: !r.isRead }" />
          <div style="flex:1;min-width:0">
            <b>{{ r.summary.join(' · ') || '#' + r.id }}</b>
            <span>{{ stamp(r.createdAt) }}</span>
          </div>
          <span class="chev">›</span>
        </NuxtLink>
      </div>
      <div class="tiny muted">🔒 {{ t('formAccessNote') }}</div>
    </template>

    <!-- the link, and saving, always at hand -->
    <div v-if="tab !== 'responses'" class="savebar">
      <div class="linkrow">
        <span class="tiny">{{ link }}</span>
        <button class="chip" @click="copyLink">📋</button>
        <a class="chip" :href="previewHref" target="_blank" rel="noopener">👁 {{ t('formPreview') }}</a>
      </div>
      <button class="btn" :disabled="busy || !dirty" @click="save">{{ busy ? t('loading') : dirty ? t('save') : '✓ ' + t('saved') }}</button>
    </div>
  </AppShell>
</template>

<style scoped>
.mod{display:flex; flex-direction:column; gap:10px}
.mhead{display:flex; align-items:center; gap:6px}
.mhead .in{flex:1; font-weight:700}
.mnum{flex:none; width:26px; height:26px; border-radius:50%; background:var(--accent-soft); color:var(--accent-deep); font-weight:800; font-size:12px; display:flex; align-items:center; justify-content:center}
.ib{flex:none; border:0; background:var(--hair); border-radius:9px; width:32px; height:32px; font-size:14px; color:var(--ink)}
.ib:disabled{opacity:.3}
.ib.del{background:var(--danger-soft)}
.qq{border:1.5px solid var(--line); border-radius:14px; overflow:hidden}
.qq.editing{border-color:var(--accent)}
.qrow{display:flex; align-items:center; gap:9px; width:100%; border:0; background:none; padding:11px 12px; text-align:left; font:inherit; color:inherit}
.qi{flex:none}
.ql{flex:1; min-width:0; font-size:13.5px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.cl{display:block; font-size:11px; font-weight:600; color:#8A6614; overflow:hidden; text-overflow:ellipsis}
.req{color:var(--danger); margin-left:3px}
.qedit{display:flex; flex-direction:column; gap:10px; padding:4px 12px 12px; border-top:1px solid var(--hair)}
.qtools{display:flex; flex-wrap:wrap; gap:6px; align-items:center}
.tog{display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer}
.tog input{width:18px; height:18px; accent-color:var(--accent)}
.optlist{display:flex; flex-direction:column; gap:6px}
.optrow{display:flex; align-items:center; gap:6px}
.optrow .in{flex:1; min-width:0}
.optrow .mark{flex:none; width:20px; text-align:center; color:var(--muted); font-size:13px}
.tickrow{display:flex; flex-direction:column; gap:6px; padding-bottom:10px; border-bottom:1px solid var(--hair)}
select.in{appearance:auto}
.slug{display:flex; align-items:center; gap:4px}
.slug span{font-size:12.5px; color:var(--muted); flex:none}
.slug .in{flex:1; min-width:0}
.rtools{display:flex; align-items:center; gap:8px}
.dot{flex:none; width:8px; height:8px; border-radius:50%; background:transparent}
.dot.on{background:var(--accent)}
.savebar{position:sticky; bottom:calc(84px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:8px; background:var(--glass); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border:1px solid var(--glass-brd); border-radius:18px; padding:10px; box-shadow:var(--shadow); z-index:5}
/* no tab bar on a wide screen: the bar sits at the bottom, inside the page's
   own padding, so at the end of the page it no longer covers the last card */
@media (min-width:820px){ .savebar{bottom:16px} }
.linkrow{display:flex; align-items:center; gap:6px}
.linkrow .tiny{flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--accent-deep); font-weight:600}
.linkrow a.chip{text-decoration:none}
</style>
