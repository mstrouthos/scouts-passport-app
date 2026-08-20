<script setup lang="ts">
/* Splash / loader: mascot plays while the session resolves, then routes. */
const { t } = useI18n()
onMounted(async () => {
  const [me] = await Promise.all([
    loadMe(),
    new Promise(r => setTimeout(r, 1700)) // let the entrance play
  ])
  navigateTo(!me ? '/login' : me.role === 'scout' ? '/app' : '/admin', { replace: true })
})
</script>

<template>
  <div class="splash">
    <div class="auth-blobs"><i /><i /><i /></div>
    <img class="brandlogo rise" src="/images/logo-256.png" alt="" style="margin-bottom:6px">
    <MascotPhoenix style="width:190px" />
    <h1 class="rise" style="animation-delay:.35s">{{ t('appName') }}</h1>
    <div class="tag rise" style="animation-delay:.45s">{{ t('troopName') }}</div>
    <div class="loadbar rise" style="animation-delay:.6s"><i /></div>
  </div>
</template>
