<script setup lang="ts">
/* Φωτογραφικό κυνήγι — twice a week, Monday to Friday, the game asks for a
   photo of something (utils/photoGame.ts). Taken there and then with the
   app's own camera, never from the gallery; until three have it, Gemini
   checks the thing is really in it, and the first three right win 5, 4 and
   3 XP — after that a photo is only kept, to show. Three tries each. Each
   learns their own place at once; everyone sees the places, and all the
   photos, when the round ends.
   An admin can ask for a photo at any time. The camera is asked for as the
   game opens — not when the call comes, when a prompt would cost the race —
   and each camera can be tried once with a test photo that goes nowhere. */

const { t, locale } = useI18n()
const { show } = useToast()
const route = useRoute()
const { data, refresh } = await useFetch<any>('/api/admin/photo')

const round = computed(() => data.value?.round || null)
const mine = computed(() => round.value?.mine || null)
const canShoot = computed(() => !!data.value?.plays && !!round.value && !mine.value?.won && !mine.value?.kept && (mine.value?.left ?? 0) > 0)
const until = (iso: string) => new Date(iso).toLocaleTimeString(locale.value === 'en' ? 'en-GB' : 'el-GR', { timeZone: 'Europe/Nicosia', hour: '2-digit', minute: '2-digit', hour12: false })
const medal = (p: number) => ['🥇', '🥈', '🥉'][p - 1] || ''

/* keep up with the others while a round is on */
let poll: any = 0
onMounted(() => { poll = setInterval(() => { if (document.visibilityState === 'visible' && !judging.value && !camera.value) refresh() }, 15000) })
onBeforeUnmount(() => clearInterval(poll))

/* ---- the camera, then the judge ---- */
const camera = ref(false)
const judging = ref(false)
const verdict = ref<any>(null)
async function shot(b: Blob) {
  camera.value = false
  judging.value = true
  verdict.value = null
  try {
    const bytes = new Uint8Array(await b.arrayBuffer())
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    const r = await $fetch<any>('/api/admin/photo/shot', { method: 'POST', body: { dataBase64: btoa(bin) } })
    verdict.value = r
    sfx(r.ok && r.place ? 'fanfare' : r.ok ? 'correct' : 'wrong')
  } catch (e: any) { show(errMsg(e)) }
  finally { judging.value = false; await refresh() }
}

/* ---- how it is played: the video, by itself until it has been seen ---- */
const rulesOpen = ref(false)
const rulesAuto = ref(false)
function closeRules() {
  rulesOpen.value = false
  if (rulesAuto.value) { rulesAuto.value = false; checkCamera() }
}

/* ---- the camera, asked for now: ready when the call comes ---- */
type CamState = 'idle' | 'checking' | 'ok' | 'denied' | 'none' | 'ask'
const cam = ref<CamState>('idle')
const ua = import.meta.client ? navigator.userAgent : ''
const isIos = /iPhone|iPad|iPod/.test(ua) || (import.meta.client && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
async function checkCamera(direct = false) {
  if (!navigator.mediaDevices?.getUserMedia) { cam.value = 'none'; return }
  if (!direct) {
    try {
      const p = await navigator.permissions?.query({ name: 'camera' as PermissionName })
      if (p?.state === 'granted') { cam.value = 'ok'; return }
      if (p?.state === 'denied') { cam.value = 'denied'; return }
    } catch {}
  }
  cam.value = 'checking'
  try {
    const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
    st.getTracks().forEach(tr => tr.stop())
    cam.value = 'ok'
  } catch (e: any) {
    cam.value = e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'denied'
      : e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError' ? 'none' : 'ask'
  }
}

/* ---- a test photo with each camera, once: it goes nowhere ---- */
type Facing = 'environment' | 'user'
const TEST_KEY = (f: Facing) => `photo.test.${f}`
const tested = ref<Record<Facing, boolean>>({ environment: false, user: false })
const testShots = ref<Partial<Record<Facing, string>>>({})
const testing = ref<Facing | null>(null)
function testDone(b: Blob, f: Facing) {
  testing.value = null
  tested.value = { ...tested.value, [f]: true }
  try { localStorage.setItem(TEST_KEY(f), '1') } catch {}
  if (testShots.value[f]) URL.revokeObjectURL(testShots.value[f]!)
  testShots.value = { ...testShots.value, [f]: URL.createObjectURL(b) }
  cam.value = 'ok'
  sfx('correct')
}
const bothTested = computed(() => tested.value.environment && tested.value.user)

onMounted(() => {
  for (const f of ['environment', 'user'] as Facing[]) { try { tested.value[f] = localStorage.getItem(TEST_KEY(f)) === '1' } catch {} }
  if (!data.value?.plays) return
  // the video first, for whoever has not seen it (or came from the news of it); the camera after
  if (data.value.video || route.query.intro) { rulesAuto.value = !!data.value.video; rulesOpen.value = true }
  if (!rulesAuto.value) checkCamera()
})
onBeforeUnmount(() => { for (const u of Object.values(testShots.value)) if (u) URL.revokeObjectURL(u) })

/* ---- an admin asks for a photo now ---- */
const starting = ref(false)
async function startNow() {
  if (!confirmStart.value) { confirmStart.value = true; return }
  confirmStart.value = false
  starting.value = true
  try {
    const r = await $fetch<any>('/api/admin/photo/start', { method: 'POST' })
    show(`📸 ${t('photoStarted', { what: r.thing })}`, 3000)
    await refresh()
  } catch (e: any) { show(errMsg(e)) } finally { starting.value = false }
}
const confirmStart = ref(false)
const zoom = ref('')

const weekRows = computed(() => (data.value?.week || []).map((r: any) => ({ ...r, value: String(r.points), unit: 'XP', sub: t('photoWins', { n: r.wins }) })))
</script>

<template>
  <GameScreen game="photo" :title="t('photoTitle')" :sub="t('photoSub')">
    <button class="info" :aria-label="t('photoHowTitle')" @click="rulesOpen = true">ℹ️ {{ t('photoHowTitle') }}</button>
    <!-- not let in yet: it is coming -->
    <div v-if="data && !data.access" class="card soon">
      <div class="big">📸</div>
      <b>{{ t('photoSoonTitle') }}</b>
      <p>{{ t('photoSoonBody') }}</p>
    </div>

    <template v-else-if="data">
      <!-- the round in play -->
      <div v-if="round" class="card ask">
        <div class="tag">{{ round.byAdmin ? t('photoByAdmin') : t('photoRoundOn') }} · {{ t('photoUntil', { t: until(round.endsAt) }) }}</div>
        <div class="what"><span class="emo">{{ round.thing?.emoji }}</span><span>{{ t('photoFind') }} <b>{{ round.thing?.el }}</b>!</span></div>
        <div class="hidden">🔒 {{ t('photoHidden') }}<span v-if="round.played"> · {{ t('photoPlayed', { n: round.played }) }}</span></div>

        <template v-if="!data.plays">
          <div class="tiny muted">{{ t('photoAdminOnly') }}</div>
        </template>
        <template v-else-if="mine?.won">
          <div class="won">{{ medal(mine.won.place) }} {{ t('photoYouWon', { place: mine.won.place, n: mine.won.points }) }}<small>{{ t('photoRevealLater') }}</small></div>
        </template>
        <template v-else-if="mine?.kept">
          <div class="won kept">📨 {{ t('photoKept') }}<small>{{ t('photoRevealLater') }}</small></div>
        </template>
        <template v-else-if="judging">
          <div class="judge"><span class="spin" />{{ t('photoJudging') }}</div>
        </template>
        <template v-else>
          <button class="btn shoot" :disabled="!canShoot" @click="camera = true">📷 {{ t('photoOpenCamera') }}</button>
          <div class="tries">
            <span v-for="n in data.tries" :key="n" class="dot" :class="{ used: n <= (mine?.tries || 0) }" />
            <span class="tiny muted">{{ mine?.left ? t('photoTriesLeft', { n: mine.left }) : t('photoNoTries') }}</span>
          </div>
        </template>

        <!-- what the judge said about the last photo -->
        <div v-if="verdict && !verdict.ok" class="verdict">
          <b>❌ {{ t('photoNotIt') }}</b>
          <span v-if="verdict.reason">«{{ verdict.reason }}»</span>
        </div>
      </div>

      <!-- no round: when the next one comes, nobody knows -->
      <div v-else class="card idle">
        <div class="big">📸</div>
        <b>{{ t('photoWaitTitle') }}</b>
        <p>{{ t('photoWaitBody') }}</p>
        <div v-if="data.last" class="lastr">
          <div class="tiny muted">{{ t('photoLast', { what: data.last.thing?.el || '—' }) }}</div>
          <div class="places">
            <div v-for="w in data.last.winners" :key="w.place" class="place taken">
              <span class="m">{{ medal(w.place) }}</span>
              <img v-if="w.photo" :src="w.photo" alt="" class="ph" loading="lazy" @click="zoom = w.photo">
              <b>{{ w.me ? t('flagYou') : `${w.firstName} ${w.lastName?.[0] || ''}.` }}</b>
              <small>+{{ w.points }} XP</small>
            </div>
            <div v-if="!data.last.winners.length" class="tiny muted">{{ t('photoNobody') }}</div>
          </div>
          <template v-if="data.last.gallery?.length">
            <div class="tiny muted">{{ t('photoAllShots') }}</div>
            <div class="gallery">
              <figure v-for="(g, i) in data.last.gallery" :key="i">
                <img v-if="g.photo" :src="g.photo" alt="" loading="lazy" @click="zoom = g.photo">
                <figcaption>{{ g.me ? t('flagYou') : `${g.firstName} ${g.lastName?.[0] || ''}.` }}</figcaption>
              </figure>
            </div>
          </template>
        </div>
      </div>

      <!-- the camera: allowed now, not when the call comes -->
      <div v-if="data.plays && ['denied', 'none', 'ask'].includes(cam)" class="card camcheck bad">
        <div class="big">{{ cam === 'none' ? '📵' : '📷' }}</div>
        <b>{{ cam === 'denied' ? t('photoCamDenied') : cam === 'none' ? t('photoCamNone') : t('photoCamAskTitle') }}</b>
        <p v-if="cam === 'denied'">{{ isIos ? t('photoCamDeniedIos') : t('photoCamDeniedAndroid') }}</p>
        <p v-else-if="cam === 'ask'">{{ t('photoCamAskBody') }}</p>
        <button v-if="cam !== 'none'" class="btn" @click="checkCamera(true)">{{ cam === 'ask' ? t('photoCamAllow') : t('photoCamRetry') }}</button>
      </div>
      <div v-else-if="data.plays && cam === 'checking'" class="card camcheck"><div class="judge"><span class="spin" />{{ t('photoCamChecking') }}</div></div>

      <div v-if="data.plays && cam !== 'none'" class="card tests">
        <b>{{ bothTested ? t('photoTestAllDone') : `🧪 ${t('photoTestTitle')}` }}</b>
        <p v-if="!bothTested">{{ t('photoTestBody') }}</p>
        <div class="testrow">
          <button v-for="f in (['environment', 'user'] as const)" :key="f" class="test" :class="{ done: tested[f] }" :disabled="tested[f]" @click="testing = f">
            <img v-if="testShots[f]" :src="testShots[f]" alt="">
            <span v-else class="ico">{{ f === 'environment' ? '📷' : '🤳' }}</span>
            <b>{{ f === 'environment' ? t('photoTestBack') : t('photoTestFront') }}</b>
            <small>{{ tested[f] ? t('photoTestWorks') : t('photoTestTry') }}</small>
          </button>
        </div>
      </div>

      <!-- an admin may ask for a photo at any time -->
      <div v-if="data.admin && !round" class="card admin">
        <button class="btn ghost" :disabled="starting" @click="startNow">📸 {{ confirmStart ? t('photoStartSure') : t('photoStartNow') }}</button>
        <div class="tiny muted">{{ t('photoStartNote') }}</div>
      </div>

      <template v-if="weekRows.length">
        <div class="sec-title">{{ t('kimWeek') }}</div>
        <GameBoard :rows="weekRows" />
      </template>
      <div class="tiny muted rules">{{ t('photoRules') }}</div>
    </template>

    <MissionCamera v-if="testing" :facing="testing" :title="`🧪 ${t('photoTestTitle')}`" :use-label="t('photoTestUse')" @close="testing = null" @shot="testDone" />
    <Teleport to="body"><div v-if="zoom" class="zoom" @click="zoom = ''"><img :src="zoom" alt=""></div></Teleport>
    <PhotoRules v-if="rulesOpen" :auto="rulesAuto" @close="closeRules" />
    <MissionCamera v-if="camera" :title="round?.thing ? `${round.thing.emoji} ${round.thing.el}` : t('photoTitle')" @close="camera = false" @shot="shot" />
  </GameScreen>
</template>

<style scoped>
.card{display:flex; flex-direction:column; gap:10px; align-items:center; text-align:center; padding:18px 16px; margin-bottom:12px}
.big{font-size:46px; line-height:1}
.card p{margin:0; font-size:13.5px; line-height:1.5; color:var(--muted)}
.tag{font-size:11.5px; font-weight:800; color:#B4470F; background:#FFF0E6; border-radius:999px; padding:3px 12px}
.what{display:flex; align-items:center; gap:10px; font-size:19px; font-weight:800; line-height:1.3}
.what .emo{font-size:40px}
.places{display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px; width:100%}
.place{display:flex; flex-direction:column; align-items:center; gap:3px; background:#F4F6F9; border-radius:14px; padding:8px 6px; min-width:0}
.place.taken{background:#E6F6EC}
.place .m{font-size:22px; line-height:1}
.place .ph{width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:10px}
.place b{font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%}
.place small{font-size:11px; font-weight:800; color:#8a5a00}
.place .free{font-size:11.5px; color:var(--muted); padding:8px 0}
.shoot{width:100%; font-size:16px; padding:14px}
.tries{display:flex; align-items:center; gap:6px}
.dot{width:10px; height:10px; border-radius:50%; background:#2F6FEB}
.dot.used{background:#CBD5E1}
.won{display:flex; flex-direction:column; gap:3px; font-size:15px; font-weight:800; background:#E6F6EC; color:#1F7A47; border-radius:12px; padding:10px 14px}
.won small{font-size:12px; font-weight:600; opacity:.85}
.won.kept{background:#EEF3FF; color:#1F4FA8}
.hidden{font-size:12.5px; font-weight:700; color:var(--muted); background:#F4F6F9; border-radius:999px; padding:5px 12px}
.gallery{display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:6px; width:100%}
.gallery figure{margin:0; display:flex; flex-direction:column; gap:2px; min-width:0}
.gallery img{width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:8px; cursor:zoom-in}
.gallery figcaption{font-size:10.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.place .ph{cursor:zoom-in}
.zoom{position:fixed; inset:0; z-index:2100; background:rgba(0,0,0,.88); display:grid; place-items:center; padding:16px}
.zoom img{max-width:100%; max-height:100%; border-radius:12px}
.judge{display:flex; align-items:center; gap:10px; font-weight:800; font-size:14px}
.spin{width:18px; height:18px; border-radius:50%; border:3px solid #CBD5E1; border-top-color:#2F6FEB; animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.verdict{display:flex; flex-direction:column; gap:3px; width:100%; background:#FDECEC; color:#8E1F1A; border-radius:12px; padding:10px 12px; font-size:13px}
.verdict.ok{background:#E6F6EC; color:#1F7A47}
.lastr{width:100%; display:flex; flex-direction:column; gap:6px}
.admin{gap:6px}
.info{display:block; margin:0 0 10px auto; border:0; border-radius:999px; padding:6px 12px; font:inherit; font-size:12.5px; font-weight:700; background:#F4F6F9; color:var(--text, #222)}
.camcheck.bad{background:#FFF4E5}
.camcheck .btn{width:100%}
.tests{gap:8px}
.tests > b{font-size:14.5px}
.testrow{display:grid; grid-template-columns:1fr 1fr; gap:8px; width:100%}
.test{display:flex; flex-direction:column; align-items:center; gap:3px; border:2px dashed #CBD5E1; border-radius:14px; padding:10px 6px; background:#fff; font:inherit; color:inherit; min-width:0}
.test.done{border-style:solid; border-color:#2FA36B; background:#E6F6EC}
.test:disabled{opacity:1}
.test .ico{font-size:28px; line-height:1}
.test img{width:56px; height:56px; object-fit:cover; border-radius:10px}
.test b{font-size:12.5px}
.test small{font-size:11px; color:var(--muted)}
.test.done small{color:#1F7A47; font-weight:800}
.rules{text-align:center; margin-top:12px; line-height:1.5}
@media (prefers-reduced-motion: reduce){ .spin{animation:none} }
</style>
