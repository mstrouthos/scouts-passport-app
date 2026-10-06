<script setup lang="ts">
/* One form response in full, as it was sent: every module's questions and
   answers, their uploads, the tickboxes, the signature with who signed and
   when. As a PDF — to keep, or to print straight from here — with every
   photo in place and any uploaded PDFs appended. Opening it is recorded. */
const { t, locale } = useI18n()
const me = useMe()
const { show } = useToast()
const route = useRoute()
const id = computed(() => Number(route.params.id))
const { data: r } = await useFetch<any>(() => `/api/admin/forms/responses/${id.value}`)
const stamp = (iso: string) => `${fmtDate(iso, locale.value)} · ${fmtTime(iso)}`

async function remove() {
  if (!confirm(t('formDeleteResponseQ'))) return
  await $fetch(`/api/admin/forms/responses/${id.value}`, { method: 'DELETE' })
  show('🗑️ ' + t('deleted'))
  await navigateTo(`/admin/forms/${r.value.formId}?tab=responses`, { replace: true })
}
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
  } catch (e: any) { show(errMsg(e)) } finally { making.value = '' }
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
  } catch (e: any) { show(errMsg(e)); window.print() } finally { making.value = '' }
}

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

      <div v-if="r.fromParent" class="note noprint">📱 {{ t('formFromParent', { name: r.fromParent }) }}</div>
      <FormAnswers :r="r" :fetch-file="fetchFormFile" />

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
.tools{display:flex; flex-direction:column; gap:8px}
.print-head{display:none}
@media print {
  .noprint{display:none !important}
  .print-head{display:flex; flex-direction:column; gap:2px; margin-bottom:8px}
  .print-head b{font-size:18px}
}
</style>
