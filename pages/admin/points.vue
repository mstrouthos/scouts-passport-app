<script setup lang="ts">
const { t } = useI18n()
const me = useMe()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/settings/points')
const isTroop = computed(() => me.value?.role === 'troop_leader')
const form = reactive({ present: 5, excused: 0, absent: 0, uniformFull: 5, uniformPartial: 0, uniformNone: 0 })
watch(data, v => { if (v) Object.assign(form, v) }, { immediate: true })
const busy = ref(false)
async function save() {
  busy.value = true
  try {
    await $fetch('/api/admin/settings/points', { method: 'PATCH', body: { ...form } })
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
/* Attendance and uniform are scored separately, so they are grouped that way. */
const ATTENDANCE = [
  ['present', 'ptsPresentL'], ['excused', 'ptsExcusedL'], ['absent', 'ptsAbsentL']
] as const
const UNIFORM = [
  ['uniformFull', 'ptsUniformL'], ['uniformPartial', 'ptsUniformPartialL'], ['uniformNone', 'ptsUniformNoneL']
] as const
</script>

<template>
  <AppShell :title="t('pointRules')" :sub="t('pointRulesSub')" back="/admin/more">
    <div class="sec-title">{{ t('attendance') }}</div>
    <div class="card" style="display:flex;flex-direction:column;gap:12px">
      <div v-for="[key, label] in ATTENDANCE" :key="key" style="display:flex;align-items:center;gap:12px">
        <label class="lab" style="flex:1;margin:0">{{ t(label) }}</label>
        <input v-model.number="form[key]" type="number" class="in" style="width:96px;text-align:center"
               :disabled="!isTroop">
      </div>
    </div>

    <div class="sec-title">{{ t('uniform') }}</div>
    <div class="card" style="display:flex;flex-direction:column;gap:12px">
      <div v-for="[key, label] in UNIFORM" :key="key" style="display:flex;align-items:center;gap:12px">
        <label class="lab" style="flex:1;margin:0">{{ t(label) }}</label>
        <input v-model.number="form[key]" type="number" class="in" style="width:96px;text-align:center"
               :disabled="!isTroop">
      </div>
    </div>
    <div class="tiny muted">{{ t('pointRulesNote') }}</div>
    <button v-if="isTroop" class="btn" :disabled="busy" @click="save">{{ busy ? t('loading') : t('save') }}</button>
    <div v-else class="tiny muted">{{ t('rolesNote') }}</div>
  </AppShell>
</template>
