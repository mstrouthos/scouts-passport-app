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
const { data } = await useFetch('/api/admin/badges')
</script>

<template>
  <AppShell :title="t('badges')" back="/admin/more">
    <div class="adm">
      <div class="hdr">{{ t('badges') }} · {{ data?.length || 0 }}</div>
      <NuxtLink v-for="b in data" :key="b.id" :to="`/admin/badges/${b.id}`" class="it">
        <BadgeIcon :art="b.art" :emoji="b.icon" :size="30" style="flex:none" />
        <div style="flex:1"><b>{{ lx(b) }}</b><span>{{ t('awardedTo') }} {{ b.awarded }}/{{ b.total }}</span></div>
        <span class="chev">›</span>
      </NuxtLink>
    </div>
  </AppShell>
</template>
