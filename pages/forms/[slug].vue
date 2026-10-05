<script setup lang="ts">
/* A form, as anyone with its link fills it in — on forms.scouts30.org, or at
   /forms/<link> in the app, where an administrator can also preview one that
   is still closed. One section per page, as Google Forms does it: Επόμενο
   checks only that page, conditions decide which sections are in the run,
   and the last page holds the tickboxes, the signature and the send. The
   phone's back button steps back a page rather than leaving the form. */
import { checkAnswers, visibleParts, type FormSpec } from '~/utils/formSpec'
const { t } = useI18n()
const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const data = ref<any>(null)
const loadError = ref('')
async function load() {
  if (!slug.value) { loadError.value = t('formNotFound'); return }
  try {
    data.value = await $fetch(`/api/forms/public/${encodeURIComponent(slug.value)}`, { query: route.query.preview ? { preview: 1 } : {} })
  } catch (e: any) { loadError.value = e?.statusCode === 404 ? t('formNotFound') : (e?.data?.message || t('error')) }
}
onMounted(load)
useHead(() => ({ title: data.value?.titleEl ? `${data.value.titleEl} · 30ό Σύστημα Προσκόπων` : '30ό Σύστημα Προσκόπων' }))

const spec = computed<FormSpec | null>(() => data.value?.spec || null)
const answers = reactive<Record<string, any>>({})
const ticks = reactive<Record<string, boolean>>({})
const signature = ref<string | null>(null)
const website = ref('') // only a bot fills this in
watch(spec, sp => {
  for (const m of sp?.modules || []) for (const q of m.questions)
    if (!(q.id in answers)) answers[q.id] = q.type === 'checkbox' ? [] : ''
  for (const x of sp?.ticks || []) if (!(x.id in ticks)) ticks[x.id] = false
}, { immediate: true })

/* what these answers show: a module or question with a condition appears
   the moment the answer it depends on is given, and goes again if it changes */
const shown = computed(() => spec.value ? visibleParts(spec.value, answers) : { modules: new Set<string>(), questions: new Set<string>() })
const errors = ref<Record<string, string>>({})
const busy = ref(false)
const done = ref<{ thanks?: string } | null>(null)
const sendError = ref('')
const errText = (code: string) => t('formErr_' + code)

const payload = () => ({ answers: { ...answers }, ticks: { ...ticks }, signature: signature.value, website: website.value })
/* a problem shown clears the moment it is put right; none new appear until
   the next Επόμενο */
watch([answers, ticks, signature], () => {
  if (!spec.value || !Object.keys(errors.value).length) return
  const now = checkAnswers(spec.value, payload()).errors
  errors.value = Object.fromEntries(Object.entries(now).filter(([k]) => k in errors.value))
}, { deep: true })

/* the pages: each section the answers so far lead to, then the end — the
   tickboxes and the signature — if the form has any */
type Page = { kind: 'module', m: FormSpec['modules'][number] } | { kind: 'end' }
const pages = computed<Page[]>(() => {
  const sp = spec.value
  if (!sp) return []
  const list: Page[] = sp.modules.filter(m => shown.value.modules.has(m.id)).map(m => ({ kind: 'module' as const, m }))
  if (sp.ticks.length || sp.signature.enabled || !list.length) list.push({ kind: 'end' })
  return list
})
const idsOf = (p: Page) => p.kind === 'module'
  ? p.m.questions.filter(q => shown.value.questions.has(q.id)).map(q => q.id)
  : [...(spec.value?.ticks || []).map(x => x.id), 'signature']

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
    sendError.value = e?.data?.message || t('error')
  } finally { busy.value = false }
}
function toggleOption(id: string, o: string) {
  const list: string[] = answers[id]
  answers[id] = list.includes(o) ? list.filter(x => x !== o) : [...list, o]
}
const INPUT_TYPE: Record<string, string> = { text: 'text', number: 'text', email: 'email', phone: 'tel', date: 'date' }
const INPUT_MODE: Record<string, string> = { number: 'decimal', phone: 'tel', email: 'email' }
</script>

<template>
  <div class="pform">
    <header>
      <img src="/images/logo-256.png" alt="">
      <div><b>30ό Σύστημα Προσκόπων</b><span>Αμμοχώστου</span></div>
    </header>
    <main>
      <div v-if="loadError" class="card msg">{{ loadError }}</div>
      <div v-else-if="!data" class="card msg muted">{{ t('loading') }}</div>
      <template v-else-if="done">
        <div class="card msg ok">
          <div class="big">✅</div>
          <b>{{ t('formSentTitle') }}</b>
          <p>{{ done.thanks || t('formSentText') }}</p>
        </div>
      </template>
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

          <section v-if="page?.kind === 'module'" :key="page.m.id" class="card mod">
            <h2 v-if="page.m.title">{{ page.m.title }}</h2>
            <p v-if="page.m.description" class="desc">{{ page.m.description }}</p>
            <div v-for="q in page.m.questions.filter(x => shown.questions.has(x.id))" :key="q.id" class="q" :class="{ bad: errors[q.id] }">
              <label class="ql" :for="'q' + q.id">{{ q.label }}<span v-if="q.required" class="req">*</span></label>
              <div v-if="q.help" class="help">{{ q.help }}</div>

              <textarea v-if="q.type === 'textarea'" :id="'q' + q.id" v-model="answers[q.id]" class="in" rows="4" />
              <select v-else-if="q.type === 'select'" :id="'q' + q.id" v-model="answers[q.id]" class="in">
                <option value="" disabled>{{ t('formChoose') }}</option>
                <option v-for="o in q.options" :key="o" :value="o">{{ o }}</option>
              </select>
              <div v-else-if="q.type === 'yesno'" class="yn">
                <label v-for="o in q.options" :key="o" class="opt" :class="{ on: answers[q.id] === o }">
                  <input v-model="answers[q.id]" type="radio" :name="'q' + q.id" :value="o"><span>{{ o }}</span>
                </label>
              </div>
              <div v-else-if="q.type === 'radio'" class="opts">
                <label v-for="o in q.options" :key="o" class="opt" :class="{ on: answers[q.id] === o }">
                  <input v-model="answers[q.id]" type="radio" :name="'q' + q.id" :value="o"><span>{{ o }}</span>
                </label>
              </div>
              <div v-else-if="q.type === 'checkbox'" class="opts">
                <label v-for="o in q.options" :key="o" class="opt" :class="{ on: answers[q.id].includes(o) }">
                  <input type="checkbox" :checked="answers[q.id].includes(o)" @change="toggleOption(q.id, o)"><span>{{ o }}</span>
                </label>
              </div>
              <input v-else :id="'q' + q.id" v-model="answers[q.id]" class="in" :type="INPUT_TYPE[q.type]"
                     :inputmode="INPUT_MODE[q.type] as any" :autocomplete="q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : 'off'">
              <div v-if="errors[q.id]" class="err">{{ errText(errors[q.id]) }}</div>
            </div>
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
          </section>

          <!-- for bots only: people never see it -->
          <input v-model="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">

          <div v-if="Object.keys(errors).length" class="err center">{{ t('formFixErrors') }}</div>
          <div v-if="sendError" class="err center">{{ sendError }}</div>
          <div class="nav">
            <button v-if="step > 0" class="btn ghost" @click="back">‹ {{ t('formBack') }}</button>
            <button v-if="!isLast" class="btn" @click="next">{{ t('formNext') }} ›</button>
            <button v-else class="btn" :disabled="busy" @click="send">{{ busy ? t('loading') : t('formSend') }}</button>
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
.hp{position:absolute; left:-9999px; width:1px; height:1px; opacity:0}
</style>
