<script setup lang="ts">
/* One form response in full, as it was sent: every module's questions and
   answers, the tickboxes, the signature. Printable, so a paper copy can go
   in the file. Opening it is recorded. */
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
const print = () => window.print()
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
          <div class="a" :class="{ none: !shown(r.data.answers?.[q.id]) }">{{ shown(r.data.answers?.[q.id], q.type) || '—' }}</div>
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
        </div>
      </section>

      <div class="tools noprint">
        <button class="btn ghost" @click="print">🖨️ {{ t('formPrint') }}</button>
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
.print-head{display:none}
@media print {
  .noprint{display:none !important}
  .print-head{display:flex; flex-direction:column; gap:2px; margin-bottom:8px}
  .print-head b{font-size:18px}
  .card{box-shadow:none; border:1px solid #ddd; break-inside:avoid}
}
</style>
