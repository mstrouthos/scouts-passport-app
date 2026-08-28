<script setup lang="ts">
const { t } = useI18n()
const me = useMe()
// the Αγέλη's screen belongs to its own Βαθμοφόροι, and to the Αρχηγός Συστήματος
/* Both Αγέλες: their children never sign in, so their programme is run from
   here and read by the families. */
const PACK_SLUGS = ['ageli', 'mikri-ageli']
const isPackLeader = computed(() => me.value?.role === 'troop_leader'
  || (me.value?.scopeSections || []).some((x: any) => PACK_SLUGS.includes(x.slug)))
const canSeeRoles = computed(() => me.value?.role === 'troop_leader' || me.value?.scopeKind === 'section' || me.value?.scopeKind === 'troop')
/* Πτυχία are the Ομάδα Προσκόπων's programme — a λυκόπουλο has no such thing,
   so their Βαθμοφόροι have no reason to award one. */
const runsBadges = computed(() => me.value?.role === 'troop_leader'
  || me.value?.scopeSections == null
  || (me.value?.scopeSections || []).some((x: any) => x.slug === 'omada'))
/* Name the screen after the sector it belongs to, or both when they run both. */
const packLabel = computed(() => {
  const mine = (me.value?.scopeSections || []).filter((x: any) => PACK_SLUGS.includes(x.slug))
  return mine.length === 1 ? mine[0].nameEl : t('packScreen')
})
</script>

<template>
  <AppShell :title="t('more')">
    <NuxtLink v-if="me?.can?.badges !== false && runsBadges" to="/admin/badges" class="srow">
      <div class="ico">🏅</div><div class="txt"><b>{{ t('badges') }}</b><span>{{ t('pickFromList') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink v-if="me?.role === 'troop_leader'" to="/admin/launch" class="srow">
      <div class="ico">🚀</div><div class="txt"><b>{{ t('launch') }}</b><span>{{ t('launchSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink v-if="isPackLeader" to="/admin/pack" class="srow">
      <div class="ico">🐺</div><div class="txt"><b>{{ packLabel }}</b><span>{{ t('packScreenSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink to="/admin/polls" class="srow">
      <div class="ico">🗳️</div><div class="txt"><b>{{ t('polls') }}</b><span>{{ t('pollsSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink to="/admin/announce" class="srow">
      <div class="ico">📣</div><div class="txt"><b>{{ t('announce') }}</b><span>{{ t('announceSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink v-if="me?.can?.parents !== false" to="/admin/contacts" class="srow">
      <div class="ico">👨‍👩‍👧</div><div class="txt"><b>{{ t('contacts') }}</b><span>{{ t('contactsSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink v-if="me?.can?.rosterEdit !== false" to="/admin/infopages" class="srow">
      <div class="ico">ℹ️</div><div class="txt"><b>{{ t('infoAdmin') }}</b><span>{{ t('infoAdminSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink v-if="me?.can?.parents !== false" to="/admin/parents" class="srow">
      <div class="ico">👨‍👩‍👧</div><div class="txt"><b>{{ t('parents') }}</b><span>{{ t('parentsSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink v-if="me?.can?.rosterEdit !== false" to="/admin/groups" class="srow">
      <div class="ico">🎺</div><div class="txt"><b>{{ t('groups') }}</b><span>{{ t('groupsSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink v-if="me?.can?.settings !== false" to="/admin/points" class="srow">
      <div class="ico">🎯</div><div class="txt"><b>{{ t('pointRules') }}</b><span>{{ t('pointRulesSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink v-if="canSeeRoles && me?.can?.rosterEdit !== false" to="/admin/roles" class="srow">
      <div class="ico">👥</div><div class="txt"><b>{{ t('roles') }}</b><span>{{ t('rolesSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
  </AppShell>
</template>
