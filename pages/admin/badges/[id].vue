<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const name = useName()
const { show } = useToast()
const route = useRoute()
const { data: badges } = await useFetch<any>('/api/admin/badges')
const badge = computed(() => (badges.value || []).find((b: any) => b.id === Number(route.params.id)))
const { data: rosterData } = await useFetch<any>('/api/admin/scouts')
const sel = ref<number[]>([])
const date = ref(new Date().toISOString().slice(0, 10))

function toggle(id: number) {
  const i = sel.value.indexOf(id)
  if (i < 0) sel.value.push(id); else sel.value.splice(i, 1)
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
      <template v-for="p in rosterData?.patrols" :key="p.id">
        <div class="hdr">{{ p.emblem }} {{ lx(p, 'name') }}</div>
        <button v-for="r in p.scouts" :key="r.id" class="it" @click="toggle(r.id)">
          <span class="chk" :class="{ on: sel.includes(r.id) }">{{ sel.includes(r.id) ? '✓' : '' }}</span>
          <div style="flex:1"><b>{{ name(r) }}</b></div>
        </button>
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
</style>
