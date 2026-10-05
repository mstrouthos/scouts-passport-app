<script setup lang="ts">
/* Scoring rules, per section. Each section's Αρχηγός sets the points for
   attendance and uniform in their own section, and how its units are ranked —
   by the sum of their members' points or the average per member. The whole
   troop's values, which an administrator sets, are the default for a section
   that has set none of its own. */
const { t } = useI18n()
const lx = useLx()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/settings/points')

/* Which rules are open: a section's id, or null for the whole troop's. Kept
   in the address, so a reload reopens the same section — reopening on
   another one showed its values instead, and a save looked undone. */
const route = useRoute()
const router = useRouter()
const fromQuery = () => route.query.for === 'troop' ? null : Number(route.query.for) || undefined
const target = ref<number | null>(fromQuery() ?? null)
watch(data, v => {
  if (!v) return
  const ids = (v.sections || []).map((x: any) => x.id)
  const wanted = fromQuery()
  if (wanted !== undefined && (wanted === null ? v.canEditTroop : ids.includes(wanted))) target.value = wanted
  else if (target.value === null ? !v.canEditTroop : !ids.includes(target.value)) target.value = ids[0] ?? null
}, { immediate: true })
watch(target, v => { router.replace({ query: { ...route.query, for: v === null ? 'troop' : String(v) } }) })
const targetName = computed(() => section.value ? lx(section.value, 'name') : t('troopDefaults'))
const section = computed(() => (data.value?.sections || []).find((x: any) => x.id === target.value) || null)

const canEdit = computed(() => section.value ? section.value.canEdit : !!data.value?.canEditTroop)

const form = reactive({ present: 5, excused: 0, absent: 0, uniformFull: 5, uniformPartial: 0, uniformNone: 0 })
const teamScoring = ref<'sum' | 'average'>('average')
watch([data, target], () => {
  const src = section.value ? section.value.rules : data.value?.troop
  if (src) Object.assign(form, src)
  if (section.value) teamScoring.value = section.value.teamScoring
}, { immediate: true })

const busy = ref(false)
async function save(extra: Record<string, any> = {}) {
  busy.value = true
  try {
    await $fetch('/api/admin/settings/points', {
      method: 'PATCH',
      body: { sectionId: target.value, ...form, ...(section.value ? { teamScoring: teamScoring.value } : {}), ...extra }
    })
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(errMsg(e)) }
  finally { busy.value = false }
}
async function resetToTroop() {
  if (!confirm(t('pointsResetConfirm'))) return
  await save({ reset: true })
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
    <div class="chips">
      <button v-if="data?.canEditTroop" class="chip" :class="{ on: target === null }"
              @click="target = null">🏕️ {{ t('troopDefaults') }}</button>
      <button v-for="sec in data?.sections" :key="sec.id" class="chip" :class="{ on: target === sec.id }"
              @click="target = sec.id">{{ lx(sec, 'name') }}</button>
    </div>
    <div class="note"><b>{{ t('pointsEditingFor') }} {{ targetName }}</b></div>
    <div class="tiny muted">
      <template v-if="!section">{{ t('troopDefaultsNote') }}</template>
      <template v-else-if="section.own">{{ t('pointsOwnNote') }}</template>
      <template v-else>{{ t('pointsTroopNote') }}</template>
    </div>

    <div class="sec-title">{{ t('attendance') }}</div>
    <div class="card" style="display:flex;flex-direction:column;gap:12px">
      <div v-for="[key, label] in ATTENDANCE" :key="key" style="display:flex;align-items:center;gap:12px">
        <label class="lab" style="flex:1;margin:0">{{ t(label) }}</label>
        <input v-model.number="form[key]" type="number" class="in" style="width:96px;text-align:center" :disabled="!canEdit">
      </div>
    </div>

    <div class="sec-title">{{ t('uniform') }}</div>
    <div class="card" style="display:flex;flex-direction:column;gap:12px">
      <div v-for="[key, label] in UNIFORM" :key="key" style="display:flex;align-items:center;gap:12px">
        <label class="lab" style="flex:1;margin:0">{{ t(label) }}</label>
        <input v-model.number="form[key]" type="number" class="in" style="width:96px;text-align:center" :disabled="!canEdit">
      </div>
    </div>

    <template v-if="section">
      <div class="sec-title">{{ t('teamScoring') }}</div>
      <div class="seg">
        <button :class="{ on: teamScoring === 'average' }" :disabled="!canEdit" @click="teamScoring = 'average'">{{ t('teamScoringAvg') }}</button>
        <button :class="{ on: teamScoring === 'sum' }" :disabled="!canEdit" @click="teamScoring = 'sum'">{{ t('teamScoringSum') }}</button>
      </div>
      <div class="tiny muted">{{ teamScoring === 'sum' ? t('teamScoringSumNote') : t('teamScoringAvgNote') }}</div>
    </template>

    <div class="tiny muted">{{ t('pointRulesNote') }}</div>
    <template v-if="canEdit">
      <button class="btn" :disabled="busy" @click="save()">{{ busy ? t('loading') : t('save') }}</button>
      <button v-if="section?.own" class="btn ghost" :disabled="busy" @click="resetToTroop">{{ t('pointsResetToTroop') }}</button>
    </template>
    <div v-else class="tiny muted">{{ t('pointsReadOnly') }}</div>
  </AppShell>
</template>
