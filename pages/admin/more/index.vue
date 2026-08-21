<script setup lang="ts">
const { t } = useI18n()
const me = useMe()
const canSeeRoles = computed(() => me.value?.role === 'troop_leader' || me.value?.scopeKind === 'section' || me.value?.scopeKind === 'troop')
</script>

<template>
  <AppShell :title="t('more')">
    <NuxtLink to="/admin/badges" class="srow">
      <div class="ico">🏅</div><div class="txt"><b>{{ t('badges') }}</b><span>{{ t('pickFromList') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink to="/admin/announce" class="srow">
      <div class="ico">📣</div><div class="txt"><b>{{ t('announce') }}</b><span>{{ t('announceSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink to="/admin/contacts" class="srow">
      <div class="ico">👨‍👩‍👧</div><div class="txt"><b>{{ t('contacts') }}</b><span>{{ t('contactsSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink to="/admin/infopages" class="srow">
      <div class="ico">ℹ️</div><div class="txt"><b>{{ t('infoAdmin') }}</b><span>{{ t('infoAdminSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink to="/admin/points" class="srow">
      <div class="ico">🎯</div><div class="txt"><b>{{ t('pointRules') }}</b><span>{{ t('pointRulesSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
    <NuxtLink v-if="canSeeRoles" to="/admin/roles" class="srow">
      <div class="ico">👥</div><div class="txt"><b>{{ t('roles') }}</b><span>{{ t('rolesSub') }}</span></div><span class="chev">›</span>
    </NuxtLink>
  </AppShell>
</template>
