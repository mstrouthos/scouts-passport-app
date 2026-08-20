<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/contacts')
const current = ref(0)
watchEffect(() => { if (!current.value && data.value?.length) current.value = data.value[0].id })
const sec = computed(() => (data.value || []).find((x: any) => x.id === current.value))
const text = ref('')
watch(sec, (v) => { text.value = (v?.emails || []).join('\n') }, { immediate: true })

async function save() {
  try {
    const res = await $fetch<any>('/api/admin/contacts', {
      method: 'POST',
      body: { sectionId: current.value, emails: text.value.split('\n') }
    })
    show(`✅ ${t('saved')} · ${res.saved}`)
    await refresh()
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="t('contacts')" :sub="t('contactsSub')" back="/admin/more">
    <div class="chips">
      <button v-for="x in data" :key="x.id" class="chip" :class="{ on: current === x.id }"
              @click="current = x.id">{{ lx(x, 'name') }}</button>
    </div>
    <div>
      <label class="lab">{{ t('contactsHint') }}</label>
      <textarea v-model="text" class="in" rows="10" placeholder="mama@example.com&#10;bampas@example.com" />
    </div>
    <button class="btn" @click="save">{{ t('save') }}</button>
    <div class="tiny muted">{{ t('contactsPrivacy') }}</div>
  </AppShell>
</template>
