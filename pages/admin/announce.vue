<script setup lang="ts">
const { t, locale } = useI18n()
const me = useMe()
const lx = useLx()
const { show } = useToast()
const isAdmin = computed(() => me.value?.role === 'troop_leader')
const isYparch = computed(() => me.value?.rank === 'yparchigos')
const { data: roster } = await useFetch<any>('/api/admin/contacts')   // sections in my scope
const { data: list, refresh } = await useFetch<any>('/api/admin/announcements')
const { data: groups } = await useFetch<any>('/api/admin/groups')

// a number = that section; 'g:<id>' = a notification group
const audience = ref<'troop' | 'leaders' | number | string>(isAdmin.value ? 'troop' : (roster.value?.[0]?.id ?? 'troop'))
const text = ref('')
const busy = ref(false)
const viaSms = ref(false)
const whenMode = ref<'now' | 'later'>('now')
const scheduledAt = ref('')

/** How many people this will actually reach, and how many can get an SMS. */
const target = computed(() => {
  const a = audience.value
  if (typeof a === 'string' && a.startsWith('g:')) {
    const g = (groups.value || []).find((x: any) => String(x.id) === a.slice(2))
    return { n: g?.members.length ?? 0, sms: (g?.members || []).filter((m: any) => m.phone).length }
  }
  return null
})

async function send() {
  busy.value = true
  try {
    const a = audience.value
    const base: any = { textEl: text.value, viaSms: viaSms.value }
    if (whenMode.value === 'later' && scheduledAt.value)
      base.scheduledAt = new Date(scheduledAt.value).toISOString()
    const body = typeof a === 'number' ? { ...base, audience: 'section', sectionId: a }
      : typeof a === 'string' && a.startsWith('g:') ? { ...base, audience: 'group', groupId: Number(a.slice(2)) }
      : { ...base, audience: a }
    const res = await $fetch<any>('/api/admin/announcements', { method: 'POST', body })
    show(res.status === 'sent' ? '📣 ' + t('sent')
      : res.status === 'scheduled' ? '🕒 ' + t('scheduledOk')
      : '⏳ ' + t('pendingApproval'))
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
  if (a.audience === 'group') {
    const g = (groups.value || []).find((x: any) => x.id === a.groupId)
    return g ? `${g.emoji} ${g.nameEl}` : t('groups')
  }
  return lx(a, 'section')
}
/** Channel badges, so it is obvious whether an SMS was involved. */
function channels(a: any) {
  return a.viaSms ? '🔔 + 📱' : '🔔'
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
        <button v-for="g in groups" :key="'g' + g.id" class="chip" :class="{ on: audience === 'g:' + g.id }"
                @click="audience = 'g:' + g.id">{{ g.emoji }} {{ g.nameEl }}</button>
      </div>
      <NuxtLink to="/admin/groups" class="tiny" style="color:var(--accent-deep);font-weight:650">
        {{ t('manageGroups') }} ›
      </NuxtLink>
    </div>
    <div><label class="lab">{{ t('message') }}</label><textarea v-model="text" class="in" rows="3" /></div>

    <div>
      <label class="lab">{{ t('channels') }}</label>
      <div class="chips">
        <button class="chip on" disabled>🔔 {{ t('chPush') }}</button>
        <button class="chip" :class="{ on: viaSms }" @click="viaSms = !viaSms">📱 {{ t('chSms') }}</button>
      </div>
      <div class="tiny muted" style="margin-top:5px">
        {{ viaSms ? t('chSmsOn') : t('chPushOnly') }}
        <template v-if="target"> · {{ target.n }} {{ t('members') }}<template v-if="viaSms">, {{ target.sms }} {{ t('withPhone') }}</template></template>
      </div>
    </div>

    <div>
      <label class="lab">{{ t('whenSend') }}</label>
      <div class="seg">
        <button :class="{ on: whenMode === 'now' }" @click="whenMode = 'now'">{{ t('sendNowOpt') }}</button>
        <button :class="{ on: whenMode === 'later' }" @click="whenMode = 'later'">{{ t('sendLaterOpt') }}</button>
      </div>
      <input v-if="whenMode === 'later'" v-model="scheduledAt" type="datetime-local" class="in" style="margin-top:8px">
      <div v-if="whenMode === 'later' && isYparch" class="tiny muted" style="margin-top:5px">{{ t('scheduleNeedsApproval') }}</div>
    </div>

    <button class="btn" :disabled="!text.trim() || busy || (whenMode === 'later' && !scheduledAt)" @click="send">
      {{ isYparch ? t('submitForApproval') : (whenMode === 'later' ? t('scheduleIt') : t('sendNow')) }}
    </button>

    <template v-if="list?.length">
      <div class="sec-title">{{ t('recent') }}</div>
      <div class="adm">
        <div v-for="a in list" :key="a.id" class="it" style="align-items:flex-start">
          <div style="flex:1">
            <b>{{ a.textEl }}</b>
            <span>{{ channels(a) }} {{ audLabel(a) }} · {{ a.byFirst }} {{ a.byLast }} ·
              <template v-if="a.status === 'scheduled' && a.scheduledAt">{{ t('scheduledFor') }} {{ fmtDate(a.scheduledAt, locale) }}</template>
              <template v-else>{{ fmtDate(a.createdAt, locale) }}</template>
            </span>
          </div>
          <button v-if="a.canApprove" class="chip on" style="flex:none" @click="approve(a.id)">✓ {{ t('approveSend') }}</button>
          <span v-else class="pill" :class="a.status === 'sent' ? 'ok' : 'sched'">
            {{ a.status === 'sent' ? t('sent2') : a.status === 'scheduled' ? t('scheduledShort') : t('pendingShort') }}
          </span>
        </div>
      </div>
    </template>
  </AppShell>
</template>
