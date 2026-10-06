<script setup lang="ts">
/* One form: building it (modules of questions, the tickboxes at the end, the
   signature), its settings (link, texts, open or closed), and what has come
   back. Nothing is saved until Save — the page says when there are changes. */
import { FIELD_TYPES, WITH_OPTIONS, CHOICE_TYPES, CALC_SOURCES, calcMode, YES_NO, REPEAT_MAX, newId, emailCopySources, gapCount, type FormSpec, type FormQuestion, type FieldType } from '~/utils/formSpec'
const { t, locale } = useI18n()
const me = useMe()
const { show } = useToast()
const route = useRoute()
const id = Number(route.params.id)

const tab = ref<'build' | 'settings' | 'responses'>(route.query.tab === 'responses' ? 'responses' : 'build')
watch(tab, v => navigateTo({ query: { ...route.query, tab: v } }, { replace: true }))

const { data: form, refresh } = await useFetch<any>(`/api/admin/forms/${id}`)

/* approval: an Υπαρχηγός's form waits for the sector's Αρχηγός */
async function approve() {
  try {
    await $fetch(`/api/admin/forms/${id}/approve`, { method: 'POST' })
    show('✅ ' + t('formApproved'))
    await refresh()
  } catch (e: any) { show(errMsg(e)) }
}

/* sending it to families in the app: the parents of the sectors picked */
const parentSecs = ref<number[]>([])
watchEffect(() => {
  if (form.value && !parentSecs.value.length)
    parentSecs.value = form.value.sectionId ? [form.value.sectionId] : form.value.sections.map((x: any) => x.id)
})
const toggleSec = (sid: number) => { parentSecs.value = parentSecs.value.includes(sid) ? parentSecs.value.filter(x => x !== sid) : [...parentSecs.value, sid] }
const sendingParents = ref(false)
async function sendToParents() {
  if (!parentSecs.value.length || sendingParents.value) return
  const names = form.value.sections.filter((x: any) => parentSecs.value.includes(x.id)).map((x: any) => x.nameEl).join(', ')
  if (!confirm(t('formSendParentsQ', { list: names }))) return
  sendingParents.value = true
  try {
    const r = await $fetch<any>(`/api/admin/forms/${id}/notify-parents`, { method: 'POST', body: { sectionIds: parentSecs.value } })
    show('📣 ' + t('formSentParents', { n: r.parents }))
  } catch (e: any) { show(errMsg(e)) } finally { sendingParents.value = false }
}
const spec = ref<FormSpec>({ modules: [], ticks: [], signature: { enabled: false, required: true, label: '' } })
const settings = reactive({ titleEl: '', slug: '', introEl: '', thanksEl: '', thanksTitleEl: '', isOpen: false, closesAt: '' })
const open = ref<string | null>(null)    // the question being edited
let saved = ''
const snapshot = () => JSON.stringify({ s: spec.value, x: settings })
const dirty = ref(false)

function fill(f: any) {
  if (!f) return
  spec.value = JSON.parse(JSON.stringify(f.spec))
  Object.assign(settings, {
    titleEl: f.titleEl, slug: f.slug, introEl: f.introEl || '', thanksEl: f.thanksEl || '', thanksTitleEl: f.thanksTitleEl || '',
    isOpen: f.isOpen, closesAt: f.closesAt ? toLocalInput(f.closesAt) : ''
  })
  saved = snapshot(); dirty.value = false
}
watch(form, fill, { immediate: true })
watch([spec, settings], () => { dirty.value = snapshot() !== saved }, { deep: true })
/* an automatic field: which earlier answer it reads, and its rules */
watch(spec, s => { for (const m of s?.modules || []) for (const q of m.questions) if (q.type === 'calc' && !q.calc) q.calc = { from: '', rules: [] } }, { deep: true, immediate: true })
function calcSources(mi: number, qi: number) {
  const out: Array<FormQuestion & { num: string }> = []
  spec.value.modules.forEach((m, i) => m.questions.forEach((q, j) => {
    if (i < mi || (i === mi && j < qi)) if (CALC_SOURCES.includes(q.type)) out.push({ ...q, num: numbers.value.get(q.id) || '?' })
  }))
  return out
}
const calcSrc = (q: FormQuestion) => spec.value.modules.flatMap(m => m.questions).find(x => x.id === q.calc?.from)
const calcKind = (q: FormQuestion) => calcMode(calcSrc(q)?.type)
function setCalcFrom(q: FormQuestion, id: string) {
  const src = spec.value.modules.flatMap(m => m.questions).find(x => x.id === id)
  q.calc = { from: id, rules: src && calcMode(src.type) !== 'match' ? [{ min: null, max: null, text: '' }] : [], ...(src?.type === 'date' ? { asOf: 'yearEnd' } : {}) }
}
const matchText = (q: FormQuestion, opt: string) => q.calc?.rules.find(r => r.match === opt)?.text || ''
function setMatch(q: FormQuestion, opt: string, text: string) {
  const rules = q.calc!.rules.filter(r => r.match !== opt)
  if (text.trim()) rules.push({ match: opt, text })
  q.calc!.rules = rules
}
const asOfKind = (q: FormQuestion) => !q.calc?.asOf ? 'today' : q.calc.asOf === 'yearEnd' ? 'yearEnd' : 'date'
function setAsOf(q: FormQuestion, kind: string) {
  q.calc!.asOf = kind === 'today' ? '' : kind === 'yearEnd' ? 'yearEnd' : (q.calc!.asOf && q.calc!.asOf !== 'yearEnd' ? q.calc!.asOf : new Date().toISOString().slice(0, 10))
}
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
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}

/* building */
const TYPE_ICON: Record<FieldType, string> = {
  text: '✏️', textarea: '📝', number: '🔢', email: '✉️', phone: '📞', date: '📅', yesno: '👍', radio: '🔘', checkbox: '☑️', select: '🔽', file: '📎', gaps: '🧩', calc: '🧮'
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
type Source = { id: string, num: string, label: string, options: string[] }
/* every question numbered by its section and place in it — 2.3 is the third
   question of the second section — so a condition can name it briefly */
const numbers = computed(() => {
  const m = new Map<string, string>()
  spec.value.modules.forEach((mod, i) => mod.questions.forEach((q, j) => m.set(q.id, `${i + 1}.${j + 1}`)))
  return m
})
const liveOptions = (q: FormQuestion) => q.type === 'yesno' ? [...YES_NO]
  // an automatic field's possible results, for conditions on it
  : q.type === 'calc' ? [...new Set([...(q.calc?.rules || []).map(r => r.text.trim()), (q.calc?.otherwise || '').trim()].filter(Boolean))]
  : cleanOptions(q.options)
const asSource = (q: FormQuestion): Source => ({ id: q.id, num: numbers.value.get(q.id) || '?', label: q.label, options: liveOptions(q) })
function sourcesBefore(mi: number, qi?: number): Source[] {
  const out: Source[] = []
  spec.value.modules.forEach((m, i) => {
    if (i > mi) return
    m.questions.forEach((q, j) => {
      if (i === mi && (qi === undefined || j >= qi)) return
      if (CHOICE_TYPES.includes(q.type) || q.type === 'calc') out.push(asSource(q))
    })
  })
  return out
}
/** "if «Πρώτη εγγραφή;» is Ναι" — for the module's and the question's heading. */
function condLabel(c?: { q: string, anyOf: string[] }) {
  if (!c) return ''
  return t('formCondSummary', { q: numbers.value.get(c.q) || '?', a: c.anyOf.join(' / ') || '…' })
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
/* repeated runs: which run (if any) each section belongs to, and the
   sections a run starting here may reach — up to the next run's start */
function runOf(mi: number) {
  for (let i = mi; i >= 0; i--) {
    const r = spec.value.modules[i].repeat
    if (!r) continue
    const end = spec.value.modules.findIndex(x => x.id === r.until)
    return mi <= Math.max(i, end) ? { start: i, end: Math.max(i, end), repeat: r } : null
  }
  return null
}
/* A run may reach over a section that repeats on its own: that section then
   joins the run (and so does the rest of its own run) — two runs side by side
   would ask "another child?" twice, and lose which answers are whose. */
function reachOf(mi: number) {
  return spec.value.modules.slice(mi).map((x, k) => ({ id: x.id, n: mi + k + 1, title: x.title }))
}
function setUntil(mi: number, id: string) {
  const mods = spec.value.modules
  let end = mods.findIndex(x => x.id === id)
  for (let j = mi + 1; j <= end; j++) {
    const r = mods[j].repeat
    if (!r) continue
    end = Math.max(end, mods.findIndex(x => x.id === r.until))
    delete mods[j].repeat
  }
  mods[mi].repeat!.until = mods[Math.max(mi, end)].id
}
function toggleRepeat(m: any, on: boolean) {
  if (on) m.repeat = { label: 'Παιδί', until: m.id, ask: '', max: 6 }
  else delete m.repeat
}
/* the copy by email: to one of the Email questions asked once; with only one
   such question there is nothing to choose */
const copySources = computed(() => emailCopySources(spec.value))
function toggleCopy(on: boolean) {
  if (on) spec.value.emailCopy = { q: copySources.value[0]?.id || '' }
  else delete spec.value.emailCopy
}
// a question it pointed at, since removed or moved into a repeated run
watch(copySources, list => {
  const c = spec.value.emailCopy
  if (c && !list.some(q => q.id === c.q)) c.q = list[0]?.id || ''
})
function addTick() { spec.value.ticks.push({ id: newId(), label: '', required: true }) }

const link = computed(() => `https://forms.scouts30.org/${form.value?.slug || settings.slug}`)
async function copyLink() {
  try { await navigator.clipboard.writeText(link.value); show('📋 ' + t('copied')) } catch { show(link.value) }
}
const previewHref = computed(() => `/forms/${form.value?.slug}?preview=1`)

/* reuse: the whole form copied to a new one, to change what differs; or its
   design kept as a template for new forms. Both from what is saved. */
const reuseBusy = ref(false)
async function copyForm() {
  if (dirty.value) { show(t('formSaveFirst')); return }
  const title = prompt(t('formCopyTitleQ'), `${settings.titleEl} (${t('formCopySuffix')})`)
  if (!title?.trim()) return
  reuseBusy.value = true
  try {
    const r = await $fetch<any>('/api/admin/forms', { method: 'POST', body: { titleEl: title, fromForm: id } })
    show('⧉ ' + t('formCopied'))
    await navigateTo(`/admin/forms/${r.id}`)
  } catch (e: any) { show(errMsg(e)) } finally { reuseBusy.value = false }
}
async function saveTemplate() {
  if (dirty.value) { show(t('formSaveFirst')); return }
  const name = prompt(t('formTemplateNameQ'), settings.titleEl)
  if (!name?.trim()) return
  reuseBusy.value = true
  try {
    await $fetch('/api/admin/form-templates', { method: 'POST', body: { formId: id, name } })
    show('⭐ ' + t('formTemplateSaved'))
  } catch (e: any) { show(errMsg(e)) } finally { reuseBusy.value = false }
}

async function moveSection(v: string) {
  try {
    await $fetch(`/api/admin/forms/${id}`, { method: 'PATCH', body: { sectionId: v ? Number(v) : null } })
    await refresh()
  } catch (e: any) { show(errMsg(e)); await refresh() }
}

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
  catch (e: any) { show(errMsg(e)) }
}
watch(tab, v => { if (v === 'responses') loadResponses() }, { immediate: true })
const exporting = ref(false)
async function exportCsv() {
  exporting.value = true
  try {
    const f = await $fetch<{ fileId: number, name: string }>(`/api/admin/forms/${id}/export`, { method: 'POST' })
    await downloadFormFile(f.fileId, f.name)
  } catch (e: any) { show(errMsg(e)) } finally { exporting.value = false }
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
    <!-- an Υπαρχηγός's form: waiting for the Αρχηγός, who may approve it here -->
    <div v-if="form?.pendingApproval" class="approval">
      <span>⏳ <b>{{ t('formAwaitingLong') }}</b></span>
      <button v-if="form.canApprove" class="btn" @click="approve">✅ {{ t('formApprove') }}</button>
    </div>

    <!-- ===== building ===== -->
    <template v-if="tab === 'build'">
      <div v-for="(m, mi) in spec.modules" :key="m.id" class="card mod" :class="{ looped: !!runOf(mi) }">
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
        <!-- a run of sections answered again for each child -->
        <div v-if="runOf(mi) && runOf(mi)!.start < mi" class="inrun">🔁 {{ t('formRepeatPart', { label: runOf(mi)!.repeat.label }) }}</div>
        <div v-else class="rep" :class="{ on: !!m.repeat }">
          <label class="tog"><input type="checkbox" :checked="!!m.repeat" @change="toggleRepeat(m, ($event.target as HTMLInputElement).checked)"> {{ t('formRepeatOn') }}</label>
          <template v-if="m.repeat">
            <div class="rep-grid">
              <div><label class="lab">{{ t('formRepeatLabel') }}</label><input v-model="m.repeat.label" class="in" :placeholder="t('formRepeatLabelPh')"></div>
              <div><label class="lab">{{ t('formRepeatMaxLabel') }}</label>
                <select v-model.number="m.repeat.max" class="in"><option v-for="n in REPEAT_MAX - 1" :key="n" :value="n + 1">{{ n + 1 }}</option></select></div>
            </div>
            <div><label class="lab">{{ t('formRepeatUntil') }}</label>
              <select :value="m.repeat.until" class="in" @change="setUntil(mi, ($event.target as HTMLSelectElement).value)">
                <option v-for="o in reachOf(mi)" :key="o.id" :value="o.id">{{ o.n }}. {{ o.title || t('formModuleTitlePh') }}</option>
              </select></div>
            <div><label class="lab">{{ t('formRepeatAsk') }}</label><input v-model="m.repeat.ask" class="in" :placeholder="t('formRepeatAskPh')"></div>
            <div class="tiny muted">{{ t('formRepeatNote', { label: m.repeat.label || '…' }) }}</div>
          </template>
        </div>

        <div v-for="(q, qi) in m.questions" :key="q.id" class="qq" :class="{ editing: open === q.id }">
          <button class="qrow" @click="open = open === q.id ? null : q.id">
            <span class="qn">{{ numbers.get(q.id) }}</span>
            <span class="qi">{{ TYPE_ICON[q.type] }}</span>
            <span class="ql">{{ q.label || t('formUntitledQ') }}<span v-if="q.required" class="req">*</span>
              <small v-if="q.showIf" class="cl">🔀 {{ condLabel(q.showIf) }}</small></span>
            <span class="tiny muted">{{ t('ftype_' + q.type) }}</span>
            <span class="chev">{{ open === q.id ? '▾' : '›' }}</span>
          </button>
          <div v-if="open === q.id" class="qedit">
            <div v-if="q.type === 'gaps'">
              <label class="lab">{{ t('formGapsText') }}</label>
              <textarea v-model="q.label" class="in" rows="4" :placeholder="t('formGapsPh')" />
              <div class="tiny muted">{{ t('formGapsHow') }}</div>
              <!-- what the person will see -->
              <div v-if="gapCount(q.label)" class="gapprev"><FormGaps :label="q.label" :model-value="[]" :required="q.required" /></div>
              <div v-else-if="q.label.trim()" class="tiny warn">{{ t('formGapsNone') }}</div>
            </div>
            <div v-else><label class="lab">{{ t('formQuestion') }}</label><input v-model="q.label" class="in" :placeholder="t('formQuestionPh')"></div>
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
            <!-- an automatic field: read-only, worked out from an earlier answer -->
            <div v-if="q.type === 'calc' && q.calc" class="calced">
              <div class="tiny muted">🧮 {{ t('formCalcHow') }}</div>
              <div>
                <label class="lab">{{ t('formCalcFrom') }}</label>
                <select class="in" :value="q.calc.from" @change="setCalcFrom(q, ($event.target as HTMLSelectElement).value)">
                  <option value="" disabled>{{ t('formCalcPick') }}</option>
                  <option v-for="s in calcSources(mi, qi)" :key="s.id" :value="s.id">{{ s.num }} · {{ (s.label || t('formUntitledQ')).slice(0, 40) }} ({{ t('ftype_' + s.type) }})</option>
                </select>
                <div v-if="!calcSources(mi, qi).length" class="tiny warn">{{ t('formCalcNoSources') }}</div>
              </div>
              <template v-if="calcSrc(q)">
                <!-- a choice: one result per option -->
                <template v-if="calcKind(q) === 'match'">
                  <div v-for="o in liveOptions(calcSrc(q)!)" :key="o" class="crow">
                    <span class="cwhen">{{ o }}</span><span class="carrow">→</span>
                    <input class="in" :value="matchText(q, o)" :placeholder="t('formCalcResultPh')" @input="setMatch(q, o, ($event.target as HTMLInputElement).value)">
                  </div>
                </template>
                <!-- a number or an age: ranges -->
                <template v-else>
                  <div v-if="calcKind(q) === 'age'">
                    <label class="lab">{{ t('formCalcAgeOn') }}</label>
                    <div style="display:flex;gap:8px">
                      <select class="in" :value="asOfKind(q)" @change="setAsOf(q, ($event.target as HTMLSelectElement).value)">
                        <option value="today">{{ t('formCalcAgeToday') }}</option>
                        <option value="yearEnd">{{ t('formCalcAgeYearEnd') }}</option>
                        <option value="date">{{ t('formCalcAgeDate') }}</option>
                      </select>
                      <input v-if="asOfKind(q) === 'date'" v-model="q.calc.asOf" type="date" class="in">
                    </div>
                  </div>
                  <div class="tiny muted">{{ calcKind(q) === 'age' ? t('formCalcAgeRows') : t('formCalcNumRows') }}</div>
                  <div v-for="(r, ri) in q.calc.rules" :key="ri" class="crow range">
                    <input v-model.number="r.min" class="in num" type="number" inputmode="numeric" :placeholder="t('formCalcFromN')">
                    <span class="carrow">–</span>
                    <input v-model.number="r.max" class="in num" type="number" inputmode="numeric" :placeholder="t('formCalcToN')">
                    <span class="carrow">→</span>
                    <button class="ib del" :aria-label="t('delete')" @click="q.calc.rules.splice(ri, 1)">✕</button>
                    <input v-model="r.text" class="in res" :placeholder="t('formCalcResultPh')">
                  </div>
                  <button class="chip" @click="q.calc.rules.push({ min: null, max: null, text: '' })">+ {{ t('formCalcAddRange') }}</button>
                </template>
                <div><label class="lab">{{ t('formCalcOtherwise') }}</label><input v-model="q.calc.otherwise" class="in" :placeholder="t('formCalcOtherwisePh')"></div>
              </template>
            </div>
            <div><label class="lab">{{ t('formHelp') }}</label><input v-model="q.help" class="in" :placeholder="t('formHelpPh')"></div>
            <label v-if="q.type !== 'calc'" class="tog"><input v-model="q.required" type="checkbox"> {{ t('formRequired') }}</label>
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

      <div class="sec-title">📧 {{ t('formCopy') }}</div>
      <div class="card mod">
        <label class="tog"><input type="checkbox" :checked="!!spec.emailCopy" :disabled="!copySources.length && !spec.emailCopy" @change="toggleCopy(($event.target as HTMLInputElement).checked)"> {{ t('formCopyOn') }}</label>
        <div v-if="!copySources.length" class="tiny muted">{{ t('formCopyNeedsEmail') }}</div>
        <template v-else-if="spec.emailCopy">
          <div>
            <label class="lab">{{ t('formCopyTo') }}</label>
            <select v-model="spec.emailCopy.q" class="in">
              <option v-for="q in copySources" :key="q.id" :value="q.id">{{ numbers.get(q.id) }} · {{ q.label || t('formUntitledQ') }}</option>
            </select>
          </div>
          <div class="tiny muted">{{ t('formCopyNote') }}</div>
        </template>
        <div v-if="spec.emailCopy && form && !form.emailReady" class="tiny warn">⚠️ {{ t('formCopyNotReady') }}</div>
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
      </div>
      <!-- what they see once it is sent: the app's own words unless these are filled in -->
      <div class="card mod">
        <div class="sec-title" style="margin:0">✅ {{ t('formDoneScreen') }}</div>
        <div><label class="lab">{{ t('formThanksTitle') }}</label><input v-model="settings.thanksTitleEl" class="in" :placeholder="t('formSentTitle')"></div>
        <div><label class="lab">{{ t('formThanks') }}</label><textarea v-model="settings.thanksEl" class="in" rows="3" :placeholder="t('formSentText')" /></div>
        <div class="tiny muted">{{ t('formDoneNote') }}</div>
        <div class="donePrev">
          <div class="tick">✓</div>
          <b>{{ settings.thanksTitleEl.trim() || t('formSentTitle') }}</b>
          <p>{{ settings.thanksEl.trim() || t('formSentText') }}</p>
        </div>
      </div>
      <div class="card mod">
        <label class="tog"><input v-model="settings.isOpen" type="checkbox" :disabled="form?.pendingApproval"> <b>{{ t('formAccepting') }}</b></label>
        <div v-if="form?.pendingApproval" class="tiny muted">⏳ {{ t('formOpenAfterApproval') }}</div>
        <div>
          <label class="lab">{{ t('formClosesAt') }}</label>
          <input v-model="settings.closesAt" type="datetime-local" class="in">
          <div class="tiny muted">{{ t('formClosesAtNote') }}</div>
        </div>
      </div>
      <div class="card mod">
        <div class="sec-title" style="margin:0">♻️ {{ t('formReuse') }}</div>
        <div class="tiny muted">{{ t('formReuseNote') }}</div>
        <button class="btn ghost" :disabled="reuseBusy" @click="copyForm">⧉ {{ t('formCopyToNew') }}</button>
        <button class="btn ghost" :disabled="reuseBusy" @click="saveTemplate">⭐ {{ t('formSaveTemplate') }}</button>
      </div>
      <!-- to the families, in the app: a notification that opens the form -->
      <div class="card mod">
        <div class="sec-title" style="margin:0">📣 {{ t('formSendParents') }}</div>
        <div class="tiny muted">{{ form?.accepting ? t('formSendParentsNote') : t('formSendParentsClosed') }}</div>
        <div class="chips">
          <button v-for="s in form?.sections" :key="s.id" type="button" class="chip" :class="{ on: parentSecs.includes(s.id) }" @click="toggleSec(s.id)">{{ s.nameEl }}</button>
        </div>
        <button class="btn" :disabled="!form?.accepting || !parentSecs.length || sendingParents || dirty" @click="sendToParents">📣 {{ t('formSendParentsGo') }}</button>
        <div v-if="dirty" class="tiny muted">{{ t('formSaveFirst') }}</div>
      </div>
      <div class="card mod">
        <label class="lab">{{ t('formFor') }}</label>
        <select class="in" :value="form?.sectionId ?? ''" @change="moveSection(($event.target as HTMLSelectElement).value)">
          <option v-if="form?.allSections" value="">{{ t('formWholeTroop') }}</option>
          <option v-for="s in form?.sections" :key="s.id" :value="s.id">{{ s.nameEl }}</option>
        </select>
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
.qn{flex:none; min-width:28px; height:22px; padding:0 6px; border-radius:7px; background:var(--accent-soft); color:var(--accent-deep); font-size:11px; font-weight:800; display:grid; place-items:center}
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
.rep{display:flex; flex-direction:column; gap:9px; border-radius:12px}
.rep.on{background:#E9F1FD; padding:10px}
.rep-grid{display:grid; grid-template-columns:1fr 110px; gap:8px}
.inrun{font-size:12px; font-weight:700; color:#2E5E8C; background:#E9F1FD; border-radius:10px; padding:8px 10px}
.mod.looped{box-shadow:inset 4px 0 0 #7FA8DB, var(--shadow)}
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
.donePrev{border:2px dashed var(--line, #DCE5EF); border-radius:16px; padding:18px 14px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:4px}
.donePrev .tick{width:44px; height:44px; border-radius:50%; background:#27473A; color:#fff; display:grid; place-items:center; font-size:22px; font-weight:800; margin-bottom:4px}
.donePrev b{font-size:16px}
.donePrev p{margin:0; font-size:13px; color:var(--muted); white-space:pre-line}
.warn{color:#8A6614; font-weight:600}
.gapprev{margin-top:8px; padding:10px 12px; border:2px dashed var(--line, #DCE5EF); border-radius:12px; background:#fff}
.approval{display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; background:#FFF7E3; border:2px solid #F6DDAF; border-radius:16px; padding:12px 14px; font-size:13.5px}
.approval .btn{width:auto; padding:10px 18px; min-height:0}
.calced{display:flex; flex-direction:column; gap:10px; padding:12px; border-radius:14px; background:#F1F6FC}
.crow{display:flex; align-items:center; gap:6px}
.crow .in{flex:1; min-width:0}
.crow .in.num{flex:1; width:auto; min-width:0}
.crow.range{flex-wrap:wrap; padding:8px; border-radius:12px; background:#fff}
.crow.range .res{flex:1 1 100%}
.crow.range .del{margin-left:auto}
.cwhen{flex:none; max-width:42%; font-size:13.5px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.carrow{flex:none; color:var(--muted); font-weight:700}
</style>
