<script setup lang="ts">
import { scoutYearLabel } from '~/utils/scoutYear'
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
/* a registration's children, picked by a leader */
const linking = ref<number[] | null>(null)
const openLink = () => { linking.value = r.value.registration.children.map((k: any) => k.id) }
async function linkOne(kid: number) {
  linking.value = [...r.value.registration.children.map((k: any) => k.id), kid]
  await saveLink()
}
const toggleKid = (id: number) => { linking.value = linking.value!.includes(id) ? linking.value!.filter(x => x !== id) : [...linking.value!, id] }
async function saveLink() {
  try {
    await $fetch(`/api/admin/forms/responses/${id.value}/children`, { method: 'PUT', body: { scoutIds: linking.value } })
    linking.value = null
    await refreshNuxtData()
    show('✅ ' + t('saved'))
  } catch (e: any) { show(errMsg(e)) }
}
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
      <!-- a registration: whom it registers — set by the parent's pick, or here -->
      <div v-if="r.registration" class="card regcard noprint">
        <div class="tiny muted">📋 {{ t('formRegistersFor', { year: scoutYearLabel(r.registration.year) }) }}</div>
        <div class="kids">
          <span v-for="k in r.registration.children" :key="k.id" class="chip on">✅ {{ k.name }}<small v-if="k.auto"> · 🔎 {{ t('formAutoMatched') }}</small></span>
          <span v-if="!r.registration.children.length" class="tiny warnline">⚠️ {{ t('formRegistersNone') }}</span>
        </div>
        <!-- names typed on a plain link that are not linked yet: the likely ones, a tap each -->
        <div v-for="x in r.registration.typed.filter((x: any) => !x.linkedTo)" :key="x.name" class="typed">
          <div class="tiny"><b>✍️ «{{ x.name }}»</b> — {{ t('formTypedNotLinked') }}</div>
          <div class="kids">
            <button v-for="sg in x.suggestions" :key="sg.id" class="chip" @click="linkOne(sg.id)">➕ {{ sg.name }} <small>{{ sg.section }}</small></button>
            <span v-if="!x.suggestions.length" class="tiny muted">{{ t('formNoSuggestion') }}</span>
          </div>
        </div>
        <button class="chip" @click="openLink">✎ {{ t('formLinkChildren') }}</button>
      </div>
      <FormAnswers :r="r" :fetch-file="fetchFormFile" />

      <Teleport to="body">
        <div v-if="linking" class="sheet-backdrop" @click.self="linking = null">
          <div class="sheet" style="max-height:86dvh;overflow:auto;display:flex;flex-direction:column;gap:10px">
            <h3 style="margin:0;font-size:17px;text-align:center">{{ t('formLinkChildren') }}</h3>
            <div class="tiny muted" style="text-align:center">{{ t('formLinkChildrenNote') }}</div>
            <label v-for="k in r.registration.options" :key="k.id" class="pick" :class="{ on: linking.includes(k.id) }">
              <input type="checkbox" :checked="linking.includes(k.id)" @change="toggleKid(k.id)">
              <span><b>{{ k.name }}</b><small>{{ k.section }}</small></span>
            </label>
            <button class="btn" @click="saveLink">{{ t('save') }}</button>
            <button class="btn ghost" @click="linking = null">{{ t('close') }}</button>
          </div>
        </div>
      </Teleport>

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
.regcard{display:flex; flex-direction:column; gap:8px; margin-bottom:10px}
.regcard .kids{display:flex; flex-wrap:wrap; gap:6px}
.regcard .typed{display:flex; flex-direction:column; gap:6px; background:#FFF4E0; border-radius:12px; padding:8px 10px}
.regcard small{opacity:.75}
.regcard > .chip{align-self:flex-start}
.warnline{color:#B26A00; font-weight:600}
.pick{display:flex; align-items:center; gap:10px; background:var(--card, #fff); border-radius:12px; padding:9px 12px; cursor:pointer}
.pick.on{box-shadow:inset 0 0 0 2px var(--green, #2E7D5B)}
.pick input{width:18px; height:18px}
.pick span{display:flex; flex-direction:column}
.pick small{font-size:11.5px; color:var(--muted)}
</style>
