<script setup lang="ts">
/* A form, as anyone with its link fills it in — on forms.scouts30.org, or at
   /forms/<link> in the app, where an administrator can also preview one that
   is still closed. One section per page, as Google Forms does it: Επόμενο
   checks only that page, conditions decide which sections are in the run,
   and the last page holds the tickboxes, the signature and the send. The
   phone's back button steps back a page rather than leaving the form.

   A repeated run of sections (each child of a registration) is met once per
   copy — "Παιδί 1", "Παιδί 2"… — and after the last copy a page lists them,
   lets one be edited or taken out, and asks whether to add another. */
import { checkAnswers, visibleParts, instanceTitle, repeatGroups, copiesOf, type FormSpec, type Instance, type RepeatGroup } from '~/utils/formSpec'
const { t } = useI18n()
const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const data = ref<any>(null)
const loadError = ref('')
async function load() {
  if (!slug.value) { loadError.value = t('formNotFound'); return }
  try {
    data.value = await $fetch(`/api/forms/public/${encodeURIComponent(slug.value)}`, { query: route.query.preview ? { preview: 1 } : {} })
  } catch (e: any) { loadError.value = e?.statusCode === 404 ? t('formNotFound') : (errMsg(e)) }
}
onMounted(load)
useHead(() => ({ title: data.value?.titleEl ? `${data.value.titleEl} · 30ον Σύστημα Ελλήνων Προσκόπων Αμμοχώστου` : '30ον Σύστημα Ελλήνων Προσκόπων Αμμοχώστου' }))

const spec = computed<FormSpec | null>(() => data.value?.spec || null)
const answers = reactive<Record<string, any>>({})
const ticks = reactive<Record<string, boolean>>({})
const signature = ref<string | null>(null)
const signerName = ref('')
/* the date under the signature: today's, shown as it is signed; the one kept
   is the moment the form is sent, by the server's clock */
const today = new Date().toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const website = ref('') // only a bot fills this in
/* each upload question's files as uploaded; the answer holds their tokens */
const uploads = reactive<Record<string, Array<{ token: string, name: string, mime: string, size: number }>>>({})
function setUploads(id: string, list: typeof uploads[string]) {
  uploads[id] = list
  answers[id] = list.map(x => x.token)
}
/* how many copies of each repeated run: one to begin with */
const repeats = reactive<Record<string, number>>({})
const groups = computed<RepeatGroup[]>(() => spec.value ? repeatGroups(spec.value) : [])
watch(groups, gs => { for (const g of gs) if (!(g.id in repeats)) repeats[g.id] = 1 }, { immediate: true })

/* what these answers show: a module or question with a condition appears
   the moment the answer it depends on is given, and goes again if it changes */
const shown = computed(() => spec.value
  ? visibleParts(spec.value, answers, repeats)
  : { modules: new Set<string>(), questions: new Set<string>(), shown: [] as Instance[] })
/* every answer the person may meet has a place to go — a new copy's too */
watchEffect(() => {
  for (const inst of shown.value.shown) for (const q of inst.m.questions) {
    const key = q.id + inst.sfx
    if (!(key in answers)) answers[key] = q.type === 'checkbox' || q.type === 'file' || q.type === 'gaps' ? [] : ''
    if (q.type === 'file' && !(key in uploads)) uploads[key] = []
  }
  for (const x of spec.value?.ticks || []) if (!(x.id in ticks)) ticks[x.id] = false
})
const errors = ref<Record<string, string>>({})
const busy = ref(false)
const done = ref<{ thanksTitle?: string, thanks?: string, at?: string, copyTo?: string | null } | null>(null)
const sentWhen = computed(() => done.value?.at ? new Date(done.value.at).toLocaleString('el-GR', { timeZone: 'Europe/Nicosia', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '')
const sendError = ref('')
const errText = (code: string) => t('formErr_' + code)

const payload = () => ({ answers: { ...answers }, ticks: { ...ticks }, repeats: { ...repeats }, signature: signature.value, signerName: signerName.value, website: website.value })
/* a problem shown clears the moment it is put right; none new appear until
   the next Επόμενο */
watch([answers, ticks, signature, signerName], () => {
  if (!spec.value || !Object.keys(errors.value).length) return
  const now = checkAnswers(spec.value, payload()).errors
  errors.value = Object.fromEntries(Object.entries(now).filter(([k]) => k in errors.value))
}, { deep: true })

/* the pages: each section the answers so far lead to — a repeated run once
   per copy, then the page that asks for another — and the end, with the
   tickboxes and the signature, if the form has any */
type Page = { kind: 'module', inst: Instance } | { kind: 'more', group: RepeatGroup } | { kind: 'end' }
const pages = computed<Page[]>(() => {
  const sp = spec.value
  if (!sp) return []
  const list: Page[] = []
  const vis = shown.value.shown
  vis.forEach((inst, i) => {
    list.push({ kind: 'module', inst })
    if (inst.group && vis[i + 1]?.group?.id !== inst.group.id) list.push({ kind: 'more', group: inst.group })
  })
  if (sp.ticks.length || sp.signature.enabled || !list.length) list.push({ kind: 'end' })
  return list
})
const idsOf = (p: Page) => p.kind === 'module'
  ? p.inst.m.questions.map(q => q.id + p.inst.sfx).filter(k => shown.value.questions.has(k))
  : p.kind === 'more' ? [] : [...(spec.value?.ticks || []).map(x => x.id), 'signature', 'signerName']

/* the "another?" page: the copies so far, each named by its first answer */
function copyName(g: RepeatGroup, n: number) {
  for (let j = g.start; j <= g.end; j++) for (const q of spec.value!.modules[j].questions) {
    const v = answers[`${q.id}@${n}`]
    if (typeof v === 'string' && v.trim() && ['text', 'textarea'].includes(q.type)) return v.trim()
  }
  return ''
}
const firstPageOf = (g: RepeatGroup, n: number) =>
  pages.value.findIndex(p => p.kind === 'module' && p.inst.group?.id === g.id && p.inst.copy === n)
function addCopy(g: RepeatGroup) {
  if (copiesOf(g, repeats) >= g.repeat.max) return
  // the new copy's pages take this page's place: its first one opens here
  repeats[g.id] = copiesOf(g, repeats) + 1
  window.scrollTo({ top: 0 })
}
/* taking a copy out moves the ones after it up, answers and files alike */
function removeCopy(g: RepeatGroup, n: number) {
  const count = copiesOf(g, repeats)
  if (count <= 1 || !confirm(t('formRepeatRemoveQ', { name: `${g.repeat.label} ${n}` }))) return
  const qs = spec.value!.modules.slice(g.start, g.end + 1).flatMap(m => m.questions)
  for (let k = n; k <= count; k++) for (const q of qs) {
    const from = `${q.id}@${k + 1}`, to = `${q.id}@${k}`
    if (k < count) { answers[to] = answers[from]; if (q.type === 'file') uploads[to] = uploads[from] }
    else { delete answers[to]; delete uploads[to] }
  }
  repeats[g.id] = count - 1
  // its pages are gone from in front of this one: stay on the list
  nextTick(() => {
    const at = pages.value.findIndex(p => p.kind === 'more' && p.group.id === g.id)
    if (at >= 0) router.replace({ query: { ...route.query, s: at > 0 ? String(at) : undefined } })
  })
}

/* which page is open lives in the address (?s=2), so the back button steps
   back; a reload starts over from the first, as the answers are not kept */
const router = useRouter()
const step = computed(() => Math.max(0, Math.min(Number(route.query.s) || 0, pages.value.length - 1)))
const page = computed(() => pages.value[step.value])
const isLast = computed(() => step.value === pages.value.length - 1)
onMounted(() => { if (route.query.s) router.replace({ query: { ...route.query, s: undefined } }) })
function go(n: number) {
  errors.value = {}
  router.push({ query: { ...route.query, s: n > 0 ? String(n) : undefined } })
  window.scrollTo({ top: 0 })
}
async function showErrors(errs: Record<string, string>) {
  errors.value = errs
  await nextTick()
  document.querySelector('.bad')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
function next() {
  if (!spec.value || !page.value) return
  const ids = idsOf(page.value)
  const all = checkAnswers(spec.value, payload()).errors
  const here = Object.fromEntries(Object.entries(all).filter(([k]) => ids.includes(k)))
  if (Object.keys(here).length) return showErrors(here)
  go(step.value + 1)
}
const back = () => { errors.value = {}; router.back() }

async function send() {
  if (!spec.value || busy.value) return
  sendError.value = ''
  const all = checkAnswers(spec.value, payload()).errors
  if (Object.keys(all).length) {
    // the first page with something missing — normally this one
    const at = pages.value.findIndex(p => idsOf(p).some(id => id in all))
    if (at >= 0 && at !== step.value) go(at)
    await nextTick()
    const ids = idsOf(pages.value[at >= 0 ? at : step.value])
    return showErrors(Object.fromEntries(Object.entries(all).filter(([k]) => ids.includes(k))))
  }
  if (data.value?.preview && !data.value?.open) { sendError.value = t('formPreviewNoSend'); return }
  busy.value = true
  try {
    done.value = await $fetch<any>(`/api/forms/public/${encodeURIComponent(slug.value)}`, { method: 'POST', body: payload() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e: any) {
    if (e?.data?.data?.errors) {
      const all = e.data.data.errors
      const at = pages.value.findIndex(p => idsOf(p).some(id => id in all))
      if (at >= 0 && at !== step.value) go(at)
      await nextTick()
      errors.value = all
    }
    sendError.value = errMsg(e)
  } finally { busy.value = false }
}
const kOf = (q: { id: string }) => q.id + (page.value?.kind === 'module' ? page.value.inst.sfx : '')
function toggleOption(id: string, o: string) {
  const list: string[] = answers[id] || []
  answers[id] = list.includes(o) ? list.filter(x => x !== o) : [...list, o]
}
const INPUT_TYPE: Record<string, string> = { text: 'text', number: 'text', email: 'email', phone: 'tel', date: 'date' }
const INPUT_MODE: Record<string, string> = { number: 'decimal', phone: 'tel', email: 'email' }
</script>

<template>
  <div class="pform" :class="{ finished: !!done }">
    <header>
      <img src="/images/logo-256.png" alt="">
      <div><b>30ον Σύστημα Ελλήνων Προσκόπων</b><span>Αμμοχώστου</span></div>
    </header>
    <main>
      <div v-if="loadError" class="card msg">{{ loadError }}</div>
      <div v-else-if="!data" class="card msg muted">{{ t('loading') }}</div>
      <!-- sent: a calm, centred card — the form's own words when it has them -->
      <div v-else-if="done" class="sent">
        <div class="seal" aria-hidden="true">
          <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" /><path d="M19 33.5 28 42 45 23" /></svg>
        </div>
        <div class="form-name">{{ data.titleEl }}</div>
        <h1>{{ done.thanksTitle || t('formSentTitle') }}</h1>
        <p class="thanks">{{ done.thanks || t('formSentText') }}</p>
        <div v-if="sentWhen" class="when">🕒 {{ t('formSentAt', { when: sentWhen }) }}</div>
        <div v-if="done.copyTo" class="copyto">📧 {{ t('formCopySent') }} <b>{{ done.copyTo }}</b></div>
        <div class="close">{{ t('formSentClose') }}</div>
      </div>
      <template v-else>
        <div v-if="data.preview" class="note">👁 {{ data.open ? t('formPreviewOpen') : t('formPreviewClosed') }}</div>
        <h1>{{ data.titleEl }}</h1>
        <div v-if="!data.open && !data.preview" class="card msg">{{ t('formClosed') }}</div>
        <template v-else-if="spec">
          <p v-if="data.introEl && step === 0" class="intro">{{ data.introEl }}</p>
          <div v-if="pages.length > 1" class="progress" :aria-label="t('formStepOf', { n: step + 1, of: pages.length })">
            <div class="track"><i :style="{ width: ((step + 1) / pages.length * 100) + '%' }" /></div>
            <span>{{ t('formStepOf', { n: step + 1, of: pages.length }) }}</span>
          </div>

          <section v-if="page?.kind === 'module'" :key="page.inst.key" class="card mod">
            <h2 v-if="instanceTitle(page.inst)">{{ instanceTitle(page.inst) }}</h2>
            <p v-if="page.inst.m.description" class="desc">{{ page.inst.m.description }}</p>
            <div v-for="q in page.inst.m.questions.filter(x => shown.questions.has(kOf(x)))" :key="q.id" class="q" :class="{ bad: errors[kOf(q)] }">
              <!-- a fill-the-gaps question is its own sentence, answered in place -->
              <FormGaps v-if="q.type === 'gaps'" :id-prefix="'q' + kOf(q)" :label="q.label" :model-value="answers[kOf(q)] || []"
                        :required="q.required" :invalid="!!errors[kOf(q)]" @update:model-value="answers[kOf(q)] = $event" />
              <label v-else class="ql" :for="'q' + kOf(q)">{{ q.label }}<span v-if="q.required" class="req">*</span></label>
              <div v-if="q.help" class="help">{{ q.help }}</div>

              <template v-if="q.type === 'gaps'" />
              <textarea v-else-if="q.type === 'textarea'" :id="'q' + kOf(q)" v-model="answers[kOf(q)]" class="in" rows="4" />
              <select v-else-if="q.type === 'select'" :id="'q' + kOf(q)" v-model="answers[kOf(q)]" class="in">
                <option value="" disabled>{{ t('formChoose') }}</option>
                <option v-for="o in q.options" :key="o" :value="o">{{ o }}</option>
              </select>
              <div v-else-if="q.type === 'yesno'" class="yn">
                <label v-for="o in q.options" :key="o" class="opt" :class="{ on: answers[kOf(q)] === o }">
                  <input v-model="answers[kOf(q)]" type="radio" :name="'q' + kOf(q)" :value="o"><span>{{ o }}</span>
                </label>
              </div>
              <div v-else-if="q.type === 'radio'" class="opts">
                <label v-for="o in q.options" :key="o" class="opt" :class="{ on: answers[kOf(q)] === o }">
                  <input v-model="answers[kOf(q)]" type="radio" :name="'q' + kOf(q)" :value="o"><span>{{ o }}</span>
                </label>
              </div>
              <div v-else-if="q.type === 'checkbox'" class="opts">
                <label v-for="o in q.options" :key="o" class="opt" :class="{ on: (answers[kOf(q)] || []).includes(o) }">
                  <input type="checkbox" :checked="(answers[kOf(q)] || []).includes(o)" @change="toggleOption(kOf(q), o)"><span>{{ o }}</span>
                </label>
              </div>
              <FormFileUpload v-else-if="q.type === 'file'" :model-value="uploads[kOf(q)] || []" :slug="slug" :question-id="q.id"
                              :invalid="!!errors[kOf(q)]" @update:model-value="setUploads(kOf(q), $event)" />
              <input v-else :id="'q' + kOf(q)" v-model="answers[kOf(q)]" class="in" :type="INPUT_TYPE[q.type]"
                     :inputmode="INPUT_MODE[q.type] as any" :autocomplete="q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : 'off'">
              <div v-if="errors[kOf(q)]" class="err">{{ errText(errors[kOf(q)]) }}</div>
            </div>
          </section>

          <!-- after the last copy of a repeated run: the copies so far, and
               whether to add another -->
          <section v-else-if="page?.kind === 'more'" class="card mod more">
            <h2>{{ t('formRepeatSoFar') }}</h2>
            <div class="copies">
              <div v-for="n in copiesOf(page.group, repeats)" :key="n" class="copy">
                <span class="cn">{{ n }}</span>
                <b>{{ page.group.repeat.label }} {{ n }}<small v-if="copyName(page.group, n)"> — {{ copyName(page.group, n) }}</small></b>
                <button type="button" class="chip" @click="go(firstPageOf(page.group, n))">{{ t('edit') }}</button>
                <button v-if="copiesOf(page.group, repeats) > 1" type="button" class="chip x" :aria-label="t('delete')" @click="removeCopy(page.group, n)">🗑</button>
              </div>
            </div>
            <p class="ask">{{ page.group.repeat.ask || t('formRepeatAskDefault', { label: page.group.repeat.label }) }}</p>
            <div class="yn2">
              <button type="button" class="btn ghost" :disabled="copiesOf(page.group, repeats) >= page.group.repeat.max" @click="addCopy(page.group)">
                ＋ {{ t('formRepeatYes', { label: `${page.group.repeat.label} ${copiesOf(page.group, repeats) + 1}` }) }}
              </button>
              <button type="button" class="btn" @click="go(step + 1)">{{ t('formRepeatNo') }} ›</button>
            </div>
            <div v-if="copiesOf(page.group, repeats) >= page.group.repeat.max" class="help">{{ t('formRepeatMax', { n: page.group.repeat.max }) }}</div>
          </section>

          <section v-else-if="page?.kind === 'end'" class="card mod">
            <label v-for="x in spec.ticks" :key="x.id" class="tick" :class="{ bad: errors[x.id] }">
              <input v-model="ticks[x.id]" type="checkbox">
              <span>{{ x.label }}<span v-if="x.required" class="req">*</span></span>
            </label>
            <div v-if="spec.signature.enabled" class="q" :class="{ bad: errors.signature }">
              <label class="ql">{{ spec.signature.label || t('formSignature') }}<span v-if="spec.signature.required" class="req">*</span></label>
              <SignaturePad v-model="signature" :invalid="!!errors.signature" />
              <div v-if="errors.signature" class="err">{{ errText(errors.signature) }}</div>
            </div>
            <div v-if="spec.signature.enabled" class="q" :class="{ bad: errors.signerName }">
              <label class="ql" for="signer">{{ t('formSignerName') }}<span class="req">*</span></label>
              <input id="signer" v-model="signerName" class="in" autocomplete="name">
              <div v-if="errors.signerName" class="err">{{ errText(errors.signerName) }}</div>
              <div class="help">{{ t('formSignedOn') }}: <b>{{ today }}</b></div>
            </div>
          </section>

          <!-- for bots only: people never see it -->
          <input v-model="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">

          <div v-if="Object.keys(errors).length" class="err center">{{ t('formFixErrors') }}</div>
          <div v-if="sendError" class="err center">{{ sendError }}</div>
          <div class="nav">
            <button v-if="step > 0" class="btn ghost" @click="back">‹ {{ t('formBack') }}</button>
            <button v-if="!isLast && page?.kind !== 'more'" class="btn" @click="next">{{ t('formNext') }} ›</button>
            <button v-else-if="isLast" class="btn" :disabled="busy" @click="send">{{ busy ? t('loading') : t('formSend') }}</button>
          </div>
          <p class="tiny muted center">{{ t('formPrivacy') }}</p>
        </template>
      </template>
    </main>
  </div>
</template>

<style scoped>
.pform{min-height:100dvh; background:var(--bg); color:var(--ink); font-family:var(--font); --accent:var(--logo-green); --accent-deep:#27473A; --accent-soft:#E2EEE7; --btn-shadow:rgba(59,100,82,.3); --note-border:#A9C9B8}
header{display:flex; align-items:center; gap:12px; padding:calc(14px + env(safe-area-inset-top)) 18px 14px; background:var(--grad-auth); color:#fff}
header img{width:44px; height:44px; object-fit:contain}
header b{display:block; font-size:16px}
header span{font-size:12px; opacity:.8}
main{max-width:640px; margin:0 auto; padding:18px 16px 48px; display:flex; flex-direction:column; gap:14px}
h1{margin:4px 0 0; font-size:22px; line-height:1.25}
.intro{margin:0; font-size:14px; line-height:1.55; white-space:pre-wrap}
.mod{display:flex; flex-direction:column; gap:16px; padding:18px 16px}
h2{margin:0; font-size:16px; color:var(--accent-deep)}
.desc{margin:-8px 0 0; font-size:13px; color:var(--muted); line-height:1.5; white-space:pre-wrap}
.q{display:flex; flex-direction:column; gap:6px}
.ql{font-size:14px; font-weight:650; line-height:1.35}
.req{color:var(--danger); margin-left:3px}
.help{font-size:12px; color:var(--muted); margin-top:-3px; line-height:1.4}
.opts{display:flex; flex-direction:column; gap:7px}
.yn{display:grid; grid-template-columns:1fr 1fr; gap:8px}
.yn .opt{justify-content:center; font-weight:650}
.opt{display:flex; align-items:center; gap:10px; border:1.5px solid var(--line); border-radius:12px; padding:11px 12px; font-size:14px; cursor:pointer; background:#fff}
.opt.on{border-color:var(--accent); background:var(--accent-soft)}
.opt input, .tick input{width:19px; height:19px; accent-color:var(--accent); flex:none; margin:0}
.tick{display:flex; gap:11px; align-items:flex-start; font-size:13.5px; line-height:1.5; cursor:pointer}
.tick input{margin-top:2px}
.bad .in, .bad .opt, .tick.bad{border-color:var(--danger)}
.tick.bad{color:var(--danger)}
.err{font-size:12px; color:var(--danger); font-weight:600}
.center{text-align:center}
select.in{appearance:auto}
.msg{text-align:center; padding:28px 18px; font-size:14px; line-height:1.5}
.msg.ok b{display:block; font-size:18px; margin:6px 0}
.msg.ok p{margin:0; color:var(--muted); white-space:pre-wrap}
.big{font-size:44px}
.progress{display:flex; align-items:center; gap:10px}
.track{flex:1; height:6px; border-radius:3px; background:rgba(59,100,82,.15); overflow:hidden}
.track i{display:block; height:100%; background:var(--accent); border-radius:3px; transition:width .3s ease}
.progress span{flex:none; font-size:11.5px; color:var(--muted); font-weight:600}
.nav{display:flex; gap:10px}
.nav .btn{flex:1}
.more .copies{display:flex; flex-direction:column; gap:7px}
.copy{display:flex; align-items:center; gap:9px; border:1.5px solid var(--line); border-radius:12px; padding:9px 11px; background:#fff}
.copy .cn{flex:none; width:24px; height:24px; border-radius:50%; background:var(--accent-soft); color:var(--accent-deep); font-size:12px; font-weight:800; display:grid; place-items:center}
.copy b{flex:1; min-width:0; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.copy small{font-weight:500; color:var(--muted)}
.copy .chip{flex:none}
.copy .x{color:var(--danger)}
.ask{margin:4px 0 0; font-size:15px; font-weight:700; text-align:center}
.yn2{display:flex; flex-direction:column; gap:8px}
.hp{position:absolute; left:-9999px; width:1px; height:1px; opacity:0}
/* the sent screen fills the page under the header and sits in its middle */
.pform.finished{display:flex; flex-direction:column}
.pform.finished main{flex:1; justify-content:center; width:100%}
.sent{background:#fff; border-radius:24px; box-shadow:0 18px 50px -24px rgba(30,70,140,.35); padding:36px 24px 28px; text-align:center;
  display:flex; flex-direction:column; align-items:center; gap:8px; animation:sent-in .5s cubic-bezier(.2,.9,.3,1.2) both}
@keyframes sent-in{from{opacity:0; transform:translateY(14px) scale(.97)}}
.seal{width:76px; height:76px; margin-bottom:8px}
.seal svg{width:100%; height:100%; display:block}
.seal circle{fill:var(--accent-soft); stroke:var(--accent); stroke-width:3}
.seal path{fill:none; stroke:var(--accent-deep); stroke-width:5; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:40; stroke-dashoffset:40; animation:sent-tick .45s .35s ease-out forwards}
@keyframes sent-tick{to{stroke-dashoffset:0}}
.sent .form-name{font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--muted)}
.sent h1{margin:0; font-size:24px; line-height:1.25; letter-spacing:-.01em; color:var(--ink)}
.sent .thanks{margin:4px 0 0; max-width:440px; font-size:15px; line-height:1.55; color:#4A5A70; white-space:pre-line}
.sent .when{margin-top:14px; padding:7px 14px; border-radius:999px; background:var(--accent-soft); color:var(--accent-deep); font-size:13px; font-weight:600}
.sent .copyto{margin-top:6px; font-size:13px; color:#4A5A70; line-height:1.5; overflow-wrap:anywhere}
.sent .copyto b{color:var(--ink)}
.sent .close{margin-top:10px; font-size:12px; color:var(--muted)}
@media (prefers-reduced-motion: reduce){.sent, .seal path{animation:none; stroke-dashoffset:0}}
</style>
