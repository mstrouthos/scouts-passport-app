<script setup lang="ts">
/* Shown once per device, the first time someone lands signed in: how to turn
   notifications on, and a button that does it. Members, Βαθμοφόροι and
   parents all get it — parents subscribe through their own endpoint, tied to
   the child's sector. Never shown again after Ενεργοποίηση or Αργότερα, and
   not at all where permission is already granted or the browser cannot. */
const props = defineProps<{ kind: 'member' | 'family', section?: string | null }>()
const { t } = useI18n()
const cfg = useRuntimeConfig()
const open = ref(false)
const busy = ref(false)
const KEY = 'notifPromptSeen'

onMounted(() => {
  try {
    if (localStorage.getItem(KEY)) return
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !cfg.public.vapidPublicKey) return
    if (Notification.permission === 'granted') { localStorage.setItem(KEY, '1'); return }
    open.value = true
  } catch { /* storage blocked: stay quiet rather than nag every load */ }
})
function seen() { try { localStorage.setItem(KEY, '1') } catch {} ; open.value = false }
function b64ToU8(base64: string) {
  const pad = '='.repeat((4 - base64.length % 4) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}
async function enable() {
  busy.value = true
  try {
    if (await Notification.requestPermission() !== 'granted') { seen(); return }
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(cfg.public.vapidPublicKey) })
    if (props.kind === 'family')
      await $fetch('/api/family/subscribe', { method: 'POST', body: { section: props.section, ...sub.toJSON() } })
    else
      await $fetch('/api/push/subscribe', { method: 'POST', body: sub.toJSON() })
  } catch { /* the settings screen offers it again */ }
  finally { busy.value = false; seen() }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="sheet-backdrop" @click.self="seen">
      <div class="sheet" style="display:flex;flex-direction:column;gap:12px">
        <div style="text-align:center;font-size:34px">🔔</div>
        <h3 style="margin:0;font-size:17px;text-align:center">{{ t('notifPromptTitle') }}</h3>
        <p style="margin:0;font-size:13.5px;line-height:1.55;text-align:center;color:var(--muted)">{{ t('notifPromptBody') }}</p>
        <div class="note" style="font-size:12.5px">{{ t('notifPromptIos') }}</div>
        <button class="btn" :disabled="busy" @click="enable">{{ busy ? t('loading') : t('notifPromptEnable') }}</button>
        <button class="btn ghost" @click="seen">{{ t('notifPromptLater') }}</button>
      </div>
    </div>
  </Teleport>
</template>
