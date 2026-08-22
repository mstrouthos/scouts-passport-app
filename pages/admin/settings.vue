<script setup lang="ts">
/* A leader's own settings: language, notifications and their access code.
   The code lives here rather than on the profile because it is a thing you
   change, not a thing you are. */
const { t, locale, setLocale } = useI18n()
const me = useMe()
const { show } = useToast()
const cfg = useRuntimeConfig()
const notifState = ref<'idle' | 'granted' | 'denied' | 'unsupported'>('idle')

onMounted(() => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) notifState.value = 'unsupported'
  else if (Notification.permission === 'granted') notifState.value = 'granted'
  else if (Notification.permission === 'denied') notifState.value = 'denied'
})

async function pickLang(l: 'el' | 'en') {
  await setLocale(l)
  $fetch('/api/settings', { method: 'PATCH', body: { locale: l } }).catch(() => {})
}

function b64ToU8(base64: string) {
  const pad = '='.repeat((4 - base64.length % 4) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}
async function enableNotifs() {
  if (notifState.value === 'unsupported' || !cfg.public.vapidPublicKey) { show(t('notifUnsupported')); return }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') { notifState.value = 'denied'; return }
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true, applicationServerKey: b64ToU8(cfg.public.vapidPublicKey)
  })
  await $fetch('/api/push/subscribe', { method: 'POST', body: sub.toJSON() })
  notifState.value = 'granted'
  show(t('notifGranted'))
}

const newPass = ref<string | null>(null)
async function rotateOwn() {
  if (!confirm(t('confirmNewPasscode'))) return
  try {
    const res = await $fetch<any>(`/api/admin/scouts/${me.value!.id}/passcode`, { method: 'POST' })
    newPass.value = res.passcode
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="t('settings')" :sub="`${me?.firstName} ${me?.lastName}`" back="/admin">
    <div class="sec-title">{{ t('language') }}</div>
    <div class="seg">
      <button :class="{ on: locale === 'el' }" @click="pickLang('el')">Ελληνικά</button>
      <button :class="{ on: locale === 'en' }" @click="pickLang('en')">English</button>
    </div>

    <div class="sec-title">{{ t('notifications') }}</div>
    <button class="srow" :disabled="notifState === 'granted'" @click="enableNotifs">
      <div class="ico">🔔</div>
      <div class="txt">
        <b>{{ notifState === 'granted' ? t('notifGranted') : t('notifOn') }}</b>
        <span v-if="notifState === 'denied'">{{ t('notifDenied') }}</span>
        <span v-else-if="notifState === 'unsupported'">{{ t('notifUnsupported') }}</span>
      </div>
    </button>

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
  </AppShell>
</template>
