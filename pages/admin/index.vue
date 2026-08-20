<script setup lang="ts">
const { t, locale, setLocale } = useI18n()
const me = useMe()
const lx = useLx()
const roleLabel = computed(() => me.value?.role === 'troop_leader' ? t('troopLeader')
  : me.value?.rank === 'yparchigos' ? t('yparchigos') : t('archigos'))
const scopeLabel = computed(() => {
  if (me.value?.role === 'troop_leader' || me.value?.scopeSections === null) return t('allSectors')
  return (me.value?.scopeSections || []).map((x: any) => lx(x, 'name')).join(' · ') || t('allSectors')
})
async function pickLang(l: 'el' | 'en') {
  await setLocale(l)
  $fetch('/api/settings', { method: 'PATCH', body: { locale: l } }).catch(() => {})
}
async function logout() {
  await $fetch('/api/logout', { method: 'POST' })
  useMe().value = null
  useNotifications().reset()
  navigateTo('/login')
}
const newPass = ref<string | null>(null)
async function rotateOwn() {
  const res = await $fetch<any>(`/api/admin/scouts/${me.value!.id}/passcode`, { method: 'POST' })
  newPass.value = res.passcode
}

const { show } = useToast()
const editingDetails = ref(false)
const details = reactive({ firstName: '', lastName: '', firstNameEn: '', lastNameEn: '' })
function openDetails() {
  details.firstName = me.value?.firstName || ''; details.lastName = me.value?.lastName || ''
  details.firstNameEn = me.value?.firstNameEn || ''; details.lastNameEn = me.value?.lastNameEn || ''
  editingDetails.value = true
}
async function saveDetails() {
  try {
    await $fetch(`/api/admin/scouts/${me.value!.id}`, {
      method: 'PATCH',
      body: {
        firstName: details.firstName, lastName: details.lastName,
        firstNameEn: details.firstNameEn, lastNameEn: details.lastNameEn
      }
    })
    await loadMe(); editingDetails.value = false; show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
async function resetRoster() {
  if (!confirm(t('confirmResetRoster'))) return
  if (!confirm(t('confirmResetRosterAgain'))) return
  try {
    const res = await $fetch<any>('/api/admin/scouts/reset-roster', { method: 'POST', body: { confirm: true } })
    show(`🧹 ${res.deleted} ${t('membersRemoved')}`)
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="t('profile')" :sub="roleLabel">
    <div class="pcard">
      <div class="name">{{ me?.firstName }} {{ me?.lastName }}</div>
      <div class="meta">{{ me?.role === 'troop_leader' ? '👑 ' + t('troopLeader') : roleLabel }}</div>
      <div class="stats"><div class="stat" style="flex:1">
        <b style="font-size:14px;font-weight:600">{{ scopeLabel }}</b>
        <span>{{ t('scopeOf') }}</span>
      </div></div>
    </div>

    <div class="sec-title">{{ t('contactDetails') }}</div>
    <div v-if="editingDetails" class="card" style="display:flex;flex-direction:column;gap:10px">
      <div><label class="lab">{{ t('firstName') }}</label><input v-model="details.firstName" class="in"></div>
      <div><label class="lab">{{ t('lastName') }}</label><input v-model="details.lastName" class="in"></div>
      <div><label class="lab">{{ t('firstName') }} (EN) <span class="tiny muted">({{ t('optional') }})</span></label><input v-model="details.firstNameEn" class="in"></div>
      <div><label class="lab">{{ t('lastName') }} (EN) <span class="tiny muted">({{ t('optional') }})</span></label><input v-model="details.lastNameEn" class="in"></div>
      <button class="btn" :disabled="!details.firstName || !details.lastName" @click="saveDetails">{{ t('save') }}</button>
    </div>
    <button v-else class="srow" @click="openDetails">
      <div class="ico">✎</div>
      <div class="txt"><b>{{ me?.firstName }} {{ me?.lastName }}</b><span>{{ t('edit') }}</span></div>
      <span class="chev">›</span>
    </button>

    <div class="sec-title">{{ t('language') }}</div>
    <div class="seg">
      <button :class="{ on: locale === 'el' }" @click="pickLang('el')">Ελληνικά</button>
      <button :class="{ on: locale === 'en' }" @click="pickLang('en')">English</button>
    </div>

    <div class="sec-title">{{ t('loginCard') }}</div>
    <div v-if="newPass" class="note" style="text-align:center">
      <b>{{ t('passcodeIs') }} <span style="font-variant-numeric:tabular-nums">{{ newPass }}</span></b>
      {{ t('writeItDown') }}
    </div>
    <button v-else class="srow" @click="rotateOwn">
      <div class="ico">🔑</div>
      <div class="txt"><b>{{ t('newPasscode') }}</b><span>{{ t('newPasscodeSub') }}</span></div>
      <span class="chev">›</span>
    </button>

    <div class="tiny muted" style="text-align:center">{{ t('notRanked') }}</div>
    <button class="btn danger" @click="logout">{{ t('logout') }}</button>

    <template v-if="me?.role === 'troop_leader'">
      <div class="sec-title" style="color:var(--danger)">{{ t('dangerZone') }}</div>
      <button class="btn danger" @click="resetRoster">{{ t('clearDemoRoster') }}</button>
      <div class="tiny muted">{{ t('clearDemoRosterNote') }}</div>
    </template>
  </AppShell>
</template>
