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
  </AppShell>
</template>
