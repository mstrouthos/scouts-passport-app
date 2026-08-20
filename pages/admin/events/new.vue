<script setup lang="ts">
const { t } = useI18n()
const me = useMe()
const lx = useLx()
const { show } = useToast()
const isTroop = computed(() => me.value?.role === 'troop_leader')
const patrols = computed(() => me.value?.scopePatrols)
const form = reactive({
  titleEl: '', titleEn: '', location: '', scope: isTroop.value ? 'troop' : 'patrol',
  patrolId: patrols.value?.[0]?.id ?? 0,
  date: new Date().toISOString().slice(0, 10), start: '17:00', end: '19:00', remind: true
})
const { data: adminData } = await useFetch<any>('/api/admin/scouts')
const allPatrols = computed(() => adminData.value?.patrols || [])

async function save() {
  const startsAt = new Date(`${form.date}T${form.start}`).toISOString()
  const endsAt = form.end ? new Date(`${form.date}T${form.end}`).toISOString() : null
  const remindAt = form.remind ? new Date(new Date(startsAt).getTime() - 86400_000).toISOString() : null
  try {
    await $fetch('/api/admin/events', {
      method: 'POST',
      body: { titleEl: form.titleEl, titleEn: form.titleEn || null, location: form.location || null,
              scope: form.scope, patrolId: form.patrolId || null, startsAt, endsAt, remindAt }
    })
    show('✅ ' + t('saved'))
    navigateTo('/admin/events')
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="t('newEvent')" back="/admin/events">
    <div class="cols-2">
      <div style="display:flex;flex-direction:column;gap:13px">
        <div><label class="lab">{{ t('titleEl') }}</label><input v-model="form.titleEl" class="in"></div>
        <div><label class="lab">{{ t('titleEn') }}</label><input v-model="form.titleEn" class="in" :placeholder="t('enOptional')"></div>
        <div><label class="lab">{{ t('location') }}</label><input v-model="form.location" class="in"></div>
        <div>
          <label class="lab">{{ t('scopeQ') }}</label>
          <div class="chips">
            <template v-if="isTroop">
              <button v-for="sc in ['troop', 'section']" :key="sc" class="chip" :class="{ on: form.scope === sc }"
                      @click="form.scope = sc">{{ t(sc) }}</button>
              <button v-for="p in allPatrols" :key="p.id" class="chip"
                      :class="{ on: form.scope === 'patrol' && form.patrolId === p.id }"
                      @click="form.scope = 'patrol'; form.patrolId = p.id">{{ p.emblem }} {{ lx(p, 'name') }}</button>
            </template>
            <template v-else>
              <span v-for="p in patrols || []" :key="p.id" class="chip on">{{ p.emblem }} {{ lx(p, 'name') }}</span>
            </template>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:13px">
        <div><label class="lab">{{ t('date') }}</label><input v-model="form.date" type="date" class="in"></div>
        <div style="display:flex;gap:8px">
          <div style="flex:1"><label class="lab">{{ t('starts') }}</label><input v-model="form.start" type="time" class="in"></div>
          <div style="flex:1"><label class="lab">{{ t('ends') }}</label><input v-model="form.end" type="time" class="in"></div>
        </div>
        <button class="srow" @click="form.remind = !form.remind">
          <div class="ico">🔔</div><div class="txt"><b>{{ t('remind1d') }}</b></div>
          <span class="sw" :class="{ off: !form.remind }" />
        </button>
        <button class="btn" :disabled="!form.titleEl" @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </AppShell>
</template>
