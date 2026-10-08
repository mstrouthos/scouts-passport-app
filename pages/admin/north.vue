<script setup lang="ts">
/* Πού είναι ο Βορράς; — once a day, anywhere: a 3-2-1, then five seconds to
   point the phone (held flat, like a compass) at north, with nothing on the
   screen to help. Where it points when time is up is the answer, scored on
   the server against true north (utils/north.ts). The day is only used up
   once the phone's compass answers, so a phone without one loses nothing. */
import { NORTH_SECS, NORTH_BULLSEYE } from '~/utils/north'

const { t } = useI18n()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/north')

type Phase = 'intro' | 'arming' | 'count' | 'turn' | 'sending' | 'result' | 'nosensor'
const phase = ref<Phase>('intro')
const count = ref(3)
const left = ref(NORTH_SECS)
const flat = ref(true)
const result = ref<any>(null)

/* ---- the phone's compass ----
   iPhones give the heading (from magnetic north) directly; Android gives the
   absolute orientation, whose alpha turns the other way */
let heading: number | null = null
let samples: { t: number, h: number }[] = []
function onOri(e: any) {
  let h: number | null = null
  if (typeof e.webkitCompassHeading === 'number' && e.webkitCompassHeading >= 0) h = e.webkitCompassHeading
  else if (e.absolute && typeof e.alpha === 'number') h = (360 - e.alpha) % 360
  if (typeof e.beta === 'number' && typeof e.gamma === 'number') flat.value = Math.abs(e.beta) < 30 && Math.abs(e.gamma) < 30
  if (h == null) return
  heading = h
  samples.push({ t: performance.now(), h })
  if (samples.length > 80) samples.shift()
}
function listen(on: boolean) {
  for (const ev of ['deviceorientationabsolute', 'deviceorientation']) {
    if (on) window.addEventListener(ev, onOri, true)
    else window.removeEventListener(ev, onOri, true)
  }
}
onBeforeUnmount(() => { listen(false); cancelAnimationFrame(raf) })
/** The heading at the moment of locking: the last few readings averaged (on
    the circle — 359° and 1° average to 0°, not 180°), as a hand shakes. */
function lockedHeading() {
  const now = performance.now()
  const recent = samples.filter(s => now - s.t < 400)
  const use = recent.length ? recent : samples.slice(-1)
  let x = 0, y = 0
  for (const s of use) { x += Math.cos(s.h * Math.PI / 180); y += Math.sin(s.h * Math.PI / 180) }
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
let turnStart = 0, raf = 0
async function ready() {
  phase.value = 'arming'
  // iPhones ask for permission, and only from a tap
  try {
    const D: any = (window as any).DeviceOrientationEvent
    if (D && typeof D.requestPermission === 'function' && await D.requestPermission() !== 'granted') throw new Error('denied')
  } catch { phase.value = 'nosensor'; return }
  samples = []; heading = null; listen(true)
  const t0 = Date.now()
  while (heading == null && Date.now() - t0 < 2500) await sleep(100)
  if (heading == null) { listen(false); phase.value = 'nosensor'; return }
  try { await $fetch('/api/admin/north/start', { method: 'POST' }) } catch (e: any) { listen(false); phase.value = 'intro'; show(errMsg(e)); refresh(); return }
  phase.value = 'count'
  for (const n of [3, 2, 1]) { count.value = n; sfx('pop'); await sleep(1000) }
  phase.value = 'turn'; sfx('whoosh')
  turnStart = performance.now()
  tick()
}
function tick() {
  const el = (performance.now() - turnStart) / 1000
  left.value = Math.max(0, NORTH_SECS - el)
  if (el >= NORTH_SECS) return lock()
  raf = requestAnimationFrame(tick)
}
async function lock() {
  if (phase.value !== 'turn') return
  cancelAnimationFrame(raf)
  const h = lockedHeading()
  const ms = Math.round(Math.min(NORTH_SECS * 1000, performance.now() - turnStart))
  listen(false)
  phase.value = 'sending'
  try {
    result.value = await $fetch<any>('/api/admin/north/answer', { method: 'POST', body: { heading: h, ms } })
    phase.value = 'result'
    sfx(Math.abs(result.value.error) <= NORTH_BULLSEYE ? 'fanfare' : result.value.points >= 50 ? 'correct' : 'wrong')
    refresh()
  } catch (e: any) { show(errMsg(e)); phase.value = 'intro'; refresh() }
}

/* what today's go was, whether just now or earlier today */
const mine = computed(() => result.value || (data.value?.mine?.answered ? data.value.mine : null))
const lost = computed(() => !mine.value && data.value?.mine && !data.value.mine.answered && phase.value === 'intro')
const deg = (n: number | null | undefined) => n == null ? '—' : `${Math.round(Math.abs(n))}°`
const side = (e: number) => Math.abs(e) <= NORTH_BULLSEYE ? t('northSpot') : e > 0 ? t('northRight', { d: deg(e) }) : t('northLeft', { d: deg(e) })
const secs = (ms: number | null | undefined) => ms == null ? '—' : `${(ms / 1000).toFixed(1).replace('.', ',')}″`
</script>

<template>
  <GameScreen game="north" :title="t('northTitle')" :sub="t('northSub')">
    <!-- today's go -->
    <div class="card play">
      <template v-if="mine">
        <div class="dial">
          <!-- up is where the phone pointed; the blue line is true north -->
          <span class="needle you" />
          <span class="needle truth" :style="{ transform: `rotate(${-(mine.error || 0)}deg)` }"><i>Β</i></span>
          <span class="hub" />
        </div>
        <div class="big">{{ mine.points }} <small>{{ t('northPoints') }}</small></div>
        <div class="line">{{ Math.abs(mine.error) <= NORTH_BULLSEYE ? '🎯 ' : '' }}{{ side(mine.error) }}</div>
        <div v-if="result?.won" class="won">🎒 {{ t('northWon') }}</div>
        <div v-if="result?.late" class="tiny muted">{{ t('northLate') }}</div>
        <div class="legend"><span class="ly">━ {{ t('northYou') }}</span><span class="lt">━ {{ t('northTrue') }}</span></div>
        <div class="tiny muted">{{ t('northTomorrow') }}</div>
      </template>

      <template v-else-if="lost">
        <div class="emoji">🧭</div>
        <b>{{ t('northLost') }}</b>
        <div class="tiny muted">{{ t('northTomorrow') }}</div>
      </template>

      <template v-else-if="phase === 'intro' || phase === 'arming'">
        <div class="emoji">🧭</div>
        <h3>{{ t('northHow') }}</h3>
        <ul class="how">
          <li>{{ t('northHow1') }}</li>
          <li>{{ t('northHow2', { s: NORTH_SECS }) }}</li>
          <li>{{ t('northHow3') }}</li>
          <li>{{ t('northHow4') }}</li>
        </ul>
        <button class="btn" :disabled="phase === 'arming'" @click="ready">{{ phase === 'arming' ? t('loading') : t('northReady') }}</button>
        <div class="tiny muted">{{ t('northOnce') }}</div>
      </template>

      <template v-else-if="phase === 'count'">
        <div class="dial blank"><span class="count">{{ count }}</span></div>
        <div class="line">{{ t('northHold') }}</div>
      </template>

      <template v-else-if="phase === 'turn' || phase === 'sending'">
        <div class="dial blank turn" @click="lock"><span class="count small">{{ left.toFixed(1).replace('.', ',') }}″</span></div>
        <div class="line" :class="{ warn: !flat }">{{ flat ? '📏 ' + t('northFlat') : '⚠️ ' + t('northTilt') }}</div>
        <button class="btn ghost" :disabled="phase === 'sending'" @click="lock">{{ t('northLock') }}</button>
      </template>

      <template v-else-if="phase === 'nosensor'">
        <div class="emoji">📵</div>
        <b>{{ t('northNoSensor') }}</b>
        <div class="tiny muted">{{ t('northNoSensorSub') }}</div>
        <button class="btn ghost" @click="phase = 'intro'">{{ t('close') }}</button>
      </template>
    </div>

    <!-- today, and the week -->
    <template v-if="data?.today?.length">
      <div class="sec-title">{{ t('kimToday') }}</div>
      <div class="card rows">
        <div v-for="(p, i) in data.today" :key="p.id" class="row" :class="{ me: p.me }">
          <span class="pos">{{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1 }}</span>
          <Avatar :name="`${p.firstName} ${p.lastName}`" :photo="p.photo" :avatar="p.figure || p.avatar" :size="34" no-zoom />
          <span class="nm">{{ p.firstName }}</span>
          <b>{{ p.points }}</b><span class="muted">{{ deg(p.error) }} · {{ secs(p.ms) }}</span>
        </div>
      </div>
    </template>
    <template v-if="data?.week?.length">
      <div class="sec-title">{{ t('kimWeek') }}</div>
      <div class="card rows">
        <div v-for="(p, i) in data.week" :key="p.id" class="row" :class="{ me: p.me }">
          <span class="pos">{{ i === 0 ? '🏆' : i + 1 }}</span>
          <Avatar :name="`${p.firstName} ${p.lastName}`" :photo="p.photo" :avatar="p.figure || p.avatar" :size="34" no-zoom />
          <span class="nm">{{ p.firstName }}</span>
          <b>{{ p.points }}</b><span class="muted">{{ t('kimDays', { n: p.days }) }}</span>
        </div>
      </div>
    </template>
  </GameScreen>
</template>

<style scoped>
.play{display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center; padding:18px 16px}
.play h3{margin:0; font-size:18px}
.emoji{font-size:46px; line-height:1}
.how{margin:0; padding-left:18px; text-align:left; display:flex; flex-direction:column; gap:6px; font-size:13.5px; line-height:1.5}
.dial{position:relative; width:190px; height:190px; border-radius:50%; margin:4px auto;
  background:radial-gradient(circle,#F7FBF8 58%,#E3EFE7 59%); border:4px solid #2F6B4F; box-shadow:inset 0 2px 10px rgba(0,0,0,.08)}
.dial.blank{background:radial-gradient(circle,#F7FBF8 62%,#EAF2EC 63%)}
.dial.turn{cursor:pointer; animation:pulse 1s ease-in-out infinite}
@keyframes pulse{50%{box-shadow:0 0 0 8px rgba(47,107,79,.12), inset 0 2px 10px rgba(0,0,0,.08)}}
.count{position:absolute; inset:0; display:grid; place-items:center; font-size:64px; font-weight:900; color:#2F6B4F; font-variant-numeric:tabular-nums}
.count.small{font-size:40px}
.needle{position:absolute; left:50%; bottom:50%; width:4px; height:78px; margin-left:-2px; border-radius:3px; transform-origin:50% 100%}
.needle.you{background:#FF8A3D}
.needle.truth{background:#2F79B8}
.needle.truth i{position:absolute; top:-20px; left:50%; transform:translateX(-50%); font-style:normal; font-weight:900; font-size:13px; color:#2F79B8}
.hub{position:absolute; left:50%; top:50%; width:14px; height:14px; margin:-7px 0 0 -7px; border-radius:50%; background:#1d2b44}
.big{font-size:40px; font-weight:900; color:#2F6B4F; line-height:1}
.big small{font-size:14px; font-weight:700; color:var(--muted)}
.line{font-size:14px; font-weight:700}
.line.warn{color:#C2410C}
.won{font-size:13px; font-weight:700; background:#EAF6EF; color:#2E7D5B; border-radius:999px; padding:6px 12px}
.legend{display:flex; gap:14px; font-size:12px; font-weight:700}
.ly{color:#FF8A3D}
.lt{color:#2F79B8}
.rows{display:flex; flex-direction:column; padding:6px 12px}
.row{display:flex; align-items:center; gap:10px; padding:7px 0; border-top:1px solid rgba(20,40,70,.06)}
.row:first-child{border-top:0}
.row.me .nm{font-weight:800}
.pos{width:24px; text-align:center; font-weight:800}
.nm{flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.row b{font-size:15px}
.row .muted{font-size:12px; min-width:76px; text-align:right}
@media (prefers-reduced-motion: reduce){ .dial.turn{animation:none} }
</style>
