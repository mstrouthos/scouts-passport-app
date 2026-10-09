<script setup lang="ts">
/* Φωτογραφικό κυνήγι — twice a week, Monday to Friday, the game asks for a
   photo of something (utils/photoGame.ts). Taken there and then with the
   app's own camera, never from the gallery; Gemini checks the thing is
   really in it; the first three right win 5, 4 and 3 XP. Three tries each.
   While it is tried out only those let in play; an admin can ask for a photo
   at any time. */
import { PHOTO_POINTS } from '~/utils/photoGame'

const { t, locale } = useI18n()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/photo')

const round = computed(() => data.value?.round || null)
const mine = computed(() => round.value?.mine || null)
const canShoot = computed(() => !!data.value?.plays && !!round.value && !mine.value?.won && (mine.value?.left ?? 0) > 0)
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

const weekRows = computed(() => (data.value?.week || []).map((r: any) => ({ ...r, value: String(r.points), unit: 'XP', sub: t('photoWins', { n: r.wins }) })))
</script>

<template>
  <GameScreen game="photo" :title="t('photoTitle')" :sub="t('photoSub')">
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
        <div class="places">
          <div v-for="(p, i) in PHOTO_POINTS" :key="i" class="place" :class="{ taken: round.winners[i] }">
            <span class="m">{{ medal(i + 1) }}</span>
            <template v-if="round.winners[i]">
              <img v-if="round.winners[i].photo" :src="round.winners[i].photo" alt="" class="ph" loading="lazy">
              <b>{{ round.winners[i].me ? t('flagYou') : `${round.winners[i].firstName} ${round.winners[i].lastName?.[0] || ''}.` }}</b>
            </template>
            <span v-else class="free">{{ t('photoFree') }}</span>
            <small>+{{ p }} XP</small>
          </div>
        </div>

        <template v-if="!data.plays">
          <div class="tiny muted">{{ t('photoAdminOnly') }}</div>
        </template>
        <template v-else-if="mine?.won">
          <div class="won">🎉 {{ t('photoYouWon', { place: mine.won.place, n: mine.won.points }) }}</div>
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
        <div v-if="verdict && !verdict.place" class="verdict" :class="{ ok: verdict.ok }">
          <b>{{ verdict.ok ? (verdict.late ? t('photoRightLate') : '✅') : '❌ ' + t('photoNotIt') }}</b>
          <span v-if="verdict.reason">«{{ verdict.reason }}»</span>
        </div>
        <div v-else-if="verdict?.place" class="verdict ok"><b>🎉 {{ t('photoYouWon', { place: verdict.place, n: verdict.points }) }}</b></div>
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
              <img v-if="w.photo" :src="w.photo" alt="" class="ph" loading="lazy">
              <b>{{ w.me ? t('flagYou') : `${w.firstName} ${w.lastName?.[0] || ''}.` }}</b>
              <small>+{{ w.points }} XP</small>
            </div>
            <div v-if="!data.last.winners.length" class="tiny muted">{{ t('photoNobody') }}</div>
          </div>
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
.won{font-size:15px; font-weight:800; background:#E6F6EC; color:#1F7A47; border-radius:12px; padding:10px 14px}
.judge{display:flex; align-items:center; gap:10px; font-weight:800; font-size:14px}
.spin{width:18px; height:18px; border-radius:50%; border:3px solid #CBD5E1; border-top-color:#2F6FEB; animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.verdict{display:flex; flex-direction:column; gap:3px; width:100%; background:#FDECEC; color:#8E1F1A; border-radius:12px; padding:10px 12px; font-size:13px}
.verdict.ok{background:#E6F6EC; color:#1F7A47}
.lastr{width:100%; display:flex; flex-direction:column; gap:6px}
.admin{gap:6px}
.rules{text-align:center; margin-top:12px; line-height:1.5}
@media (prefers-reduced-motion: reduce){ .spin{animation:none} }
</style>
