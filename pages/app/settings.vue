<script setup lang="ts">
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

/* Correcting your own name and phone. Everyone may, until a leader turns it
   off; the server checks that too, so this is a courtesy, not the lock. */
const editing = ref(false)
const busy = ref(false)
const form = reactive({ firstName: '', lastName: '', firstNameEn: '', lastNameEn: '', phone: null as string | null, email: '' })
const phoneOk = computed(() => !form.phone || /^\+357\d{8}$/.test(form.phone))
const emailOk = computed(() => !form.email.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim()))
function openEdit() {
  form.firstName = me.value?.firstName || ''
  form.lastName = me.value?.lastName || ''
  form.firstNameEn = me.value?.firstNameEn || ''
  form.lastNameEn = me.value?.lastNameEn || ''
  form.phone = me.value?.phone || null
  form.email = me.value?.email || ''
  editing.value = true
}
async function saveMe() {
  if (!form.firstName.trim() || !form.lastName.trim() || !phoneOk.value || !emailOk.value || busy.value) return
  busy.value = true
  try {
    await $fetch('/api/me', { method: 'PATCH', body: { ...form } })
    await loadMe()
    editing.value = false
    show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}

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
</script>

<template>
  <AppShell :title="t('settings')" :sub="`${me?.firstName} ${me?.lastName}`" back="/app">
    <div class="sec-title">{{ t('myDetails') }}</div>
    <div class="card" style="display:flex;flex-direction:column;gap:10px">
      <template v-if="editing">
        <div><label class="lab">{{ t('firstName') }}</label><input v-model="form.firstName" class="in"></div>
        <div><label class="lab">{{ t('lastName') }}</label><input v-model="form.lastName" class="in"></div>
        <div><label class="lab">{{ t('firstName') }} (EN) <span class="tiny muted">({{ t('optional') }})</span></label><input v-model="form.firstNameEn" class="in"></div>
        <div><label class="lab">{{ t('lastName') }} (EN) <span class="tiny muted">({{ t('optional') }})</span></label><input v-model="form.lastNameEn" class="in"></div>
        <div><label class="lab">{{ t('phone') }}</label><PhoneInput v-model="form.phone" /></div>
        <div><label class="lab">{{ t('email') }}</label><input v-model="form.email" class="in" type="email" inputmode="email"></div>
        <!-- shown so they can check it, greyed because only a Βαθμοφόρος corrects it -->
        <div>
          <label class="lab">{{ t('birthday') }} 🔒</label>
          <input :value="me?.birthday ? fmtDate(me.birthday, locale) : '—'" class="in" disabled>
          <div class="tiny muted" style="margin-top:4px">{{ t('birthdayLocked') }}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn" :disabled="!form.firstName.trim() || !form.lastName.trim() || !phoneOk || !emailOk || busy" @click="saveMe">{{ t('save') }}</button>
          <button class="btn ghost" @click="editing = false">{{ t('cancel') }}</button>
        </div>
      </template>
      <template v-else>
        <div>
          <b style="font-size:14px">{{ me?.firstName }} {{ me?.lastName }}</b>
          <div class="tiny muted">{{ [me?.phone, me?.email].filter(Boolean).join(' · ') || t('noPhoneOnFile') }}</div>
          <div v-if="me?.birthday" class="tiny muted">🎂 {{ fmtDate(me.birthday, locale) }}</div>
        </div>
        <button v-if="me?.canEditSelf !== false" class="chip" style="align-self:flex-start" @click="openEdit">✎ {{ t('edit') }}</button>
        <div v-else class="tiny muted">{{ t('selfEditLocked') }}</div>
      </template>
    </div>

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

    <div class="sec-title">{{ t('install') }}</div>
    <div class="note">
      <b>{{ t('installTitle') }}</b>
      <span>{{ t('installBody') }}</span><br>
      <span style="color:var(--danger)">{{ t('installWarn') }}</span>
    </div>
  </AppShell>
</template>
