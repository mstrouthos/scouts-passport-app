<script setup lang="ts">
const { t } = useI18n()
const pass = ref('')
const err = ref('')
const busy = ref(false)
const digits = computed(() => pass.value.replace(/\D/g, ''))
// why we are here, if the server said — for reports of "it logged me out"
const why = useMeWhy()
const standalone = computed(() => import.meta.client && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true))

function format(e: Event) {
  const d = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 8)
  pass.value = d.length > 4 ? d.slice(0, 4) + '-' + d.slice(4) : d
}
async function submit() {
  if (digits.value.length !== 8 || busy.value) return
  busy.value = true; err.value = ''
  try {
    // a fresh sign-in must not ride on a previous person's copy of the session
    writeSessionToken(null)
    const res = await $fetch<{ role: string }>('/api/login', { method: 'POST', body: { passcode: digits.value } })
    await loadMe()
    navigateTo(res.role === 'scout' ? '/app' : '/admin', { replace: true })
  } catch (e: any) {
    err.value = e?.statusCode === 429 ? t('loginSlow') : t('loginBad')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login">
    <div class="auth-blobs"><i /><i /><i /></div>
    <div class="inner">
      <img class="brandlogo rise" src="/images/logo-256.png" alt="" style="margin:0 auto 4px">
      <MascotPhoenix style="margin:0 auto;width:180px;display:block" />
      <h2 class="rise" style="animation-delay:.32s">{{ t('appName') }}</h2>
      <div class="tag rise" style="animation-delay:.42s">{{ t('troopName') }}</div>
      <form class="rise" style="animation-delay:.54s" @submit.prevent="submit">
        <label for="pass">{{ t('passcode') }}</label>
        <input id="pass" :value="pass" inputmode="numeric" autocomplete="off"
               placeholder="0000-0000" maxlength="9" @input="format">
        <div class="rise" style="animation-delay:.66s">
          <button class="btn" type="submit" :disabled="digits.length !== 8 || busy">{{ t('enter') }}</button>
        </div>
      </form>
      <div v-if="why" class="tiny" style="opacity:.55;text-align:center;margin-top:10px">{{ why }}{{ standalone ? ' · app' : ' · browser' }}</div>
      <div v-if="err" class="err" role="alert">{{ err }}</div>
      <div class="helper rise" style="animation-delay:.8s">{{ t('loginHelp1') }}<br>{{ t('loginHelp2') }}</div>
    </div>
  </div>
</template>
