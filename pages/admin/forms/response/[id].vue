<script setup lang="ts">
/* One form response in full, as it was sent: every module's questions and
   answers, their uploads, the tickboxes, the signature with who signed and
   when. As a PDF — to keep, or to print straight from here — with every
   photo in place and any uploaded PDFs appended. Opening it is recorded. */
import { answerText, visibleParts } from '~/utils/formSpec'
const { t, locale } = useI18n()
const me = useMe()
const { show } = useToast()
const route = useRoute()
if (me.value && me.value.role !== 'troop_leader') navigateTo('/admin/more', { replace: true })
const id = computed(() => Number(route.params.id))
const { data: r } = await useFetch<any>(() => `/api/admin/forms/responses/${id.value}`)
const stamp = (iso: string) => `${fmtDate(iso, locale.value)} · ${fmtTime(iso)}`

async function remove() {
  if (!confirm(t('formDeleteResponseQ'))) return
  await $fetch(`/api/admin/forms/responses/${id.value}`, { method: 'DELETE' })
  show('🗑️ ' + t('deleted'))
  await navigateTo(`/admin/forms/${r.value.formId}?tab=responses`, { replace: true })
}
const shown = (v: unknown, type?: any) => answerText(v, type).trim()
/* the PDF is made on the server, kept with the form's files, and fetched */
const making = ref<'' | 'pdf' | 'print'>('')
async function makePdf() {
  const f = await $fetch<{ fileId: number, name: string }>(`/api/admin/forms/responses/${id.value}/pdf`, { method: 'POST' })
  return { ...f, blob: await fetchFormFile(f.fileId) }
}
async function downloadPdf() {
  making.value = 'pdf'
  try {
    const f = await makePdf()
    const url = URL.createObjectURL(f.blob)
    const a = document.createElement('a')
    a.href = url; a.download = f.name
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  } catch (e: any) { show(e?.data?.message || t('error')) } finally { making.value = '' }
}
/* printing is the same PDF, handed to the browser's print dialog; where a
   browser will not print a PDF that way, the page itself is printed */
async function print() {
  making.value = 'print'
  try {
    const f = await makePdf()
    const url = URL.createObjectURL(f.blob)
    const frame = document.createElement('iframe')
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    frame.src = url
    frame.onload = () => {
      try { frame.contentWindow!.focus(); frame.contentWindow!.print() } catch { window.print() }
      setTimeout(() => { frame.remove(); URL.revokeObjectURL(url) }, 60_000)
    }
    document.body.appendChild(frame)
  } catch (e: any) { show(e?.data?.message || t('error')); window.print() } finally { making.value = '' }
}

/* uploaded photos shown in place, fetched with the session like the rest */
const previews = reactive<Record<number, string>>({})
watch(r, async v => {
  for (const f of Object.values<any>(v?.files || {}))
    if (f.mime.startsWith('image/') && !previews[f.id]) {
      try { previews[f.id] = URL.createObjectURL(await fetchFormFile(f.id)) } catch {}
    }
}, { immediate: true })
onUnmounted(() => Object.values(previews).forEach(u => URL.revokeObjectURL(u)))
const filesOf = (v: unknown) => (Array.isArray(v) ? v : []).map(k => r.value?.files?.[k]).filter(Boolean)
const kb = (n: number) => n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'
const when = (iso: string) => new Date(iso).toLocaleString(locale.value === 'en' ? 'en-GB' : 'el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
/* only what this person was asked: sections their answers skipped are left out */
const seen = computed(() => r.value ? visibleParts(r.value.spec, r.value.data.answers || {}) : null)
</script>

<template>
  <AppShell :title="r?.formTitle || t('forms')" :sub="r ? `#${r.id} · ${stamp(r.createdAt)}` : ''"
            :back="r ? `/admin/forms/${r.formId}?tab=responses` : '/admin/forms'">
    <template v-if="r">
      <div class="nav noprint">
        <NuxtLink v-if="r.newer" :to="`/admin/forms/response/${r.newer}`" class="chip" replace>‹ {{ t('newer') }}</NuxtLink>
        <span class="tiny muted" style="flex:1;text-align:center">{{ r.position }} / {{ r.total }}</span>
        <NuxtLink v-if="r.older" :to="`/admin/forms/response/${r.older}`" class="chip" replace>{{ t('older') }} ›</NuxtLink>
      </div>

      <div class="print-head">
        <b>{{ r.formTitle }}</b>
        <span>#{{ r.id }} · {{ stamp(r.createdAt) }}</span>
      </div>

      <section v-for="m in r.spec.modules.filter((x: any) => seen?.modules.has(x.id))" :key="m.id" class="card mod">
        <h2 v-if="m.title">{{ m.title }}</h2>
        <div v-for="q in m.questions.filter((x: any) => seen?.questions.has(x.id))" :key="q.id" class="qa">
          <div class="q">{{ q.label }}</div>
          <div v-if="q.type === 'file'" class="files">
            <div v-if="!filesOf(r.data.answers?.[q.id]).length" class="a none">—</div>
            <div v-for="f in filesOf(r.data.answers?.[q.id])" :key="f.id" class="file">
              <img v-if="previews[f.id]" :src="previews[f.id]" alt="" class="thumb">
              <div class="frow">
                <span>{{ f.mime === 'application/pdf' ? '📄' : '🖼️' }} <b>{{ f.name }}</b> <small>{{ kb(f.size) }}</small></span>
                <button class="chip noprint" @click="downloadFormFile(f.id, f.name)">⬇️</button>
              </div>
            </div>
          </div>
          <div v-else class="a" :class="{ none: !shown(r.data.answers?.[q.id]) }">{{ shown(r.data.answers?.[q.id], q.type) || '—' }}</div>
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

      <div class="tools noprint">
        <button class="btn" :disabled="!!making" @click="downloadPdf">{{ making === 'pdf' ? t('loading') : '📄 ' + t('formPdf') }}</button>
        <button class="btn ghost" :disabled="!!making" @click="print">{{ making === 'print' ? t('loading') : '🖨️ ' + t('formPrint') }}</button>
        <button class="btn danger" @click="remove">🗑 {{ t('formDeleteResponse') }}</button>
      </div>
    </template>
  </AppShell>
</template>

<style scoped>
.nav{display:flex; align-items:center; gap:8px}
.nav .chip{text-decoration:none}
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
.tools{display:flex; flex-direction:column; gap:8px}
.files{display:flex; flex-direction:column; gap:8px}
.file{display:flex; flex-direction:column; gap:6px}
.thumb{max-width:100%; max-height:260px; object-fit:contain; align-self:flex-start; border-radius:12px; border:1px solid var(--line); background:#fff}
.frow{display:flex; align-items:center; gap:8px; font-size:13px}
.frow span{flex:1; min-width:0; overflow-wrap:anywhere}
.frow small{color:var(--muted)}
.signer{font-size:13px; color:var(--muted)}
.signer b{color:var(--ink)}
.print-head{display:none}
@media print {
  .noprint{display:none !important}
  .print-head{display:flex; flex-direction:column; gap:2px; margin-bottom:8px}
  .print-head b{font-size:18px}
  .card{box-shadow:none; border:1px solid #ddd; break-inside:avoid}
}
</style>
