<script setup lang="ts">
const { t } = useI18n()
const me = useMe()
const lx = useLx()
const name = useName()
const { show } = useToast()
const { data, refresh } = await useFetch('/api/admin/scouts')
const activeCount = computed(() => (data.value?.patrols || [])
  .flatMap((p: any) => p.scouts).filter((r: any) => r.isActive).length)
const adding = ref(false)
const form = reactive({ firstName: '', lastName: '', patrolId: 0 })
const created = ref<{ passcode: string } | null>(null)

async function createScout() {
  try {
    const res = await $fetch<any>('/api/admin/scouts', { method: 'POST', body: { ...form } })
    created.value = res
    form.firstName = ''; form.lastName = ''
    await refresh()
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="me?.role === 'troop_leader' ? t('scouts') : t('myScouts')"
            :sub="`${activeCount} ${t('activeN')}`">
    <div class="cols-2">
      <div style="display:flex;flex-direction:column;gap:15px">
        <div v-for="p in data?.patrols" :key="p.id" class="adm">
          <div class="hdr">{{ p.emblem }} {{ lx(p, 'name') }} · {{ p.scouts.length }}</div>
          <NuxtLink v-for="r in p.scouts" :key="r.id" :to="`/admin/scouts/${r.id}`" class="it">
            <div style="flex:1"><b>{{ name(r) }}</b><span>{{ r.points }} {{ t('pts') }} · {{ r.badges }} {{ t('badges').toLowerCase() }}</span></div>
            <span class="pill" :class="r.isActive ? 'ok' : 'draft'">{{ r.isActive ? t('active') : t('inactive') }}</span>
          </NuxtLink>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:15px">
        <div v-if="data?.leaders" class="adm">
          <div class="hdr">{{ t('leaders') }}</div>
          <div v-for="r in data.leaders" :key="r.id" class="it">
            <div style="flex:1"><b>{{ name(r) }}</b></div>
            <span class="pill" :class="r.role === 'troop_leader' ? 'sched' : 'live'">
              {{ r.role === 'troop_leader' ? t('troopLeader') : t('leader') }}
            </span>
          </div>
        </div>
        <NuxtLink to="/admin/cards" class="btn ghost">{{ t('printCards') }}</NuxtLink>
      </div>
    </div>

    <button class="fab" :aria-label="t('newScout')" @click="adding = true">+</button>

    <Teleport to="body">
      <div v-if="adding" class="sheet-backdrop" @click.self="adding = false; created = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('newScout') }}</h3>
          <template v-if="created">
            <div class="note" style="text-align:center">
              <b>{{ t('passcodeIs') }} <span style="font-variant-numeric:tabular-nums">{{ created.passcode }}</span></b>
              {{ t('writeItDown') }}
            </div>
            <button class="btn" @click="adding = false; created = null">{{ t('close') }}</button>
          </template>
          <template v-else>
            <div><label class="lab">{{ t('firstName') }}</label><input v-model="form.firstName" class="in"></div>
            <div><label class="lab">{{ t('lastName') }}</label><input v-model="form.lastName" class="in"></div>
            <div>
              <label class="lab">{{ t('patrol') }}</label>
              <div class="chips">
                <button v-for="p in data?.patrols" :key="p.id" class="chip" :class="{ on: form.patrolId === p.id }"
                        @click="form.patrolId = p.id">{{ p.emblem }} {{ lx(p, 'name') }}</button>
              </div>
            </div>
            <button class="btn" :disabled="!form.firstName || !form.lastName || !form.patrolId" @click="createScout">{{ t('create') }}</button>
          </template>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>
