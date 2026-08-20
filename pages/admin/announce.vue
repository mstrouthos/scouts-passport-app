<script setup lang="ts">
const { t, locale } = useI18n()
const me = useMe()
const lx = useLx()
const { show } = useToast()
const isAdmin = computed(() => me.value?.role === 'troop_leader')
const isYparch = computed(() => me.value?.rank === 'yparchigos')
const { data: roster } = await useFetch<any>('/api/admin/contacts')   // sections in my scope
const { data: list, refresh } = await useFetch<any>('/api/admin/announcements')

const audience = ref<'troop' | 'leaders' | number>(isAdmin.value ? 'troop' : (roster.value?.[0]?.id ?? 'troop'))
const text = ref('')
const busy = ref(false)

async function send() {
  busy.value = true
  try {
    const body = typeof audience.value === 'number'
      ? { audience: 'section', sectionId: audience.value, textEl: text.value }
      : { audience: audience.value, textEl: text.value }
    const res = await $fetch<any>('/api/admin/announcements', { method: 'POST', body })
    show(res.status === 'sent' ? '📣 ' + t('sent') : '⏳ ' + t('pendingApproval'))
    text.value = ''
    await refresh()
  } catch (e: any) { show(e?.data?.message || t('error')) } finally { busy.value = false }
}
async function approve(id: number) {
  try {
    await $fetch(`/api/admin/announcements/${id}/approve`, { method: 'POST' })
    show('✅ ' + t('sent'))
    await refresh()
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
function audLabel(a: any) {
  if (a.audience === 'troop') return t('wholeTroop')
  if (a.audience === 'leaders') return t('vathmoforoi')
  return lx(a, 'section')
}
</script>

<template>
  <AppShell :title="t('announce')" :sub="isYparch ? t('needsApprovalNote') : t('announceSub')" back="/admin/more">
    <div>
      <label class="lab">{{ t('audience') }}</label>
      <div class="chips">
        <button v-if="isAdmin" class="chip" :class="{ on: audience === 'troop' }" @click="audience = 'troop'">{{ t('wholeTroop') }}</button>
        <button v-for="sec in roster" :key="sec.id" class="chip" :class="{ on: audience === sec.id }"
                @click="audience = sec.id">{{ lx(sec, 'name') }}</button>
        <button v-if="isAdmin" class="chip" :class="{ on: audience === 'leaders' }" @click="audience = 'leaders'">{{ t('vathmoforoi') }}</button>
      </div>
    </div>
    <div><label class="lab">{{ t('message') }}</label><textarea v-model="text" class="in" rows="3" /></div>
    <button class="btn" :disabled="!text.trim() || busy" @click="send">
      {{ isYparch ? t('submitForApproval') : t('sendNow') }}
    </button>

    <template v-if="list?.length">
      <div class="sec-title">{{ t('recent') }}</div>
      <div class="adm">
        <div v-for="a in list" :key="a.id" class="it" style="align-items:flex-start">
          <div style="flex:1">
            <b>{{ a.textEl }}</b>
            <span>{{ audLabel(a) }} · {{ a.byFirst }} {{ a.byLast }} · {{ fmtDate(a.createdAt, locale) }}</span>
          </div>
          <button v-if="a.canApprove" class="chip on" style="flex:none" @click="approve(a.id)">✓ {{ t('approveSend') }}</button>
          <span v-else class="pill" :class="a.status === 'sent' ? 'ok' : 'sched'">
            {{ a.status === 'sent' ? t('sent2') : t('pendingShort') }}
          </span>
        </div>
      </div>
    </template>
  </AppShell>
</template>
