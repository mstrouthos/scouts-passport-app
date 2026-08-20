<script setup lang="ts">
const { t } = useI18n()
const me = useMe()
const lx = useLx()
const { show } = useToast()
const isTroop = computed(() => me.value?.role === 'troop_leader')
const { data: rosterData } = await useFetch<any>('/api/admin/scouts')
const patrols = computed(() => rosterData.value?.patrols || [])
const audience = ref<'all' | number>(isTroop.value ? 'all' : (patrols.value[0]?.id ?? 'all'))
const text = ref('')
const count = computed(() => {
  if (audience.value === 'all') return patrols.value.flatMap((p: any) => p.scouts).filter((r: any) => r.isActive).length
  return (patrols.value.find((p: any) => p.id === audience.value)?.scouts || []).filter((r: any) => r.isActive).length
})
async function send() {
  try {
    await $fetch('/api/admin/announce', {
      method: 'POST',
      body: audience.value === 'all'
        ? { audience: 'all', textEl: text.value }
        : { audience: 'patrol', patrolId: audience.value, textEl: text.value }
    })
    show('📣 ' + t('sent'))
    text.value = ''
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="t('announce')" :sub="t('announceSub')" back="/admin/more">
    <div>
      <label class="lab">{{ t('audience') }}</label>
      <div class="chips">
        <button v-if="isTroop" class="chip" :class="{ on: audience === 'all' }" @click="audience = 'all'">{{ t('everyone') }}</button>
        <button v-for="p in patrols" :key="p.id" class="chip" :class="{ on: audience === p.id }" @click="audience = p.id">
          {{ p.emblem }} {{ lx(p, 'name') }}
        </button>
      </div>
    </div>
    <div><label class="lab">{{ t('message') }}</label><textarea v-model="text" class="in" rows="3" /></div>
    <div class="note" style="display:flex;gap:10px;align-items:flex-start">
      <div style="width:28px;height:28px;border-radius:8px;background:var(--grad);color:#fff;display:grid;place-items:center;font-size:14px;flex:none">⚜️</div>
      <div><b style="font-size:12.5px">{{ t('appName') }}</b><div style="font-size:12px">{{ text || '…' }}</div></div>
    </div>
    <button class="btn" :disabled="!text.trim()" @click="send">
      {{ t('send') }} {{ count }} {{ t(count === 1 ? 'scoutWord' : 'scoutsWord') }}
    </button>
  </AppShell>
</template>
