<script setup lang="ts">
const { t, locale } = useI18n()
const me = useMe()
const lx = useLx()
const { data } = await useFetch<any[]>('/api/admin/events')
const isTroop = computed(() => me.value?.role === 'troop_leader')

/* Whole troop, then each sector this leader covers — an Αρχηγός of the Ομάδα
   filters between the troop's programme and their own, and nothing else. */
const filter = ref<string>('all')
const filters = computed(() => {
  const out = [{ key: 'all', label: t('all') }, { key: 'troop', label: t('wholeTroop') }]
  for (const sec of (me.value?.scopeSections || []))
    out.push({ key: 's' + sec.id, label: lx(sec, 'name') })
  if ((data.value || []).some(e => e.scope === 'leaders'))
    out.push({ key: 'leaders', label: t('vathmoforoi') })
  return out
})
const shown = computed(() => (data.value || []).filter(e => {
  if (filter.value === 'all') return true
  if (filter.value === 'troop') return e.scope === 'troop'
  if (filter.value === 'leaders') return e.scope === 'leaders'
  return e.sectionId === Number(filter.value.slice(1))
}))
</script>

<template>
  <AppShell :title="t('events')">
    <div v-if="filters.length > 2" class="chips">
      <button v-for="f in filters" :key="f.key" class="chip" :class="{ on: filter === f.key }"
              @click="filter = f.key">{{ f.label }}</button>
    </div>
    <div class="adm">
      <div class="hdr">{{ t('events') }} · {{ shown.length }}</div>
      <NuxtLink v-for="e in shown" :key="e.id" :to="`/admin/events/${e.id}`" class="it">
        <div class="date" style="flex:none;width:44px;text-align:center;background:var(--bg2);border-radius:12px;padding:5px 0">
          <b style="display:block;font-size:16px;line-height:1">{{ fmtDay(e.startsAt, locale).d }}</b>
          <span style="font-size:8.5px;text-transform:uppercase;color:var(--muted)">{{ fmtDay(e.startsAt, locale).m }}</span>
        </div>
        <div style="flex:1"><b><span class="dot" :class="e.scope" />{{ lx(e) }}</b>
          <span>{{ [e.scope === 'troop' ? t('wholeTroop') : e.scope === 'leaders' ? t('vathmoforoi') : lx(e, 'section'), e.location].filter(Boolean).join(' · ') }}</span>
        </div>
        <span class="pill" :class="!e.editable ? 'draft' : e.reviewed ? 'ok' : 'draft'">
          {{ !e.editable ? '🔒 ' + t('readOnly') : e.reviewed ? t('reviewed') : t('pending') }}
        </span>
      </NuxtLink>
    </div>
    <div v-if="!isTroop" class="tiny muted" style="text-align:center">{{ t('lockedEvents') }}</div>
    <NuxtLink v-if="me?.can?.events !== false" to="/admin/events/new" class="fab" aria-label="new">+</NuxtLink>
  </AppShell>
</template>
