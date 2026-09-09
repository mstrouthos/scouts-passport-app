<script setup lang="ts">
/* Διαγραμμένα: members trashed in the last 30 days, who did it and when, and
   the day the cron removes them for good. Restore hands back a fresh code;
   the Αρχηγός Συστήματος may also remove one now. */
const { t, locale } = useI18n()
const name = useName()
const me = useMe()
const { show } = useToast()
const { data, refresh } = await useFetch<any[]>('/api/admin/trash')
const restored = ref<{ id: number, passcode: string } | null>(null)
const busy = ref(false)
async function restore(r: any) {
  if (busy.value) return
  busy.value = true
  try {
    const res = await $fetch<any>(`/api/admin/scouts/${r.id}/restore`, { method: 'POST' })
    restored.value = { id: r.id, passcode: res.passcode }
    await refresh(); show('✅ ' + t('restored'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
async function purgeNow(r: any) {
  if (!confirm(t('confirmPurge', { name: name(r) }))) return
  try {
    await $fetch(`/api/admin/scouts/${r.id}?permanent=1`, { method: 'DELETE' })
    await refresh(); show('🗑️ ' + t('deleted'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="t('trash')" :sub="t('trashSub')" back="/admin/more">
    <div v-if="restored" class="note" style="text-align:center">
      <b>{{ t('passcodeIs') }} <span style="font-variant-numeric:tabular-nums">{{ restored.passcode }}</span></b>
      {{ t('writeItDown') }}
    </div>
    <div v-if="data?.length" class="adm">
      <div v-for="r in data" :key="r.id" class="it" style="align-items:flex-start">
        <div style="flex:1;min-width:0">
          <b>{{ name(r) }}<span v-if="r.role !== 'scout'" class="tiny muted"> · {{ t('vathmoforoi') }}</span></b>
          <span>
            {{ r.sectionEl || '—' }} · {{ t('trashedBy', { who: r.deletedBy || '—', when: fmtDate(r.deletedAt, locale) }) }}
            <br>{{ t('purgesOn', { when: fmtDate(r.purgeAt, locale) }) }}
          </span>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;flex:none">
          <button class="chip" :disabled="busy" @click="restore(r)">↩︎ {{ t('restore') }}</button>
          <button v-if="me?.role === 'troop_leader'" class="chip" style="color:var(--danger)" @click="purgeNow(r)">✕ {{ t('deleteNow') }}</button>
        </div>
      </div>
    </div>
    <div v-else class="empty">{{ t('trashEmpty') }}</div>
  </AppShell>
</template>
