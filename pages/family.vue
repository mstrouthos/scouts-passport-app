<script setup lang="ts">
/* Public parents' page for the no-account sections (Αγέλη / Μικρή Αγέλη). */
const { t, locale, setLocale } = useI18n()
const lx = useLx()
const route = useRoute()
const slug = ref(String(route.query.section || ''))
const { data, refresh } = await useFetch<any>('/api/family/feed', { query: { section: slug } })
const info = ref<any>(null)
const cfg = useRuntimeConfig()
const subState = ref<'idle' | 'ok' | 'no'>('idle')

async function pick(s: string) { slug.value = s; await refresh() }
async function openInfo(s: string) { info.value = await $fetch(`/api/family/info/${s}`) }
function sub(e: any) {
  const time = e.isAllDay ? t('allDay') : `${fmtTime(e.startsAt)}${e.endsAt ? ' – ' + fmtTime(e.endsAt) : ''}`
  return `${time}${e.location ? ' · ' + e.location : ''}`
}
function b64ToU8(base64: string) {
  const pad = '='.repeat((4 - base64.length % 4) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}
async function enableNotifs() {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !cfg.public.vapidPublicKey) { subState.value = 'no'; return }
    if (await Notification.requestPermission() !== 'granted') { subState.value = 'no'; return }
    const reg = await navigator.serviceWorker.ready
    const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(cfg.public.vapidPublicKey) })
    await $fetch('/api/family/subscribe', { method: 'POST', body: { section: data.value.current.slug, ...s.toJSON() } })
    subState.value = 'ok'
  } catch { subState.value = 'no' }
}
</script>

<template>
  <div class="shell">
    <header class="hero" style="background:var(--grad-auth)">
      <div class="row">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="/images/logo-256.png" alt="" style="width:44px;height:44px;border-radius:50%;border:1.5px solid rgba(255,255,255,.5)">
          <div>
            <h1>{{ t('familyTitle') }}</h1>
            <div class="sub">{{ t('troopName') }}</div>
          </div>
        </div>
        <button class="lang" :aria-label="t('language')" @click="setLocale(locale === 'el' ? 'en' : 'el')">
          <b :class="{ on: locale === 'el' }">ΕΛ</b><b :class="{ on: locale === 'en' }">EN</b>
        </button>
      </div>
    </header>

    <main class="content" style="padding-bottom:40px">
      <div v-if="(data?.sections?.length || 0) > 1" class="seg">
        <button v-for="x in data.sections" :key="x.slug" :class="{ on: data.current.slug === x.slug }"
                @click="pick(x.slug)">{{ lx(x, 'name') }}</button>
      </div>

      <div class="note">
        <b>👋 {{ lx(data?.current, 'name') }}</b>
        {{ t('familyIntro') }}
      </div>

      <button class="srow" :disabled="subState === 'ok'" @click="enableNotifs">
        <div class="ico">🔔</div>
        <div class="txt">
          <b>{{ subState === 'ok' ? t('notifGranted') : t('familyNotif') }}</b>
          <span v-if="subState === 'no'">{{ t('notifUnsupported') }}</span>
          <span v-else>{{ t('familyNotifSub') }}</span>
        </div>
      </button>

      <div class="sec-title" style="display:flex;align-items:center;justify-content:space-between">
        <span>{{ t('calendar') }}</span>
        <a v-if="data?.events?.length" :href="`/api/family/feed.ics?section=${data.current.slug}`" class="chip" style="text-decoration:none">{{ t('addToCalendar') }}</a>
      </div>
      <div v-if="data?.events?.length" class="card" style="display:flex;flex-direction:column;gap:13px">
        <div v-for="e in data.events" :key="e.id" class="ev">
          <div class="date"><b>{{ fmtDay(e.startsAt, locale).d }}</b><span>{{ fmtDay(e.startsAt, locale).m }}</span></div>
          <div class="info"><b>{{ lx(e) }}</b><span>{{ sub(e) }}</span></div>
        </div>
      </div>
      <div v-else class="empty">{{ t('noEvents') }}</div>

      <div class="sec-title">{{ t('info') }}</div>
      <button v-for="p in data?.info" :key="p.slug" class="srow" @click="openInfo(p.slug)">
        <div class="ico">{{ p.icon }}</div>
        <div class="txt"><b>{{ lx(p) }}</b><span>{{ lx(p, 'summary') }}</span></div>
        <span class="chev">›</span>
      </button>
    </main>

    <Teleport to="body">
      <div v-if="info" class="sheet-backdrop" @click.self="info = null">
        <div class="sheet" style="max-height:86dvh;overflow:auto;display:flex;flex-direction:column;gap:13px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ info.icon }} {{ lx(info) }}</h3>
          <UniformArt v-if="info.illustration === 'uniforms'" kind="formal" />
          <InfoBody :text="lx(info, 'body')" />
          <UniformArt v-if="info.illustration === 'uniforms'" kind="work" />
          <button class="btn ghost" @click="info = null">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
