<script setup lang="ts">
const { t, locale, setLocale } = useI18n()
const me = useMe()
const lx = useLx()
const roleLabel = computed(() => me.value?.role === 'troop_leader' ? t('troopLeader') : t('leader'))
const scopeLabel = computed(() => {
  if (me.value?.role === 'troop_leader' || me.value?.scopePatrols === null) return t('allSectors')
  return (me.value?.scopePatrols || []).map(p => `${p.emblem} ${lx(p, 'name')}`).join(' · ') || t('allSectors')
})
async function pickLang(l: 'el' | 'en') {
  await setLocale(l)
  $fetch('/api/settings', { method: 'PATCH', body: { locale: l } }).catch(() => {})
}
async function logout() {
  await $fetch('/api/logout', { method: 'POST' })
  useMe().value = null
  navigateTo('/login')
}
</script>

<template>
  <AppShell :title="t('profile')" :sub="roleLabel">
    <div class="pcard">
      <div class="name">{{ me?.firstName }} {{ me?.lastName }}</div>
      <div class="meta">{{ me?.role === 'troop_leader' ? '👑 ' + t('troopLeader') : t('leader') }} · {{ lx(me?.section, 'name') }}</div>
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

    <div class="tiny muted" style="text-align:center">{{ t('notRanked') }}</div>
    <button class="btn danger" @click="logout">{{ t('logout') }}</button>
  </AppShell>
</template>
