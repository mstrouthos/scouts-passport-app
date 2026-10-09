<script setup lang="ts">
/* Έπαρση Σημαίας — the Βαθμοφόροι in a Π around the flagpole, open towards
   it, no names: the flag goes up from sunrise and comes down from sunset
   (Larnaca's, worked out on the server), by whoever gets there first. You
   tap, your figure walks out of the Π to the pole, and then it is a race: tap
   as fast as you can to haul the rope — whoever finishes hauling first has
   the flag. Then back to your place. No reminders: remembering is the game. */
import { avatarSvg, DEFAULT_AVATAR } from '~/utils/avatar'
import { GAME_RANK, FLAG_TAPS } from '~/utils/games'
import { hangingFlag } from '~/utils/flagDrape'

const { t, locale } = useI18n()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/flag')

/* ---- the clock: the server's, so a phone set wrong cannot jump the gun ---- */
const skew = ref(0)
watch(data, d => { if (d?.now) skew.value = Date.parse(d.now) - Date.now() }, { immediate: true })
const now = ref(Date.now())
let tick: any = 0, poll: any = 0
const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
onMounted(() => {
  tick = setInterval(() => { now.value = Date.now() + skew.value }, 1000)
  poll = setInterval(() => { if (document.visibilityState === 'visible' && !sending.value) refresh() }, 20000)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => { clearInterval(tick); clearInterval(poll); document.removeEventListener('visibilitychange', onVisible) })

const rise = computed(() => Date.parse(data.value?.sunrise || '') || 0)
const set = computed(() => Date.parse(data.value?.sunset || '') || 0)
const phase = computed<'before' | 'day' | 'evening'>(() => now.value < rise.value ? 'before' : now.value < set.value ? 'day' : 'evening')
const hhmm = (iso: string | number | null | undefined) => iso == null ? '—' : new Date(iso).toLocaleTimeString(locale.value === 'en' ? 'en-GB' : 'el-GR',
  { timeZone: 'Europe/Nicosia', hour: '2-digit', minute: '2-digit', hour12: false })
const raised = computed(() => data.value?.raised || null)
const lowered = computed(() => data.value?.lowered || null)
const myId = computed(() => (data.value?.leaders || []).find((l: any) => l.me)?.id)
const canPlay = computed(() => !!data.value?.canPlay)
const canPull = computed(() => canPlay.value && !sending.value &&
  ((phase.value === 'day' && !raised.value) || (phase.value === 'evening' && !!raised.value && !lowered.value)))
const minsTo = (ms: number) => Math.max(1, Math.ceil((ms - now.value) / 60000))
const until = computed(() => {
  const m = minsTo(rise.value)
  return m >= 60 ? t('flagInHours', { h: Math.floor(m / 60), m: m % 60 }) : t('flagInMins', { m })
})

/* ---- the sky follows the time ---- */
const sky = computed(() => {
  const m = (now.value - rise.value) / 60000, sm = (set.value - rise.value) / 60000   // minutes since sunrise
  const mix = (a: number[], b: number[], k: number) => a.map((x, i) => Math.round(x + (b[i]! - x) * Math.max(0, Math.min(1, k))))
  const NIGHT = [[12, 22, 52], [30, 48, 92]], DAWN = [[246, 166, 121], [143, 183, 224]], DAY = [[124, 198, 238], [207, 233, 247]], DUSK = [[240, 138, 93], [91, 74, 138]]
  let top: number[], bot: number[]
  if (m < -40 || m > sm + 40) [top, bot] = NIGHT as [number[], number[]]
  else if (m < 30) { const k = (m + 40) / 70; [top, bot] = k < .5 ? [mix(NIGHT[0]!, DAWN[1]!, k * 2), mix(NIGHT[1]!, DAWN[0]!, k * 2)] : [mix(DAWN[1]!, DAY[0]!, (k - .5) * 2), mix(DAWN[0]!, DAY[1]!, (k - .5) * 2)] }
  else if (m < sm - 30) [top, bot] = DAY as [number[], number[]]
  else { const k = (m - (sm - 30)) / 70; [top, bot] = k < .5 ? [mix(DAY[0]!, DUSK[1]!, k * 2), mix(DAY[1]!, DUSK[0]!, k * 2)] : [mix(DUSK[1]!, NIGHT[0]!, (k - .5) * 2), mix(DUSK[0]!, NIGHT[1]!, (k - .5) * 2)] }
  const dark = m < -15 || m > sm + 15 ? 1 : m < 20 ? Math.max(0, (20 - m) / 35) * .7 : m > sm - 20 ? Math.min(1, (m - (sm - 20)) / 35) * .7 : 0
  const d = m / sm
  return {
    bg: `linear-gradient(rgb(${top}), rgb(${bot}))`, dark,
    sun: { opacity: d > -0.03 && d < 1.03 ? 1 : 0, left: (8 + d * 84) + '%', top: (40 - Math.sin(Math.max(0, Math.min(1, d)) * Math.PI) * 30) + '%' },
    shade: `rgba(10,20,50,${(dark * .45).toFixed(2)})`
  }
})

/* ---- the Π: an arm each side reaching back to the pole, a row across the
   front; me in the middle of the front row, everyone else as they come ---- */
const people = computed(() => {
  const all = [...(data.value?.leaders || [])]
  const n = all.length
  if (!n) return []
  const arm = n < 3 ? 0 : Math.min(10, Math.max(1, Math.round(n * .28)))
  // an odd front row, so there is a middle for me: the left arm takes one more if need be
  const armL = arm + (arm && (n - 2 * arm) % 2 === 0 ? 1 : 0)
  const front = n - arm - armL
  const rows = front > 9 ? 2 : 1
  const spots: { x: number, y: number }[] = []
  /* an arm of the Π, back to front; a long one stands two abreast, staggered,
     rather than one tall column of people on top of each other */
  const armSpots = (count: number, left: boolean) => {
    const cols = count > 4 ? 2 : 1, rowsN = Math.ceil(count / cols)
    const step = rowsN > 1 ? 22 / (rowsN - 1) : 0
    return Array.from({ length: count }, (_, i) => {
      const c = cols === 2 ? i % 2 : 0, r = cols === 2 ? Math.floor(i / 2) : i
      const y = rowsN === 1 ? 72 : Math.min(84, 61 + r * step + (c ? step / 2 : 0))
      return { x: left ? 11 + c * 8 : 89 - c * 8, y }
    })
  }
  spots.push(...armSpots(armL, true))
  const per = Math.ceil(front / rows)
  for (let r = 0; r < rows; r++) {
    const k = r === rows - 1 ? front - per * (rows - 1) : per
    const gap = k > 1 ? 56 / (k - 1) : 0, nudge = rows > 1 ? (r ? gap / 4 : -gap / 4) : 0   // two rows stand staggered
    for (let i = 0; i < k; i++) spots.push({ x: k === 1 ? 50 : 22 + i * gap + nudge, y: rows === 1 ? 91 : 88 + r * 7 })
  }
  spots.push(...armSpots(arm, false))
  // the middle of the (last) front row is mine
  const meAt = armL + per * (rows - 1) + Math.floor((front - per * (rows - 1)) / 2)
  const me = all.findIndex((l: any) => l.me)
  const order = all.filter((_: any, i: number) => i !== me)
  if (me >= 0) order.splice(meAt, 0, all[me])
  const w = n <= 10 ? 10 : n <= 16 ? 8.5 : n <= 24 ? 7 : 6
  return order.map((l: any, i: number) => {
    const p = spots[i]!
    const s = .72 + (p.y - 60) / 36 * .3
    return { l, x: p.x, y: p.y, w0: w, w: w * s, z: Math.round(p.y * 10) }
  })
})
const svgs = computed(() => new Map((data.value?.leaders || []).map((l: any) => [l.id, avatarSvg(l.figure || DEFAULT_AVATAR, 'flag' + l.id, 'stand')])))
const heroes = computed(() => new Set([raised.value?.id, lowered.value?.id].filter(Boolean)))

/* ---- the errand: tap, walk to the pole, raise (or lower) it, walk back ---- */
const stage = ref<HTMLElement | null>(null)
const sending = ref(false)                     // from the tap until back in place
const pull = ref<number | null>(null)          // the flag on its way: 0 at the foot … 1 at the top
const hoist = computed(() => pull.value ?? (raised.value && !lowered.value ? 1 : 0))
const TOP = 13, FOOT = 32                      // % of the stage: where the flag's top edge sits up, and hanging at the foot
/* The cloth: the flag in thin upright slices, each riding a wave a moment
   behind the one before, more the further from the pole. Down at the foot
   it hangs limp along the pole (utils/flagDrape); on its way up it opens
   out and catches the wind. */
const SLICES = 44
const CLOTH = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 18" preserveAspectRatio="none"><rect width="27" height="18" fill="#0D5EAF"/><g fill="#fff"><rect y="2" width="27" height="2"/><rect y="6" width="27" height="2"/><rect y="10" width="27" height="2"/><rect y="14" width="27" height="2"/></g><rect width="10" height="10" fill="#0D5EAF"/><g fill="#fff"><rect x="4" width="2" height="10"/><rect y="4" width="10" height="2"/></g></svg>')}")`
const unfurl = computed(() => { const k = Math.min(1, hoist.value / .55); return k * k * (3 - 2 * k) })   // 0 hanging … 1 flying
const clothStyle = computed(() => ({ '--wind': (.3 + .7 * unfurl.value).toFixed(3), opacity: unfurl.value.toFixed(3) }))
const DRAPE = hangingFlag()
/** Where I am while out of the Π: walking (and how long the walk takes), or
    at the pole with my hands on the rope. */
const walker = ref<{ x: number, y: number, ms: number, walking: boolean, pulling: boolean } | null>(null)
const AT_POLE = { x: 45, y: 58 }               // just in front of the pole, beside the rope
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const still = () => import.meta.client && matchMedia('(prefers-reduced-motion: reduce)').matches
const depth = (y: number) => .72 + (y - 60) / 36 * .3     // smaller further back, as in the Π
async function walkTo(x: number, y: number) {
  const mine = people.value.find(p => p.l.me)
  const from = walker.value ?? (mine ? { x: mine.x, y: mine.y } : AT_POLE)
  const ms = still() ? 0 : Math.max(500, Math.round(Math.hypot(x - from.x, (y - from.y) * 1.3) * 24))
  walker.value = { x, y, ms, walking: true, pulling: false }
  await sleep(ms)
  if (walker.value) walker.value = { ...walker.value, walking: false }
}
/** The flag up (or down) the pole, eased, hand over hand. */
function run(from: number, to: number, ms: number) {
  return new Promise<void>(done => {
    if (!ms) { pull.value = to; return done() }
    const t0 = performance.now()
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      pull.value = from + (to - from) * e
      if (k < 1) requestAnimationFrame(step); else done()
    }
    requestAnimationFrame(step)
  })
}
const figStyle = (p: any) => {
  const w = p.l.me ? walker.value : null
  if (!w) return { left: p.x + '%', top: p.y + '%', width: p.w + '%', zIndex: p.z }
  return { left: w.x + '%', top: w.y + '%', width: p.w0 * depth(w.y) + '%', zIndex: Math.round(w.y * 10),
    transition: `left ${w.ms}ms linear, top ${w.ms}ms linear, width ${w.ms}ms linear` }
}
/* the haul: every tap on the rope takes the flag a step up (or down); the
   one who finishes first has it — so keep an eye on the others meanwhile */
const haul = ref<{ taps: number, need: number, t0: number, raising: boolean, last: number } | null>(null)
let haulEnd: ((how: 'done' | 'beaten' | 'idle') => void) | null = null
let haulWatch: any = 0
function tapRope() {
  const h = haul.value
  if (!h || h.taps >= h.need) return
  h.taps++; h.last = performance.now()
  pull.value = h.raising ? h.taps / h.need : 1 - h.taps / h.need
  if (walker.value) walker.value = { ...walker.value, pulling: true }
  if (h.taps % 5 === 0) sfx('pop')
  if (h.taps >= h.need) haulEnd?.('done')
}
function ropeKey(e: KeyboardEvent) {
  if (haul.value && [' ', 'Enter', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); if (!e.repeat) tapRope() }
}
onMounted(() => window.addEventListener('keydown', ropeKey))
onBeforeUnmount(() => { window.removeEventListener('keydown', ropeKey); clearInterval(haulWatch) })
const haulSecs = (h: { t0: number }) => ((performance.now() - h.t0) / 1000).toFixed(1).replace('.', ',')
async function act() {
  if (!canPull.value) return
  sending.value = true
  const raising = phase.value === 'day'
  let need = FLAG_TAPS
  try {
    need = (await $fetch<any>('/api/admin/flag/start', { method: 'POST', body: { which: raising ? 'raise' : 'lower' } })).taps || FLAG_TAPS
  } catch (e: any) { sfx('wrong'); show(errMsg(e)); await refresh(); sending.value = false; return }
  const mine = people.value.find(p => p.l.me)
  sfx('whoosh')
  await walkTo(AT_POLE.x, AT_POLE.y)
  // hands on the rope: tap, tap, tap
  pull.value = raising ? 0 : 1
  haul.value = { taps: 0, need, t0: performance.now(), raising, last: performance.now() }
  const how = await new Promise<'done' | 'beaten' | 'idle'>(done => {
    haulEnd = done
    haulWatch = setInterval(async () => {
      if (performance.now() - (haul.value?.last || 0) > 15000) return done('idle')
      // someone else may finish first
      await refresh()
      if (raising ? raised.value : lowered.value) done('beaten')
    }, 1500)
  })
  clearInterval(haulWatch); haulEnd = null
  const secs = haul.value ? haulSecs(haul.value) : ''
  haul.value = null
  if (walker.value) walker.value = { ...walker.value, pulling: false }
  let won = false
  if (how === 'done') {
    try {
      const r = await $fetch<any>(`/api/admin/flag/${raising ? 'raise' : 'lower'}`, { method: 'POST' })
      won = true
      sfx('fanfare')
      show((raising ? t('flagRaisedToast', { n: GAME_RANK.flagRaise })
        : r?.both ? t('flagBothToast', { n: GAME_RANK.flagLower, b: GAME_RANK.flagBoth }) : t('flagLoweredToast', { n: GAME_RANK.flagLower })) + ' · ' + t('flagHaulTime', { s: secs }))
    } catch (e: any) { sfx('wrong'); show(errMsg(e)) }
  } else if (how === 'beaten') {
    sfx('wrong'); show(t('flagBeaten', { name: (raising ? raised.value : lowered.value)?.name || '—' }))
  } else show(t('flagHaulIdle'))
  // lost or let go: the flag slides back where it was
  if (!won) await run(pull.value ?? (raising ? 0 : 1), raising ? 0 : 1, still() ? 0 : 450)
  await refresh()
  pull.value = null
  if (mine) await walkTo(mine.x, mine.y)
  walker.value = null
  sending.value = false
}

const who = (x: any) => x?.id === myId.value ? t('flagYou') : x?.name
const byWho = (x: any) => x?.id === myId.value ? t('flagByYou') : x?.name   // «από εσένα»
/* the week: how many each, the earliest after sunrise 🌅 and quickest after sunset 🌇 of the week, and streaks 🔥 */
const weekRows = computed(() => (data.value?.week || []).map((r: any) => ({ ...r, value: String(r.points), unit: 'XP',
  sub: [`⬆️ ${r.up} · ⬇️ ${r.down}`, r.earlyUp ? `🌅 ${r.fastUp}′` : '', r.earlyDown ? `🌇 ${r.fastDown}′` : '', r.streak >= 2 ? `🔥 ${r.streak}` : ''].filter(Boolean).join(' · ') })))
const mins = (m: number | null | undefined) => m == null ? '' : m < 1 ? t('flagInFirstMinute') : t('flagMinsAfter', { m })
</script>

<template>
  <GameScreen game="flag" :title="t('flagTitle')" :sub="data ? t('flagSub', { r: hhmm(data.sunrise), s: hhmm(data.sunset) }) : ''">
    <div v-if="data" ref="stage" class="stage">
      <div class="sky" :style="{ background: sky.bg }" />
      <div class="stars" :style="{ opacity: sky.dark > .6 ? 1 : 0 }" />
      <div class="sun" :style="{ opacity: sky.sun.opacity, left: sky.sun.left, top: sky.sun.top }" />
      <div class="moon" :style="{ opacity: sky.dark > .8 ? 1 : 0 }" />
      <div class="hills" />
      <div class="ground" />
      <img class="tent l" src="/images/games/flag-tent.webp" alt="">
      <img class="tent r" src="/images/games/flag-tent.webp" alt="">
      <div class="parade" />
      <div class="base" />
      <div class="pole" />
      <div class="knob" />
      <div class="rope" />
      <svg class="hang" :class="{ live: pull != null }" viewBox="-1 -1 26 102" aria-hidden="true"
           :style="{ top: `${FOOT - (FOOT - TOP) * hoist}%`, opacity: (1 - unfurl).toFixed(3) }">
        <defs>
          <linearGradient id="hangFold" gradientUnits="userSpaceOnUse" gradientTransform="rotate(-8)" x1="0" y1="0" x2="4.2" y2="0" spreadMethod="repeat">
            <stop offset="0" stop-color="#0b1d33" stop-opacity=".32" /><stop offset=".45" stop-color="#fff" stop-opacity=".14" />
            <stop offset=".7" stop-color="#0b1d33" stop-opacity=".05" /><stop offset="1" stop-color="#0b1d33" stop-opacity=".32" />
          </linearGradient>
          <clipPath id="hangClip"><path :d="DRAPE.outline" /></clipPath>
        </defs>
        <g clip-path="url(#hangClip)">
          <path v-for="(p, i) in DRAPE.parts" :key="i" :d="p.d" :fill="p.fill" />
          <rect x="0" y="0" width="30" height="110" fill="url(#hangFold)" />
        </g>
      </svg>
      <div class="flag" :class="{ live: pull != null }" role="img" :aria-label="t('flagAria')" :style="{ top: `${FOOT - (FOOT - TOP) * hoist}%` }">
        <div class="cloth" :style="clothStyle">
          <span v-for="i in SLICES" :key="i" class="sl" :style="{ '--i': i - 1, backgroundImage: CLOTH, zIndex: SLICES - i }" />
        </div>
      </div>
      <div v-for="p in people" :key="p.l.id" class="who"
           :class="{ me: p.l.me, star: heroes.has(p.l.id), salute: hoist > .98 && !(p.l.me && walker), walking: p.l.me && walker?.walking, pulling: p.l.me && walker?.pulling }"
           :style="figStyle(p)">
        <span class="fig" role="img" :aria-label="p.l.me ? t('flagYou') : ''" v-html="svgs.get(p.l.id)" />
      </div>
      <!-- tap here: you walk out to the pole and do it -->
      <button v-if="canPull" class="go" :aria-label="phase === 'day' ? t('flagRaiseBtn') : t('flagLowerBtn')" @click="act">
        <span>{{ phase === 'day' ? '⬆️' : '⬇️' }}</span>
      </button>
      <!-- the haul: the whole scene is the rope, tap it fast -->
      <button v-if="haul" class="haulpad" type="button" :aria-label="t('flagHaulAria')" @pointerdown.prevent="tapRope" @click.prevent>
        <span class="hp-go">👆 {{ t('flagHaulGo') }}</span>
        <span class="hp-bar"><i :style="{ width: (haul.taps / haul.need * 100) + '%' }" /></span>
        <span class="hp-n">{{ haul.taps }}/{{ haul.need }}</span>
      </button>
      <div class="shade" :style="{ background: sky.shade }" />
    </div>

    <!-- what now -->
    <div v-if="data" class="card state">
      <template v-if="!canPlay">
        <div class="st">🙈 {{ t('flagOff') }}</div>
      </template>
      <template v-else-if="phase === 'before'">
        <div class="st">🌙 {{ t('flagWaitSun') }}</div>
        <div class="sb">{{ t('flagWaitSunSub', { t: hhmm(data.sunrise), in: until }) }}</div>
        <div class="sb">{{ t('flagFirst') }} <span class="xp">+{{ GAME_RANK.flagRaise }}</span></div>
      </template>
      <template v-else-if="phase === 'day' && !raised">
        <div class="st">☀️ {{ t('flagSunUp') }}</div>
        <div class="sb">{{ t('flagPullUp') }}</div>
        <button v-if="canPull" class="btn" @click="act">🇬🇷 {{ t('flagRaiseBtn') }}</button>
        <div class="sb">{{ t('flagFirst') }} <span class="xp">+{{ GAME_RANK.flagRaise }}</span></div>
      </template>
      <template v-else-if="phase === 'day'">
        <div class="st">🇬🇷 {{ t('flagFlying') }}</div>
        <div class="sb">{{ t('flagFlyingSub', { who: byWho(raised), t: hhmm(raised.at), s: hhmm(data.sunset) }) }}</div>
        <div class="when">⏱ {{ mins(raised.after) }} {{ t('flagAfterRise') }}</div>
      </template>
      <template v-else-if="!raised">
        <div class="st">😶 {{ t('flagNotRaised') }}</div>
        <div class="sb">{{ t('flagNotRaisedSub') }}</div>
      </template>
      <template v-else-if="!lowered">
        <div class="st">🌇 {{ t('flagSunDown') }}</div>
        <div class="sb">{{ t('flagPullDown') }}</div>
        <button v-if="canPull" class="btn" @click="act">🌙 {{ t('flagLowerBtn') }}</button>
        <div class="sb">{{ t('flagFirst') }} <span class="xp">+{{ GAME_RANK.flagLower }}</span></div>
        <div v-if="raised.id === myId" class="tiny bonus">⭐ {{ t('flagBothHint', { b: GAME_RANK.flagBoth }) }}</div>
      </template>
      <template v-else>
        <div class="st">🌙 {{ t('flagDown') }}</div>
        <div class="sb">{{ t('flagDownSub', { who: byWho(lowered), t: hhmm(lowered.at) }) }}</div>
        <div class="when">⏱ {{ mins(lowered.after) }} {{ t('flagAfterSet') }}</div>
      </template>
      <div class="row">
        <span>⬆️ {{ raised ? `${who(raised)} · ${hhmm(raised.at)}` : t('flagFrom', { t: hhmm(data.sunrise) }) }}</span>
        <span>⬇️ {{ lowered ? `${who(lowered)} · ${hhmm(lowered.at)}` : t('flagFrom', { t: hhmm(data.sunset) }) }}</span>
      </div>
      <div v-if="data.myStreak >= 2" class="streak">🔥 {{ t('flagStreak', { n: data.myStreak }) }}</div>
    </div>

    <template v-if="weekRows.length">
      <div class="sec-title">{{ t('kimWeek') }}</div>
      <GameBoard :rows="weekRows" />
      <div class="tiny muted" style="text-align:center">{{ t('flagWeekLegend') }}</div>
    </template>
    <div class="tiny muted rules">{{ t('flagRules', { r: GAME_RANK.flagRaise, l: GAME_RANK.flagLower, b: GAME_RANK.flagBoth }) }}</div>
  </GameScreen>
</template>

<style scoped>
.stage{position:relative; isolation:isolate; width:100%; max-width:520px; margin:0 auto; aspect-ratio:4/5; border-radius:24px; overflow:hidden;
  box-shadow:0 10px 30px -14px rgba(10,30,60,.45); user-select:none; -webkit-user-select:none}
.sky{position:absolute; inset:0 0 50% 0; transition:background 1s}
.stars{position:absolute; inset:0 0 50% 0; transition:opacity 1s; background-image:radial-gradient(1.5px 1.5px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 70% 20%,#fff,transparent),radial-gradient(1.5px 1.5px at 45% 12%,#fff,transparent),radial-gradient(1px 1px at 85% 40%,#fff,transparent),radial-gradient(1px 1px at 10% 55%,#fff,transparent),radial-gradient(1.5px 1.5px at 60% 45%,#fff,transparent)}
.sun{position:absolute; width:46px; height:46px; margin:-23px 0 0 -23px; border-radius:50%; background:radial-gradient(circle,#fff6c9,#ffd35a 55%,#ffb43a); box-shadow:0 0 40px 12px rgba(255,200,80,.55); transition:left 1s, top 1s, opacity .6s}
.moon{position:absolute; right:14%; top:12%; width:30px; height:30px; border-radius:50%; box-shadow:-8px 4px 0 0 #f4f1d6; transition:opacity 1s}
.hills{position:absolute; left:0; right:0; top:41%; height:9%}
.hills::before, .hills::after{content:""; position:absolute; bottom:0; border-radius:50% 50% 0 0 / 100% 100% 0 0}
.hills::before{left:-12%; width:80%; height:100%; background:#6aa865}
.hills::after{right:-14%; width:72%; height:80%; background:#5e9c5a}
.ground{position:absolute; inset:49% 0 0 0; background:linear-gradient(#8cc96a,#79b85c)}
.parade{position:absolute; left:4%; right:4%; top:51%; height:47%; border-radius:50%/40%; background:radial-gradient(ellipse at center,#e3cf9e,#d4bb85)}
.shade{position:absolute; inset:0; pointer-events:none; transition:background 1s; z-index:2000}
.tent{position:absolute; width:22%; top:38%}
.tent.l{left:-2%}
.tent.r{right:-3%; transform:scaleX(-1)}
.pole{position:absolute; left:50%; width:5px; margin-left:-2.5px; top:12%; height:44%; border-radius:3px; background:linear-gradient(90deg,#9aa4ad,#e6ebef 45%,#8a949c)}
.knob{position:absolute; left:50%; top:calc(12% - 8px); width:12px; height:12px; margin-left:-6px; border-radius:50%; background:radial-gradient(circle at 35% 35%,#fff3b0,#e3a51e)}
.base{position:absolute; left:50%; top:calc(56% - 6px); width:36px; height:12px; margin-left:-18px; border-radius:50%; background:#9b8a6a}
.rope{position:absolute; left:calc(50% + 3px); top:12%; width:2px; height:44%; background:repeating-linear-gradient(#f1ead6 0 4px,#cfc4a6 4px 6px)}
.flag{position:absolute; left:calc(50% + 4px); width:29%; z-index:1; transition:top .3s ease-out}
.flag.live, .hang.live{transition:none}
/* hanging limp: along the rope at the foot of the pole, swaying a little */
.hang{position:absolute; left:calc(50% + 3px); width:7.4%; height:auto; overflow:visible; z-index:1; transform-origin:0 0;
  transition:top .3s ease-out, opacity .4s; animation:sway 5s ease-in-out infinite; filter:drop-shadow(1px 2px 1.5px rgba(0,0,0,.18))}
@keyframes sway{0%,100%{transform:rotate(-1.2deg)}50%{transform:rotate(1.4deg)}}
.cloth{display:flex; aspect-ratio:3/2; container-type:inline-size; transition:opacity .4s;
  filter:drop-shadow(0 3px 3px rgba(0,0,0,.2))}
.flag.live .cloth{transition:none}
.sl{position:relative; flex:none; width:calc(100cqw / 44 + 1.5px); margin-right:-1.5px; background-repeat:no-repeat;
  background-size:100cqw 100%; background-position:calc(var(--i) * -100cqw / 44) 0;
  --a:calc(var(--i) * .25px * var(--wind) + var(--i) * .05px);
  animation:ripple 1.6s ease-in-out infinite; animation-delay:calc(var(--i) * -.045s)}
/* light and shade rolling with the wave */
.sl::after{content:""; position:absolute; inset:0; background:#0b1d33; opacity:0; animation:shade 1.6s ease-in-out infinite; animation-delay:inherit}
@keyframes ripple{0%,100%{transform:translateY(calc(var(--a) * -1))}50%{transform:translateY(var(--a))}}
@keyframes shade{0%,100%{opacity:0}50%{opacity:.16}}
.haulpad{position:absolute; inset:0; z-index:2150; border:0; padding:0 0 9%; margin:0; background:rgba(255,255,255,.06); cursor:pointer; touch-action:manipulation;
  -webkit-user-select:none; user-select:none; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:8px}
.hp-go{background:#1d2b44; color:#fff; font:900 17px/1.2 inherit; padding:10px 18px; border-radius:999px; box-shadow:0 8px 20px rgba(0,0,0,.3); animation:hp-pulse .6s ease-in-out infinite}
@keyframes hp-pulse{50%{transform:scale(1.06)}}
.hp-bar{width:62%; height:12px; border-radius:999px; background:rgba(255,255,255,.75); overflow:hidden; box-shadow:inset 0 0 0 2px rgba(29,43,68,.25)}
.hp-bar i{display:block; height:100%; background:linear-gradient(90deg,#ff8a3d,#E5484D); transition:width .08s linear}
.hp-n{font:900 13px/1 inherit; color:#1d2b44; background:rgba(255,255,255,.85); padding:4px 10px; border-radius:999px; font-variant-numeric:tabular-nums}
.when{font-size:12.5px; font-weight:800; color:#2F79B8}
.streak{align-self:center; font-size:12.5px; font-weight:800; background:#FFF0E6; color:#B4470F; border-radius:999px; padding:3px 12px}
.go{position:absolute; z-index:2100; left:calc(50% - 26px); top:47%; width:46px; height:46px; margin-left:-23px; border-radius:50%; border:3px solid #ff8a3d;
  background:#fff; display:grid; place-items:center; font-size:20px; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,.3); animation:beckon 1.6s ease-out infinite}
@keyframes beckon{0%{box-shadow:0 2px 10px rgba(0,0,0,.3), 0 0 0 0 rgba(255,138,61,.55)}70%{box-shadow:0 2px 10px rgba(0,0,0,.3), 0 0 0 14px rgba(255,138,61,0)}100%{box-shadow:0 2px 10px rgba(0,0,0,.3), 0 0 0 0 rgba(255,138,61,0)}}
.go:active{transform:scale(.92)}
/* out of the Π: a step in the walk, and hands on the rope */
.who.walking .fig{animation:step .32s ease-in-out infinite}
@keyframes step{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-4%) rotate(2deg)}}
.who.pulling .fig{animation:haul .55s ease-in-out infinite}
@keyframes haul{0%,100%{transform:translateY(0)}50%{transform:translateY(3%) scaleY(.97)}}
.who{position:absolute; transform:translate(-50%,-100%); pointer-events:none}
.fig{display:block}
.fig :deep(svg){display:block; width:100%; height:auto}
.who.me::after{content:""; position:absolute; bottom:-4%; left:50%; width:110%; aspect-ratio:3.4; transform:translateX(-50%); border-radius:50%; border:2px solid #2E7D5B; background:rgba(46,125,91,.25); z-index:-1}
.who.star::before{content:"⭐"; position:absolute; top:-14px; left:50%; transform:translateX(-50%); font-size:14px}
.who.salute .fig{animation:salute .5s ease-out both}
@keyframes salute{to{transform:translateY(-2px)}}
.state{display:flex; flex-direction:column; gap:6px; text-align:center; margin-top:12px; padding:12px 14px}
.st{font-size:16px; font-weight:900}
.sb{font-size:13px; color:var(--muted); line-height:1.45}
.xp, .bonus{display:inline-block; background:#fff2c4; color:#8a5a00; border-radius:999px; padding:1px 8px; font-weight:900; font-size:12px}
.bonus{align-self:center; padding:3px 10px}
.row{display:flex; justify-content:center; flex-wrap:wrap; gap:6px 16px; font-size:12px; color:var(--muted); font-weight:700; margin-top:2px}
.rules{text-align:center; margin-top:12px; line-height:1.5}
@media (prefers-reduced-motion: reduce){ .sl, .sl::after, .hang, .go, .hp-go, .who.salute .fig, .who.walking .fig, .who.pulling .fig{animation:none} .sky, .sun, .flag{transition:none} }
</style>
