<script setup lang="ts">
const { t, locale } = useI18n()
const me = useMe()
const lx = useLx()
const { data } = await useFetch('/api/admin/events')
const isTroop = computed(() => me.value?.role === 'troop_leader')
</script>

<template>
  <AppShell :title="t('events')">
    <div class="adm">
      <div class="hdr">{{ t('events') }} · {{ data?.length || 0 }}</div>
      <NuxtLink v-for="e in data" :key="e.id" :to="`/admin/events/${e.id}`" class="it">
        <div class="date" style="flex:none;width:44px;text-align:center;background:var(--bg2);border-radius:12px;padding:5px 0">
          <b style="display:block;font-size:16px;line-height:1">{{ fmtDay(e.startsAt, locale).d }}</b>
          <span style="font-size:8.5px;text-transform:uppercase;color:var(--muted)">{{ fmtDay(e.startsAt, locale).m }}</span>
        </div>
        <div style="flex:1"><b><span class="dot" :class="e.scope" />{{ lx(e) }}</b><span>{{ e.location || '' }}</span></div>
        <span class="pill" :class="!e.editable ? 'draft' : e.reviewed ? 'ok' : 'draft'">
          {{ !e.editable ? '🔒 ' + t('readOnly') : e.reviewed ? t('reviewed') : t('pending') }}
        </span>
      </NuxtLink>
    </div>
    <div v-if="!isTroop" class="tiny muted" style="text-align:center">{{ t('lockedEvents') }}</div>
    <NuxtLink to="/admin/events/new" class="fab" aria-label="new">+</NuxtLink>
  </AppShell>
</template>
