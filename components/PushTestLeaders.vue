<script setup lang="ts">
/* A test notification to every Βαθμοφόρος's phone, and a live report: per
   person and device, whether the push went out, and whether the phone
   confirmed it actually received it. Administrators only — the server
   refuses anyone else. Shown on Βαθμοφόροι (Μέλη) and on Ρόλοι. */
const { t } = useI18n()
const { show } = useToast()
const pushTest = ref<any>(null)
const pushTesting = ref(false)
let pushPoll: any = null
async function testAllLeaders() {
  pushTesting.value = true
  try {
    const { id } = await $fetch<any>('/api/admin/push-test', { method: 'POST' })
    const load = async () => { pushTest.value = await $fetch<any>(`/api/admin/push-test/${id}`) }
    await load()
    clearInterval(pushPoll)
    pushPoll = setInterval(async () => {
      try { await load() } catch { clearInterval(pushPoll) }
      if ((pushTest.value?.ageMs || 0) > 120_000) clearInterval(pushPoll)
    }, 2000)
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { pushTesting.value = false }
}
function closePushTest() { clearInterval(pushPoll); pushTest.value = null }
onBeforeUnmount(() => clearInterval(pushPoll))
const gotIt = (p: any) => p.devices.some((d: any) => d.receivedMs != null)
const personIcon = (p: any) => gotIt(p) ? '✅' : !p.devices.length ? '🔕'
  : p.devices.every((d: any) => d.sent === false) ? '❌' : '⏳'
const pushReceivedCount = computed(() => pushTest.value?.people.filter(gotIt).length || 0)
function deviceStatus(d: any) {
  if (d.receivedMs != null) return { cls: 'ok', text: `✓ ${t('pushReceived')} · ${Math.max(1, Math.round(d.receivedMs / 1000))}${t('secondsShort')}` }
  if (d.sent === false) return { cls: 'bad', text: `✗ ${d.error}` }
  return { cls: 'wait', text: `⏳ ${t('pushWaiting')}` }
}
</script>

<template>
  <button class="srow" :disabled="pushTesting" @click="testAllLeaders">
    <div class="ico">🔔</div><div class="txt"><b>{{ t('testAllLeaders') }}</b><span>{{ t('testAllLeadersSub') }}</span></div><span class="chev">›</span>
  </button>

  <Teleport to="body">
    <!-- the report, filling in as phones confirm -->
    <div v-if="pushTest" class="sheet-backdrop" @click.self="closePushTest">
      <div class="sheet" style="display:flex;flex-direction:column;gap:10px;max-height:85dvh;overflow:auto">
        <h3 style="margin:0;font-size:17px;text-align:center">{{ t('pushTestTitle') }}</h3>
        <div class="note" style="text-align:center">
          <b>{{ t('pushReceivedOf', { n: pushReceivedCount, total: pushTest.people.length }) }}</b>
        </div>
        <div class="adm">
          <div v-for="p in pushTest.people" :key="p.scoutId" class="it" style="cursor:default;align-items:flex-start">
            <div style="flex:1;min-width:0">
              <b>{{ personIcon(p) }} {{ p.name }}</b>
              <span v-if="!p.devices.length">{{ t('pushNoDevice') }}</span>
              <span v-for="(d, i) in p.devices" :key="i" class="dev" :class="deviceStatus(d).cls">{{ d.label }} — {{ deviceStatus(d).text }}</span>
            </div>
          </div>
        </div>
        <div class="tiny muted" style="line-height:1.5">{{ t('pushTestNote') }}</div>
        <button class="btn ghost" @click="closePushTest">{{ t('close') }}</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dev{display:block; margin-top:2px}
.dev.ok{color:var(--green) !important}
.dev.bad{color:var(--danger) !important}
</style>
