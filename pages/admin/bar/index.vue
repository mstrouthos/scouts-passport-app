<script setup lang="ts">
/* The bar's events, one per night. Kept, not wiped: what sold at the last
   one is the best guess for the next. */
const { t } = useI18n()
const me = useMe()
const { show } = useToast()
const isAdmin = computed(() => me.value?.role === 'troop_leader')
const { data, refresh } = await useFetch<any[]>('/api/admin/bar/events')
const adding = ref(false)
const form = reactive({ name: '', eventDate: new Date().toISOString().slice(0, 10), tableCount: 10, copyMenuFrom: 0 as number })
const eur = (c: number) => (c / 100).toFixed(2).replace('.', ',') + ' €'
async function create() {
  try {
    const r = await $fetch<any>('/api/admin/bar/events', { method: 'POST', body: { ...form, copyMenuFrom: form.copyMenuFrom || undefined } })
    adding.value = false; await refresh(); navigateTo(`/admin/bar/${r.id}`)
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="t('barTitle')" back="/admin/more">
    <div class="note">{{ t('barIntro') }}</div>
    <div class="adm">
      <div class="hdr">{{ t('barEvents') }} · {{ data?.length || 0 }}</div>
      <NuxtLink v-for="e in data" :key="e.id" :to="`/admin/bar/${e.id}`" class="it">
        <div style="flex:1"><b>{{ e.name }}</b>
          <span>{{ e.eventDate || '—' }} · {{ e.orders }} {{ t('barOrders') }} · {{ eur(e.revenueCents) }}</span></div>
        <span class="pill" :class="e.status === 'open' ? 'live' : 'draft'">{{ e.status === 'open' ? t('barOpen') : t('barClosed') }}</span>
      </NuxtLink>
      <div v-if="!data?.length" class="it"><span>{{ t('barNone') }}</span></div>
    </div>
    <button v-if="isAdmin" class="btn" @click="adding = true">+ {{ t('barNewEvent') }}</button>

    <div v-if="adding" class="sheet-backdrop" @click.self="adding = false">
      <div class="sheet">
        <h3 style="margin:0;font-size:17px;text-align:center">{{ t('barNewEvent') }}</h3>
        <div><label class="lab">{{ t('name') }}</label><input v-model="form.name" class="in" placeholder="Μουσική Βραδιά 2026"></div>
        <div style="display:flex;gap:8px">
          <div style="flex:1"><label class="lab">{{ t('date') }}</label><input v-model="form.eventDate" type="date" class="in"></div>
          <div style="width:110px"><label class="lab">{{ t('barTables') }}</label><input v-model.number="form.tableCount" type="number" min="1" max="200" class="in"></div>
        </div>
        <div v-if="data?.length"><label class="lab">{{ t('barCopyMenu') }}</label>
          <select v-model="form.copyMenuFrom" class="in">
            <option :value="0">— {{ t('barEmptyMenu') }} —</option>
            <option v-for="e in data" :key="e.id" :value="e.id">{{ e.name }}</option>
          </select></div>
        <button class="btn" :disabled="!form.name.trim()" @click="create">{{ t('save') }}</button>
        <button class="btn ghost" @click="adding = false">{{ t('close') }}</button>
      </div>
    </div>
  </AppShell>
</template>
