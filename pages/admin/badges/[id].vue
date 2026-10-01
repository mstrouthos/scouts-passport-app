<script setup lang="ts">
const { t } = useI18n()
const me = useMe()
/* Πτυχία are the Ομάδα's programme; a λυκόπουλο has none, so their
   Βαθμοφόροι have nothing to award here. */
const runsBadges = computed(() => {
  if (!me.value) return true
  if (me.value.role === 'troop_leader') return true
  const scopes = me.value.scopeSections
  return scopes == null || scopes.some((x: any) => x.slug === 'omada')
})
watchEffect(() => { if (me.value && !runsBadges.value) navigateTo('/admin/more') })
const lx = useLx()
const name = useName()
const { show } = useToast()
const route = useRoute()
const { data: badges } = await useFetch<any>('/api/admin/badges')
const badge = computed(() => (badges.value || []).find((b: any) => b.id === Number(route.params.id)))
const { data: rosterData } = await useFetch<any>('/api/admin/scouts')
/* Πτυχία are the Ομάδα's: its ενωμοτίες, then its scouts not in one yet.
   (The roster comes grouped by section — this page read the older, flat
   shape and so listed nobody.) */
const groups = computed(() => (rosterData.value?.sections || [])
  .filter((x: any) => x.slug === 'omada')
  .flatMap((x: any) => [
    ...(x.patrols || []).map((p: any) => ({ key: 'p' + p.id, label: `${p.emblem || ''} ${lx(p, 'name')}`.trim(), scouts: p.scouts || [] })),
    { key: 'loose' + x.id, label: t('noPatrolYet'), scouts: x.loose || [] }
  ])
  .filter((g: any) => g.scouts.length))
const sel = ref<number[]>([])
const date = ref(new Date().toISOString().slice(0, 10))

function toggle(id: number) {
  const i = sel.value.indexOf(id)
  if (i < 0) sel.value.push(id); else sel.value.splice(i, 1)
}
/* who already has it: shown as such, and it can be taken back from them */
const holders = computed(() => new Set<number>(badge.value?.holders || []))
const refreshBadges = async () => { badges.value = await $fetch<any>('/api/admin/badges') }
async function revoke(r: any) {
  if (!confirm(t('confirmRevokeBadge', { badge: lx(badge.value), name: name(r) }))) return
  try {
    await $fetch(`/api/admin/badges/${route.params.id}/award`, { method: 'DELETE', query: { scoutId: r.id } })
    await refreshBadges(); show('🗑️ ' + t('badgeRevoked'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
async function award() {
  try {
    await $fetch(`/api/admin/badges/${route.params.id}/award`, {
      method: 'POST', body: { scoutIds: sel.value, completedOn: date.value }
    })
    show(`🏅 ${t('awardedOk')} → ${sel.value.length} ${t(sel.value.length === 1 ? 'scoutWord' : 'scoutsWord')}`)
    sel.value = []
    navigateTo('/admin/badges')
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell v-if="badge" :title="`${badge.icon} ${lx(badge)}`" :sub="t('awardBadge')" back="/admin/badges">
    <div><label class="lab">{{ t('date') }}</label><input v-model="date" type="date" class="in"></div>
    <div class="sec-title">{{ t('pickScouts') }}</div>
    <div class="adm">
      <template v-for="gr in groups" :key="gr.key">
        <div class="hdr">{{ gr.label }}</div>
        <template v-for="r in gr.scouts" :key="r.id">
          <!-- already has it: no box to tick, and a way to take it back -->
          <div v-if="holders.has(r.id)" class="it" style="cursor:default">
            <span class="chk has">🏅</span>
            <div style="flex:1"><b>{{ name(r) }}</b><span>{{ t('hasBadge') }}</span></div>
            <button class="chip" style="flex:none;color:var(--danger)" @click="revoke(r)">{{ t('revokeBadge') }}</button>
          </div>
          <button v-else class="it" @click="toggle(r.id)">
            <span class="chk" :class="{ on: sel.includes(r.id) }">{{ sel.includes(r.id) ? '✓' : '' }}</span>
            <div style="flex:1"><b>{{ name(r) }}</b></div>
          </button>
        </template>
      </template>
    </div>
    <button class="btn" :disabled="!sel.length" @click="award">
      {{ t('awardTo') }} {{ sel.length }} {{ t(sel.length === 1 ? 'scoutWord' : 'scoutsWord') }}
    </button>
  </AppShell>
</template>

<style scoped>
.chk{
  flex:none;width:21px;height:21px;border-radius:7px;border:1.5px solid #C6D2DF;background:#fff;
  display:grid;place-items:center;font-size:11px;font-weight:700;color:#fff;
}
.chk.on{background:var(--blue);border-color:var(--blue)}
.chk.has{border-color:transparent;background:var(--gold-soft);font-size:12px}
</style>
