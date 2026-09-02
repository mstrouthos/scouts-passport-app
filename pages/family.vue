<script setup lang="ts">
/* Parents' page. A parent signs in with their own code and reads it one child
   at a time: a family may have a λυκόπουλο and a πρόσκοπο, and the two
   programmes share nothing, so the page is scoped to whichever child is
   selected — their sector's next event, notices, pages and diary, plus
   whatever is for the whole troop. */
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
const settingsOpen = ref(false)

/* Which child the page is about. Everything below filters on their sector;
   troop-wide items (sectionId null) show for every child. */
const childId = ref<number | null>(null)
const children = computed<any[]>(() => me.value?.children || [])
const child = computed(() => children.value.find((c: any) => c.id === childId.value) || children.value[0] || null)
const childSection = computed(() => child.value?.section ?? me.value?.section ?? null)
const forChild = (sectionId: number | null | undefined) => sectionId == null || sectionId === childSection.value?.id
const shownPosts = computed(() => posts.value.filter(p => forChild(p.sectionId)))
const shownEvents = computed(() => events.value.filter(e => forChild(e.sectionId)))
const shownInfo = computed(() => info.value.filter(p => forChild(p.sectionId)))
const shownPacks = computed(() => (pack.value?.packs || []).filter((pk: any) => pk.sectionId === childSection.value?.id))
/* What is coming up next for this child — the first thing in their diary. */
const nextEvent = computed(() => shownEvents.value[0] || null)
async function readInfo(page: any) {
  openInfo.value = await $fetch<any>(`/api/family/info/${page.slug}`, { query: { section: page.sectionId ?? undefined } })
}
async function load() {
  try {
    me.value = await $fetch('/api/family/me')
    if (childId.value == null || !children.value.some((c: any) => c.id === childId.value))
      childId.value = children.value[0]?.id ?? null
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
    await $fetch('/api/family/subscribe', { method: 'POST', body: { section: childSection.value?.slug, ...s.toJSON() } })
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
            <div class="sub">{{ childSection ? lx(childSection, 'name') : t('troopName') }}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <button class="lang" :aria-label="t('language')" @click="setLocale(locale === 'el' ? 'en' : 'el')">
            <b :class="{ on: locale === 'el' }">ΕΛ</b><b :class="{ on: locale === 'en' }">EN</b>
          </button>
          <button v-if="me" class="iconbtn" :aria-label="t('settings')" @click="settingsOpen = true">⚙️</button>
        </div>
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

        <!-- one child at a time: a family may have one in the Αγέλη and one in
             the Ομάδα, and nothing below is shared between the two -->
        <div v-if="children.length > 1" class="chips">
          <button v-for="c in children" :key="c.id" class="chip" :class="{ on: c.id === child?.id }" @click="childId = c.id">
            {{ c.firstName }}<template v-if="c.section"> · {{ lx(c.section, 'name') }}</template>
          </button>
        </div>
        <div v-else-if="child" class="tiny muted" style="padding:0 2px">
          👦 {{ child.firstName }} {{ child.lastName }}<template v-if="child.section"> · {{ lx(child.section, 'name') }}</template>
        </div>

        <!-- what is next for this child, whichever sector they are in -->
        <div v-if="nextEvent" class="banner" style="pointer-events:none">
          <div class="ico">📅</div>
          <div>
            <b>{{ nextEvent.themeEl || lx(nextEvent) }}</b>
            <span>
              {{ t('nextMeeting') }} · {{ fmtDate(nextEvent.startsAt, locale) }} · {{ sub(nextEvent) }}
            </span>
          </div>
        </div>

        <!-- Αγέλη and Μικρή Αγέλη: those children never sign in, so this
             week's tasks are read here -->
        <template v-for="pk in shownPacks" :key="pk.sectionId">
          <template v-if="pk.challenges.length">
            <div class="sec-title">{{ t('weekChallenges') }}</div>
            <div class="card" style="display:flex;flex-direction:column;gap:11px">
              <div v-for="c in pk.challenges" :key="c.id" class="wch">
                <span class="em">{{ c.emoji }}</span>
                <span>{{ c.textEl }}</span>
              </div>
              <div class="tiny muted">{{ t('weekChallengesNote') }}</div>
            </div>
          </template>
        </template>

        <div class="sec-title">{{ t('announce') }}</div>
        <div v-if="shownPosts.length" class="adm">
          <button v-for="p in shownPosts" :key="p.id" class="it" style="align-items:flex-start" @click="openPost = p">
            <div style="flex:1;min-width:0">
              <b>{{ p.titleEl }}</b>
              <span>{{ fmtDate(p.createdAt, locale) }}<template v-if="p.file"> · 📎 PDF</template></span>
            </div>
            <span class="chev">›</span>
          </button>
        </div>
        <div v-else class="empty">{{ t('noParentPosts') }}</div>

        <template v-if="shownInfo.length">
          <div class="sec-title">{{ t('usefulInfo') }}</div>
          <div class="adm">
            <button v-for="p in shownInfo" :key="`${p.slug}-${p.sectionId ?? 0}`" class="it" @click="readInfo(p)">
              <div style="font-size:19px;width:26px;text-align:center">{{ p.icon }}</div>
              <div style="flex:1;min-width:0">
                <b>{{ lx(p) }}</b>
                <span>
                  {{ lx(p, 'summary') }}
                </span>
              </div>
              <span class="chev">›</span>
            </button>
          </div>
        </template>

        <div class="sec-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>{{ t('calendar') }}</span>
          <!-- the whole diary into the phone's calendar app, one child at a time -->
          <a v-if="shownEvents.length" class="chip" target="_blank" rel="noopener" style="text-decoration:none"
             :href="`/api/family/calendar.ics${childSection ? '?section=' + childSection.id : ''}`">{{ t('addToCalendar') }}</a>
        </div>
        <div v-if="shownEvents.length" class="card" style="display:flex;flex-direction:column;gap:13px">
          <div v-for="e in shownEvents" :key="e.id" class="ev">
            <div class="date"><b>{{ fmtDay(e.startsAt, locale).d }}</b><span>{{ fmtDay(e.startsAt, locale).m }}</span></div>
            <div class="info">
              <b>{{ lx(e) }}</b>
              <span>{{ sub(e) }}</span>
              <p v-if="e.descriptionEl" class="desc">{{ e.descriptionEl }}</p>
            </div>
            <a class="dl" :href="`/api/family/calendar.ics?event=${e.id}`" target="_blank" rel="noopener" :aria-label="t('addToCalendar')">⬇</a>
          </div>
        </div>
        <div v-else class="empty">{{ t('noEvents') }}</div>
      </template>
    </main>

    <Teleport to="body">
      <div v-if="settingsOpen" class="sheet-backdrop" @click.self="settingsOpen = false">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('settings') }}</h3>
          <button class="srow" :disabled="subState === 'ok'" @click="enableNotifs">
            <div class="ico">🔔</div>
            <div class="txt">
              <b>{{ subState === 'ok' ? t('notifGranted') : t('familyNotif') }}</b>
              <span v-if="subState === 'no'">{{ t('notifUnsupported') }}</span>
              <span v-else>{{ t('familyNotifSub') }}</span>
            </div>
          </button>
          <button class="btn ghost" @click="settingsOpen = false; signOut()">{{ t('logout') }}</button>
          <button class="btn ghost" @click="settingsOpen = false">{{ t('close') }}</button>
        </div>
      </div>

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
.desc{margin:4px 0 0; font-size:12px; line-height:1.5; color:var(--muted); white-space:pre-wrap}
.ev{position:relative}
.dl{
  flex:none; align-self:center; width:30px; height:30px; border-radius:9px; display:grid; place-items:center;
  color:var(--accent-deep); background:var(--bg2); text-decoration:none; font-size:14px;
}
.iconbtn{
  width:38px; height:38px; border-radius:12px; border:1px solid rgba(255,255,255,.35);
  background:rgba(255,255,255,.14); color:#fff; font-size:17px; display:grid; place-items:center;
}
</style>
