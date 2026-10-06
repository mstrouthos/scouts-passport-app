<script setup lang="ts">
/* A form's answers as they were sent, read-only: every section the sender
   was shown, with their uploads (photos in place), the tickboxes and the
   signature. For the leaders reading a response, and for the parent reading
   their own; each fetches the files its own way. */
import { answerText, visibleParts, instanceTitle, gapParts } from '~/utils/formSpec'
const props = defineProps<{ r: any, fetchFile: (id: number) => Promise<Blob> }>()
const { t, locale } = useI18n()
const shown = (v: unknown, type?: any) => answerText(v, type).trim()

/* uploaded photos shown in place, fetched with the session like the rest */
const previews = reactive<Record<number, string>>({})
watch(() => props.r, async v => {
  for (const f of Object.values<any>(v?.files || {}))
    if (f.mime.startsWith('image/') && !previews[f.id]) {
      try { previews[f.id] = URL.createObjectURL(await props.fetchFile(f.id)) } catch {}
    }
}, { immediate: true })
onUnmounted(() => Object.values(previews).forEach(u => URL.revokeObjectURL(u)))
async function download(id: number, name: string) {
  const url = URL.createObjectURL(await props.fetchFile(id))
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
const filesOf = (v: unknown) => (Array.isArray(v) ? v : []).map(k => props.r?.files?.[k]).filter(Boolean)
const kb = (n: number) => n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'
const when = (iso: string) => new Date(iso).toLocaleString(locale.value === 'en' ? 'en-GB' : 'el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
/* only what this person was asked: sections their answers skipped are left out */
const seen = computed(() => props.r ? visibleParts(props.r.spec, props.r.data.answers || {}, props.r.data.repeats) : null)
</script>

<template>
  <div class="answers">
    <!-- each section as it was answered: a repeated one once per child -->
    <section v-for="inst in seen?.shown || []" :key="inst.key" class="card mod">
      <h2 v-if="instanceTitle(inst)">{{ instanceTitle(inst) }}</h2>
      <div v-for="q in inst.m.questions.filter((x: any) => seen?.questions.has(x.id + inst.sfx))" :key="q.id" class="qa">
        <!-- the sentence completed, each answer picked out where its blank was -->
        <div v-if="q.type === 'gaps'" class="a gapsA">
          <template v-for="(p, k) in gapParts(q.label)" :key="k"><template v-if="'text' in p">{{ p.text }}</template><mark v-else>{{ r.data.answers?.[q.id + inst.sfx]?.[p.gap] || '___' }}</mark></template>
        </div>
        <template v-else>
        <div class="q">{{ q.label }}</div>
        <div v-if="q.type === 'file'" class="files">
          <div v-if="!filesOf(r.data.answers?.[q.id + inst.sfx]).length" class="a none">—</div>
          <div v-for="f in filesOf(r.data.answers?.[q.id + inst.sfx])" :key="f.id" class="file">
            <img v-if="previews[f.id]" :src="previews[f.id]" alt="" class="thumb">
            <div class="frow">
              <span>{{ f.mime === 'application/pdf' ? '📄' : '🖼️' }} <b>{{ f.name }}</b> <small>{{ kb(f.size) }}</small></span>
              <button class="chip noprint" @click="download(f.id, f.name)">⬇️</button>
            </div>
          </div>
        </div>
        <div v-else class="a" :class="{ none: !shown(r.data.answers?.[q.id + inst.sfx]) }">{{ shown(r.data.answers?.[q.id + inst.sfx], q.type) || '—' }}</div>
        </template>
      </div>
    </section>

    <section v-if="r.spec.ticks.length || r.spec.signature.enabled" class="card mod">
      <div v-for="x in r.spec.ticks" :key="x.id" class="tick">
        <span class="box" :class="{ on: r.data.ticks?.[x.id] }">{{ r.data.ticks?.[x.id] ? '✔' : '' }}</span>
        <span>{{ x.label }}</span>
      </div>
      <div v-if="r.spec.signature.enabled" class="qa">
        <div class="q">{{ r.spec.signature.label || t('formSignature') }}</div>
        <img v-if="r.data.signature" :src="r.data.signature" class="sig" alt="">
        <div v-else class="a none">—</div>
        <div v-if="r.data.signerName" class="signer">{{ t('formSignerName') }}: <b>{{ r.data.signerName }}</b></div>
        <div v-if="r.data.signedAt" class="signer">{{ t('formSignedOn') }}: <b>{{ when(r.data.signedAt) }}</b></div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* its sections sit straight in the page's (or sheet's) own column */
.answers{display:contents}
.mod{display:flex; flex-direction:column; gap:12px}
h2{margin:0; font-size:15px; color:var(--accent-deep)}
.qa{display:flex; flex-direction:column; gap:3px}
.q{font-size:11.5px; color:var(--muted); font-weight:600}
.a{font-size:14px; font-weight:600; white-space:pre-wrap; overflow-wrap:anywhere}
.a.none{color:var(--muted); font-weight:400}
.tick{display:flex; gap:10px; align-items:flex-start; font-size:13px; line-height:1.45}
.box{flex:none; width:20px; height:20px; border-radius:6px; border:1.5px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:12px; color:#fff}
.box.on{background:var(--green); border-color:var(--green)}
.sig{max-width:100%; height:auto; max-height:170px; border:1px solid var(--line); border-radius:12px; background:#fff; align-self:flex-start}
.files{display:flex; flex-direction:column; gap:8px}
.file{display:flex; flex-direction:column; gap:6px}
.thumb{max-width:100%; max-height:260px; object-fit:contain; align-self:flex-start; border-radius:12px; border:1px solid var(--line); background:#fff}
.frow{display:flex; align-items:center; gap:8px; font-size:13px}
.frow span{flex:1; min-width:0; overflow-wrap:anywhere}
.frow small{color:var(--muted)}
.signer{font-size:13px; color:var(--muted)}
.signer b{color:var(--ink)}
.gapsA{white-space:pre-line; font-weight:500; line-height:1.7}
.gapsA mark{background:var(--accent-soft, #E2EEE7); color:var(--ink); font-weight:750; padding:0 5px; border-radius:5px}
@media print {
  .noprint{display:none !important}
  .card{box-shadow:none; border:1px solid #ddd; break-inside:avoid}
}
</style>
