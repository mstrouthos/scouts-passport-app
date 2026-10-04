<script setup lang="ts">
/* Φόρμες — forms the administrators build and anyone with the link fills in,
   on forms.scouts30.org. Administrators only: what comes back is families'
   data. */
const { t, locale } = useI18n()
const me = useMe()
const { show } = useToast()
if (me.value && me.value.role !== 'troop_leader') navigateTo('/admin/more', { replace: true })
const { data: forms, refresh } = await useFetch<any[]>('/api/admin/forms')

const creating = ref(false)
const title = ref('')
const busy = ref(false)
async function create() {
  if (!title.value.trim() || busy.value) return
  busy.value = true
  try {
    const r = await $fetch<any>('/api/admin/forms', { method: 'POST', body: { titleEl: title.value } })
    await navigateTo(`/admin/forms/${r.id}`)
  } catch (e: any) { show(e?.data?.message || t('error')) } finally { busy.value = false }
}
onMounted(refresh)
</script>

<template>
  <AppShell :title="t('forms')" :sub="t('formsSub')" back="/admin/more">
    <div v-if="!forms?.length" class="empty">{{ t('formsNone') }}</div>
    <div v-else class="adm">
      <NuxtLink v-for="f in forms" :key="f.id" :to="`/admin/forms/${f.id}`" class="it">
        <div style="flex:1;min-width:0">
          <b>{{ f.titleEl }}</b>
          <span>forms.scouts30.org/{{ f.slug }} · {{ fmtDate(f.createdAt, locale) }}</span>
        </div>
        <span v-if="f.unread" class="pill live">{{ f.unread }} {{ t('formNew') }}</span>
        <span class="pill" :class="f.accepting ? 'ok' : 'draft'">{{ f.accepting ? t('formOpen') : t('formClosedShort') }}</span>
        <span class="tiny muted" style="flex:none">{{ f.responses }}</span>
        <span class="chev">›</span>
      </NuxtLink>
    </div>
    <div class="tiny muted">🔒 {{ t('formsAdminOnly') }}</div>

    <button class="fab" :aria-label="t('formNewForm')" @click="creating = true">+</button>
    <Teleport to="body">
      <div v-if="creating" class="sheet-backdrop" @click.self="creating = false">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('formNewForm') }}</h3>
          <div>
            <label class="lab">{{ t('formTitle') }}</label>
            <input v-model="title" class="in" :placeholder="t('formTitlePh')" @keydown.enter="create">
          </div>
          <button class="btn" :disabled="!title.trim() || busy" @click="create">{{ t('formCreate') }}</button>
          <button class="btn ghost" @click="creating = false">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>
