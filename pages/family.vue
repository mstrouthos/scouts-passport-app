<script setup lang="ts">
/* Parents' page. A parent signs in with their own code and sees only the
   section their child is in — programme, announcements and PDF notices. */
const { t, locale, setLocale } = useI18n()
const lx = useLx()
const cfg = useRuntimeConfig()

const me = ref<any>(null)
const posts = ref<any[]>([])
const events = ref<any[]>([])
const code = ref('')
const err = ref('')
const busy = ref(false)
const subState = ref<'idle' | 'ok' | 'no'>('idle')
const openPost = ref<any>(null)

const pack = ref<any>(null)
const info = ref<any[]>([])
const openInfo = ref<any>(null)
async function readInfo(page: any) {
  openInfo.value = await $fetch<any>(`/api/family/info/${page.slug}`, { query: { section: page.sectionId ?? undefined } })
}
async function load() {
  try {
    me.value = await $fetch('/api/family/me')
    // the Αγέλη's own corner — empty for every other sector
    pack.value = await $fetch('/api/family/pack').catch(() => null)
    info.value = await $fetch<any[]>('/api/family/info').catch(() => [])
    ;[posts.value, events.value] = await Promise.all([
      $fetch<any[]>('/api/family/posts'),
      $fetch<any[]>('/api/family/calendar')
    ])
  } catch { me.value = null }
}
onMounted(load)

async function signIn() {
  err.value = ''; busy.value = true
  try {
    await $fetch('/api/family/login', { method: 'POST', body: { passcode: code.value } })
    code.value = ''
    await load()
  } catch (e: any) { err.value = e?.data?.message || t('loginBad') }
  finally { busy.value = false }
}
async function signOut() {
  await $fetch('/api/family/logout', { method: 'POST' })
  me.value = null; posts.value = []; events.value = []
}
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
    await $fetch('/api/family/subscribe', { method: 'POST', body: { section: me.value.section.slug, ...s.toJSON() } })
    subState.value = 'ok'
  } catch { subState.value = 'no' }
}
</script>

<template>
  <div class="shell">
    <header class="hero" style="background:var(--grad-auth)">
      <div class="row">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="/images/logo-256.png" alt="" style="width:44px;height:44px;object-fit:contain">
          <div>
            <h1>{{ t('familyTitle') }}</h1>
            <div class="sub">{{ me?.section ? lx(me.section, 'name') : t('troopName') }}</div>
          </div>
        </div>
        <button class="lang" :aria-label="t('language')" @click="setLocale(locale === 'el' ? 'en' : 'el')">
          <b :class="{ on: locale === 'el' }">ΕΛ</b><b :class="{ on: locale === 'en' }">EN</b>
        </button>
      </div>
    </header>

    <main class="content" style="padding-bottom:40px">
      <!-- not signed in -->
      <template v-if="!me">
        <div class="note"><b>🔐 {{ t('parentSignIn') }}</b>{{ t('parentSignInHelp') }}</div>
        <div><label class="lab">{{ t('passcode') }}</label>
          <input v-model="code" class="in" inputmode="numeric" placeholder="0000-0000" @keyup.enter="signIn"></div>
        <div v-if="err" class="tiny" style="color:var(--danger)">{{ err }}</div>
        <button class="btn" :disabled="!code.trim() || busy" @click="signIn">{{ busy ? t('loading') : t('enter') }}</button>
      </template>

      <!-- signed in -->
      <template v-else>
        <div class="note"><b>👋 {{ me.name }}</b>{{ t('familyIntro') }}</div>

        <button class="srow" :disabled="subState === 'ok'" @click="enableNotifs">
          <div class="ico">🔔</div>
          <div class="txt">
            <b>{{ subState === 'ok' ? t('notifGranted') : t('familyNotif') }}</b>
            <span v-if="subState === 'no'">{{ t('notifUnsupported') }}</span>
            <span v-else>{{ t('familyNotifSub') }}</span>
          </div>
        </button>

        <!-- Αγέλη: what the next meeting is about, the κραυγές, this week's tasks -->
        <template v-if="pack?.isPack">
          <NuxtLink v-if="pack.nextMeeting" to="#" class="banner" style="pointer-events:none">
            <div class="ico">📅</div>
            <div>
              <b>{{ pack.nextMeeting.themeEl || pack.nextMeeting.titleEl }}</b>
              <span>
                {{ t('nextMeeting') }} · {{ fmtDate(pack.nextMeeting.startsAt, locale) }}
                <template v-if="pack.nextMeeting.location"> · {{ pack.nextMeeting.location }}</template>
              </span>
            </div>
          </NuxtLink>

          <template v-if="pack.challenges.length">
            <div class="sec-title">{{ t('weekChallenges') }}</div>
            <div class="card" style="display:flex;flex-direction:column;gap:11px">
              <div v-for="c in pack.challenges" :key="c.id" class="wch">
                <span class="em">{{ c.emoji }}</span>
                <span>{{ c.textEl }}</span>
              </div>
              <div class="tiny muted">{{ t('weekChallengesNote') }}</div>
            </div>
          </template>

          <template v-if="pack.chants.length">
            <div class="sec-title">{{ t('sixChants') }}</div>
            <div class="card" style="display:flex;flex-direction:column;gap:13px">
              <div v-for="c in pack.chants" :key="c.id">
                <b style="font-size:13.5px">{{ c.emblem }} {{ c.nameEl }}</b>
                <p style="margin:3px 0 0;font-size:13px;line-height:1.55;white-space:pre-wrap;color:#44536B">{{ c.chantEl }}</p>
              </div>
            </div>
          </template>
        </template>

        <div class="sec-title">{{ t('announce') }}</div>
        <div v-if="posts.length" class="adm">
          <button v-for="p in posts" :key="p.id" class="it" style="align-items:flex-start" @click="openPost = p">
            <div style="flex:1;min-width:0">
              <b>{{ p.titleEl }}</b>
              <span>{{ fmtDate(p.createdAt, locale) }}<template v-if="p.file"> · 📎 PDF</template></span>
            </div>
            <span class="chev">›</span>
          </button>
        </div>
        <div v-else class="empty">{{ t('noParentPosts') }}</div>

        <template v-if="info.length">
          <div class="sec-title">{{ t('usefulInfo') }}</div>
          <div class="adm">
            <button v-for="p in info" :key="`${p.slug}-${p.sectionId ?? 0}`" class="it" @click="readInfo(p)">
              <div style="font-size:19px;width:26px;text-align:center">{{ p.icon }}</div>
              <div style="flex:1;min-width:0">
                <b>{{ lx(p) }}</b>
                <span>
                  <template v-if="p.sectionEl">{{ p.sectionEl }} · </template>{{ lx(p, 'summary') }}
                </span>
              </div>
              <span class="chev">›</span>
            </button>
          </div>
        </template>

        <div class="sec-title">{{ t('calendar') }}</div>
        <div v-if="events.length" class="card" style="display:flex;flex-direction:column;gap:13px">
          <div v-for="e in events" :key="e.id" class="ev">
            <div class="date"><b>{{ fmtDay(e.startsAt, locale).d }}</b><span>{{ fmtDay(e.startsAt, locale).m }}</span></div>
            <div class="info"><b>{{ lx(e) }}</b><span>{{ sub(e) }}</span></div>
          </div>
        </div>
        <div v-else class="empty">{{ t('noEvents') }}</div>

        <button class="btn ghost" @click="signOut">{{ t('logout') }}</button>
      </template>
    </main>

    <Teleport to="body">
      <div v-if="openInfo" class="sheet-backdrop" @click.self="openInfo = null">
        <div class="sheet" style="max-height:86dvh;overflow:auto;display:flex;flex-direction:column;gap:13px">
          <div style="text-align:center;font-size:32px">{{ openInfo.icon }}</div>
          <h3 style="margin:0;font-size:17px;text-align:center">{{ lx(openInfo) }}</h3>
          <p style="font-size:13.5px;line-height:1.6;white-space:pre-wrap;margin:0">{{ lx(openInfo, 'body') }}</p>
          <button class="btn ghost" @click="openInfo = null">{{ t('close') }}</button>
        </div>
      </div>

      <div v-if="openPost" class="sheet-backdrop" @click.self="openPost = null">
        <div class="sheet" style="max-height:86dvh;overflow:auto;display:flex;flex-direction:column;gap:13px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ openPost.titleEl }}</h3>
          <p v-if="openPost.bodyEl" style="font-size:13.5px;line-height:1.6;white-space:pre-wrap;margin:0">{{ openPost.bodyEl }}</p>
          <a v-if="openPost.file" :href="`/api/files/${openPost.file.id}`" target="_blank" rel="noopener" class="btn">
            📎 {{ t('openPdf') }}
          </a>
          <button class="btn ghost" @click="openPost = null">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.wch{display:flex; gap:11px; align-items:flex-start; font-size:13.5px; line-height:1.5}
.wch .em{font-size:18px; flex:none}
</style>
