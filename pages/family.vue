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
const { resync: resyncPush } = usePushResync()
watch(me, v => { if (v) resyncPush() })
const posts = ref<any[]>([])
const events = ref<any[]>([])
const code = ref('')
const err = ref('')
const busy = ref(false)
const subState = ref<'idle' | 'ok' | 'no'>('idle')
const openPost = ref<any>(null)
const openEvent = ref<any>(null)

const pack = ref<any>(null)
const info = ref<any[]>([])
const openInfo = ref<any>(null)
const settingsOpen = ref(false)

/* The bell, as the members have it: recent notifications, unread count,
   tap to mark read and expand. */
const notifs = ref<any[]>([])
const notifOpen = ref(false)
const expanded = ref<number | null>(null)
const unread = computed(() => notifs.value.filter(n => !n.read).length)
async function loadNotifs() {
  try { notifs.value = await $fetch<any[]>('/api/family/notifications') } catch { notifs.value = [] }
}
/* swiped away: read, and out of the bell for good */
function dismissNotif(n: any) {
  notifs.value = notifs.value.filter(x => x.id !== n.id)
  $fetch(`/api/family/notifications/${n.id}/dismiss`, { method: 'POST' }).catch(() => {})
}
function readAll() {
  if (!unread.value) return
  notifs.value.forEach(n => { n.read = true })
  $fetch('/api/family/notifications/read-all', { method: 'POST' }).catch(() => {})
}
async function toggleNotif(n: any) {
  if (!n.read) { n.read = true; $fetch(`/api/family/notifications/${n.id}`, { method: 'POST' }).catch(() => {}) }
  expanded.value = expanded.value === n.id ? null : n.id
}
/* forms sent to the family: what still waits for an answer, and what they
   have sent from here — theirs to read again, never to change */
const forms = ref<{ pending: any[], done: any[] }>({ pending: [], done: [] })
const formsOpen = ref(false)
const openAnswer = ref<any>(null)
const formBusy = ref<number | null>(null)
const formErr = ref('')
async function loadForms() {
  try { forms.value = await $fetch<any>('/api/family/forms') } catch {}
}
// the form opens on its own address, with this parent's ticket on the link
async function openForm(formId: number) {
  formBusy.value = formId; formErr.value = ''
  try {
    const { url } = await $fetch<{ url: string }>(`/api/family/forms/${formId}/link`)
    window.location.href = url
  } catch (e: any) { formErr.value = errMsg(e) } finally { formBusy.value = null }
}
async function readAnswer(id: number) {
  formErr.value = ''
  try { openAnswer.value = await $fetch<any>(`/api/family/forms/responses/${id}`) } catch (e: any) { formErr.value = errMsg(e) }
}
const isFormNote = (n: any) => n.kind === 'formInvite' || n.kind === 'formReminder'
const sentForm = (formId: number) => forms.value.done.some(d => d.formId === formId)
const fetchOwnFile = (id: number) => $fetch<Blob>(`/api/family/forms/files/${id}`, { responseType: 'blob' })
// back from sending one: it moves from waiting to sent
function onVisible() { if (document.visibilityState === 'visible' && me.value) loadForms() }
onMounted(() => document.addEventListener('visibilitychange', onVisible))
onUnmounted(() => document.removeEventListener('visibilitychange', onVisible))
function fmtWhen(iso: string) {
  const d = new Date(iso), diff = (Date.now() - d.getTime()) / 60000
  if (diff < 60) return `${Math.max(1, Math.round(diff))}′`
  if (diff < 60 * 24) return `${Math.round(diff / 60)}h`
  return fmtDate(iso, locale.value)
}

/* Which child the page is about. Everything below filters on their sector;
   troop-wide items (sectionId null) show for every child. */
const childId = ref<number | null>(null)
const children = computed<any[]>(() => me.value?.children || [])
const child = computed(() => children.value.find((c: any) => c.id === childId.value) || children.value[0] || null)
const childSection = computed(() => child.value?.section ?? me.value?.section ?? null)
const forChild = (sectionId: number | null | undefined) => sectionId == null || sectionId === childSection.value?.id
// a form for one sector waits under that child only, like the posts and the diary
const shownForms = computed(() => forms.value.pending.filter((f: any) => !f.sectionIds || f.sectionIds.some((x: number) => forChild(x))))
const shownPosts = computed(() => posts.value.filter(p => forChild(p.sectionId)))
const isPast = (e: any) => eventEnded(e)
// a joint event is in the diary of every sector it is for
const evForChild = (e: any) => e.sectionIds?.length ? e.sectionIds.some((x: number) => forChild(x)) : forChild(e.sectionId)
const shownEvents = computed(() => events.value.filter(e => evForChild(e) && !isPast(e)))
/* What already happened stays reachable — newest first, folded away until asked for. */
const pastEvents = computed(() => events.value.filter(e => evForChild(e) && isPast(e)).reverse())
const archiveOpen = ref(false)
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
    loadNotifs()
    loadForms()
    ;[posts.value, events.value] = await Promise.all([
      $fetch<any[]>('/api/family/posts'),
      $fetch<any[]>('/api/family/calendar')
    ])
  } catch (e: any) {
    const status = e?.response?.status ?? e?.statusCode ?? 0
    // a real "no" shows the passcode screen; a server we could not reach
    // keeps whatever we last knew and tries again
    if (status === 401 || status === 403) { me.value = null; try { localStorage.removeItem('family-cache') } catch {} }
    else {
      try { const raw = localStorage.getItem('family-cache'); if (raw && !me.value) me.value = JSON.parse(raw) } catch {}
      offline.value = true; setTimeout(load, 8000)
    }
    return
  }
  offline.value = false
  try { localStorage.setItem('family-cache', JSON.stringify(me.value)) } catch {}
  await ensureSessionToken()
}
const offline = ref(false)
onMounted(load)

async function signIn() {
  err.value = ''; busy.value = true
  try {
    writeSessionToken(null)
    await $fetch('/api/family/login', { method: 'POST', body: { passcode: code.value } })
    code.value = ''
    await load()
  } catch (e: any) { const st = Number(e?.statusCode) || 0; err.value = st >= 400 && st < 500 ? (e?.data?.message || t('loginBad')) : errMsg(e) }
  finally { busy.value = false }
}
async function signOut() {
  await $fetch('/api/family/logout', { method: 'POST' })
  me.value = null; posts.value = []; events.value = []
  try { localStorage.removeItem('family-cache') } catch {}
  writeSessionToken(null)
}
function sub(e: any) {
  const time = fmtSpan(e, locale, t('allDay'))
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
    const reg = await pushRegistration()
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
          <!-- the same icons the members' header uses -->
          <button v-if="me" class="iconbtn" style="position:relative" :aria-label="t('notifications')" @click="notifOpen = true; loadNotifs()">
            <NavIcon name="bell" /><span v-if="unread" class="notif-dot">{{ unread > 9 ? '9+' : unread }}</span>
          </button>
          <button v-if="me" class="iconbtn" :aria-label="t('settings')" @click="settingsOpen = true"><NavIcon name="gear" /></button>
        </div>
      </div>
    </header>

    <main class="content" style="padding-bottom:40px">
      <div v-if="offline && me" class="note" style="background:var(--gold-soft)">📡 {{ t('offlineNoteParent') }}</div>
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

        <!-- forms sent to the family that still wait for an answer -->
        <template v-if="shownForms.length">
          <div class="sec-title">📋 {{ t('formsPending') }}</div>
          <button v-for="f in shownForms" :key="f.formId" class="banner" style="width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer"
                  :disabled="formBusy === f.formId" @click="openForm(f.formId)">
            <div class="ico">📝</div>
            <div style="flex:1;min-width:0">
              <b>{{ f.title }}</b>
              <span>{{ t('formSentOn', { date: fmtDate(f.sentAt, locale) }) }}<template v-if="f.closesAt"> · {{ t('formClosesOn', { date: fmtDate(f.closesAt, locale) }) }}</template></span>
            </div>
            <span class="chev">{{ formBusy === f.formId ? '…' : '›' }}</span>
          </button>
        </template>
        <div v-if="formErr && !openAnswer" class="tiny" style="color:var(--danger)">{{ formErr }}</div>

        <!-- what is next for this child, whichever sector they are in -->
        <template v-if="nextEvent">
          <div class="sec-title">{{ t('nextActivity') }}</div>
          <button class="banner" style="width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer" @click="openEvent = nextEvent">
            <div class="ico">📅</div>
            <div>
              <b>{{ nextEvent.themeEl || lx(nextEvent) }}</b>
              <span>{{ fmtDate(nextEvent.startsAt, locale) }} · {{ sub(nextEvent) }}</span>
            </div>
          </button>
        </template>

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

        <div class="sec-title">{{ t('parentPosts') }}</div>
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
        </div>
        <div v-if="shownEvents.length" class="card" style="display:flex;flex-direction:column;gap:13px">
          <!-- tap for the details; the calendar button lives in there -->
          <button v-for="e in shownEvents" :key="e.id" class="ev" @click="openEvent = e">
            <div class="date"><b>{{ fmtDay(e.startsAt, locale).d }}</b><span>{{ fmtDay(e.startsAt, locale).m }}</span></div>
            <div class="info">
              <b>{{ lx(e) }}</b>
              <span>{{ sub(e) }}</span>
            </div>
            <span class="chev">›</span>
          </button>
        </div>
        <div v-else class="empty">{{ t('noEvents') }}</div>

        <template v-if="pastEvents.length">
          <button class="sec-title" style="display:flex;justify-content:space-between;align-items:center;width:100%;background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer" @click="archiveOpen = !archiveOpen">
            <span>🗄️ {{ t('pastEvents') }} · {{ pastEvents.length }}</span><span class="chev" :style="archiveOpen ? 'transform:rotate(90deg)' : ''">›</span>
          </button>
          <div v-if="archiveOpen" class="card" style="display:flex;flex-direction:column;gap:13px;opacity:.85">
            <button v-for="e in pastEvents" :key="e.id" class="ev" @click="openEvent = e">
              <div class="date"><b>{{ fmtDay(e.startsAt, locale).d }}</b><span>{{ fmtDay(e.startsAt, locale).m }}</span></div>
              <div class="info"><b>{{ lx(e) }}</b><span>{{ fmtDate(e.startsAt, locale) }} · {{ sub(e) }}</span></div>
              <span class="chev">›</span>
            </button>
          </div>
        </template>

        <!-- forms already sent: their own open read-only, the other parent's are only named -->
        <template v-if="forms.done.length">
          <button class="sec-title" style="display:flex;justify-content:space-between;align-items:center;width:100%;background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer" @click="formsOpen = !formsOpen">
            <span>✅ {{ t('formsDone') }} · {{ forms.done.length }}</span><span class="chev" :style="formsOpen ? 'transform:rotate(90deg)' : ''">›</span>
          </button>
          <div v-if="formsOpen" class="adm">
            <component :is="d.id ? 'button' : 'div'" v-for="(d, i) in forms.done" :key="d.id ?? `o${i}`" class="it" @click="d.id && readAnswer(d.id)">
              <div style="font-size:19px;width:26px;text-align:center">📋</div>
              <div style="flex:1;min-width:0">
                <b>{{ d.title }}</b>
                <span>{{ fmtDate(d.createdAt, locale) }} · {{ fmtTime(d.createdAt) }}<template v-if="d.by"> · {{ t('formSentBy', { name: d.by }) }}</template></span>
              </div>
              <span v-if="d.id" class="chev">›</span>
            </component>
          </div>
        </template>
      </template>
    </main>

    <!-- once per device: how to turn notifications on -->
    <NotifPrompt v-if="me" kind="family" :section="childSection?.slug" />

    <Teleport to="body">
      <div v-if="notifOpen" class="sheet-backdrop" @click.self="notifOpen = false">
        <div class="sheet" style="max-height:80dvh;overflow:auto;display:flex;flex-direction:column;gap:10px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('notifications') }}</h3>
          <template v-if="notifs.length">
            <div class="tiny muted" style="text-align:center;margin-top:-4px">{{ t('notifSwipeHintParent') }}</div>
            <button v-if="unread" class="btn ghost" style="align-self:center;width:auto;padding:8px 16px;font-size:13px" @click="readAll">✓ {{ t('notifReadAll') }}</button>
            <SwipeRow v-for="n in notifs" :key="n.id" @swiped="dismissNotif(n)">
            <button class="notif-row" :class="{ unread: !n.read }" @click="toggleNotif(n)">
              <div class="notif-dotmark" :class="{ on: !n.read }" />
              <div style="flex:1;min-width:0">
                <div style="display:flex;justify-content:space-between;gap:8px">
                  <b style="font-size:13px">{{ n.title }}</b>
                  <span class="tiny muted" style="flex:none">{{ fmtWhen(n.createdAt) }}</span>
                </div>
                <p style="margin:3px 0 0;font-size:12.5px;color:var(--muted)"
                   :style="expanded === n.id ? 'white-space:normal' : 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis'">
                  {{ n.body }}
                </p>
                <!-- a form sent to the family opens from here -->
                <!-- (once the family has sent it, it says so instead) -->
                <div v-if="isFormNote(n) && sentForm(n.refId)" class="tiny" style="margin-top:8px;color:var(--green);font-weight:700">✅ {{ t('formAlreadySent') }}</div>
                <button v-else-if="isFormNote(n)" class="btn" style="margin-top:8px;font-size:13px" :disabled="formBusy === n.refId" @click.stop="openForm(n.refId)">📋 {{ t('formFillNow') }}</button>
                <div v-if="isFormNote(n) && formErr && formBusy === null" class="tiny" style="color:var(--danger);margin-top:4px">{{ formErr }}</div>
              </div>
            </button>
            </SwipeRow>
          </template>
          <div v-else class="empty">{{ t('noNotifs') }}</div>
          <button class="btn ghost" @click="notifOpen = false">{{ t('close') }}</button>
        </div>
      </div>

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

      <!-- their own answers, as they were sent -->
      <div v-if="openAnswer" class="sheet-backdrop" @click.self="openAnswer = null">
        <div class="sheet" style="max-height:88dvh;overflow:auto;display:flex;flex-direction:column;gap:13px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ openAnswer.formTitle }}</h3>
          <div class="tiny muted" style="text-align:center;margin-top:-6px">{{ t('formYourAnswers') }} · {{ fmtDate(openAnswer.createdAt, locale) }} · {{ fmtTime(openAnswer.createdAt) }}</div>
          <FormAnswers :r="openAnswer" :fetch-file="fetchOwnFile" />
          <div class="tiny muted" style="text-align:center">🔒 {{ t('formReadOnly') }}</div>
          <button class="btn ghost" @click="openAnswer = null">{{ t('close') }}</button>
        </div>
      </div>

      <div v-if="openInfo" class="sheet-backdrop" @click.self="openInfo = null">
        <div class="sheet" style="max-height:86dvh;overflow:auto;display:flex;flex-direction:column;gap:13px">
          <div style="text-align:center;font-size:32px">{{ openInfo.icon }}</div>
          <h3 style="margin:0;font-size:17px;text-align:center">{{ lx(openInfo) }}</h3>
          <!-- the same page the members see: its drawings, and its headings and lists laid out -->
          <UniformArt v-if="openInfo.illustration === 'uniforms'" kind="formal" />
          <InfoBody :text="lx(openInfo, 'body')" />
          <UniformArt v-if="openInfo.illustration === 'uniforms'" kind="work" />
          <button class="btn ghost" @click="openInfo = null">{{ t('close') }}</button>
        </div>
      </div>

      <div v-if="openEvent" class="sheet-backdrop" @click.self="openEvent = null">
        <div class="sheet" style="max-height:86dvh;overflow:auto;display:flex;flex-direction:column;gap:12px">
          <div style="text-align:center;font-size:32px">📅</div>
          <h3 style="margin:0;font-size:17px;text-align:center">{{ openEvent.themeEl || lx(openEvent) }}</h3>
          <div class="tiny muted" style="text-align:center">{{ fmtDate(openEvent.startsAt, locale) }} · {{ sub(openEvent) }}</div>
          <div v-if="openEvent.themeEl" style="font-size:13.5px"><b>{{ t('meetingTheme') }}:</b> {{ openEvent.themeEl }}</div>
          <p v-if="openEvent.descriptionEl" style="margin:0;font-size:13.5px;line-height:1.6;white-space:pre-wrap">{{ openEvent.descriptionEl }}</p>
          <AddToCalendar :event="openEvent" />
          <button class="btn ghost" @click="openEvent = null">{{ t('close') }}</button>
        </div>
      </div>

      <div v-if="openPost" class="sheet-backdrop" @click.self="openPost = null">
        <div class="sheet" style="max-height:86dvh;overflow:auto;display:flex;flex-direction:column;gap:13px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ openPost.titleEl }}</h3>
          <p v-if="openPost.bodyEl" style="font-size:13.5px;line-height:1.6;white-space:pre-wrap;margin:0">{{ openPost.bodyEl }}</p>
          <template v-if="openPost.file">
            <!-- the PDF right here; iOS Safari draws it in the frame, Android's
                 Chrome may need the download instead — both buttons stay -->
            <iframe :src="`/api/files/${openPost.file.id}`" :title="openPost.file.name" class="pdf" />
            <div style="display:flex;gap:8px">
              <a :href="`/api/files/${openPost.file.id}`" target="_blank" rel="noopener" class="btn" style="flex:1;text-decoration:none">📎 {{ t('openPdf') }}</a>
              <a :href="`/api/files/${openPost.file.id}?download=1`" class="btn ghost" style="flex:1;text-decoration:none">⬇ {{ t('downloadPdf') }}</a>
            </div>
          </template>
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
.notif-dot{
  position:absolute; top:-4px; right:-4px; min-width:16px; height:16px; padding:0 3px; border-radius:999px;
  background:var(--danger); color:#fff; font-size:9px; font-weight:700; display:grid; place-items:center; line-height:1;
}
.notif-row{
  background:var(--card); border:0; border-radius:16px; padding:11px 13px; display:flex; gap:10px; align-items:flex-start;
  width:100%; text-align:left; box-shadow:var(--shadow-sm);
}
.notif-row.unread{background:var(--accent-soft)}
.notif-dotmark{flex:none; width:8px; height:8px; border-radius:50%; margin-top:5px; background:transparent}
.notif-dotmark.on{background:var(--accent)}
.ev{background:none;border:0;padding:0;width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer}
.ev .chev{flex:none;align-self:center;color:var(--muted);font-size:18px}
.pdf{width:100%; height:52dvh; border:1px solid var(--line); border-radius:12px; background:#fff}
</style>
