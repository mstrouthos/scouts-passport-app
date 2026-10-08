<script setup lang="ts">
/* Έπαρση Σημαίας — the Βαθμοφόροι in a Π around the flagpole, open towards
   it, no names: the flag goes up from sunrise and comes down from sunset
   (Larnaca's, worked out on the server), by whoever gets there first. You
   pull the rope's handle down, as at a real pole, and the flag follows your
   finger; at the end of the pull it counts. No reminders: remembering is the
   game. */
import { avatarSvg, DEFAULT_AVATAR } from '~/utils/avatar'
import { GAME_RANK } from '~/utils/games'

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
  poll = setInterval(() => { if (document.visibilityState === 'visible' && !dragging.value && !sending.value) refresh() }, 20000)
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
  const arm = n < 3 ? 0 : Math.min(7, Math.max(1, Math.round(n * .28)))
  const front = n - 2 * arm
  const rows = front > 9 ? 2 : 1
  const spots: { x: number, y: number }[] = []
  const armY = (i: number) => arm === 1 ? 72 : 62 + i * (20 / (arm - 1))
  for (let i = 0; i < arm; i++) spots.push({ x: 13 + i * .6, y: armY(i) })
  const per = Math.ceil(front / rows)
  for (let r = 0; r < rows; r++) {
    const k = r === rows - 1 ? front - per * (rows - 1) : per
    const gap = k > 1 ? 56 / (k - 1) : 0, nudge = rows > 1 ? (r ? gap / 4 : -gap / 4) : 0   // two rows stand staggered
    for (let i = 0; i < k; i++) spots.push({ x: k === 1 ? 50 : 22 + i * gap + nudge, y: rows === 1 ? 91 : 88 + r * 7 })
  }
  for (let i = 0; i < arm; i++) spots.push({ x: 87 - i * .6, y: armY(i) })
  // the middle of the (last) front row is mine
  const meAt = arm + per * (rows - 1) + Math.floor((front - per * (rows - 1)) / 2)
  const me = all.findIndex((l: any) => l.me)
  const order = all.filter((_: any, i: number) => i !== me)
  if (me >= 0) order.splice(meAt, 0, all[me])
  const w = n <= 10 ? 10 : n <= 16 ? 8.5 : n <= 24 ? 7 : 6
  return order.map((l: any, i: number) => {
    const p = spots[i]!
    const s = .72 + (p.y - 60) / 36 * .3
    return { l, x: p.x, y: p.y, w: w * s, z: Math.round(p.y * 10) }
  })
})
const svgs = computed(() => new Map((data.value?.leaders || []).map((l: any) => [l.id, avatarSvg(l.figure || DEFAULT_AVATAR, 'flag' + l.id, 'stand')])))
const heroes = computed(() => new Set([raised.value?.id, lowered.value?.id].filter(Boolean)))

/* ---- the rope ---- */
const stage = ref<HTMLElement | null>(null)
const dragging = ref(false)
const sending = ref(false)
const pull = ref<number | null>(null)          // the flag where the finger has it: 0 at the foot … 1 at the top
const hoist = computed(() => pull.value ?? (raised.value && !lowered.value ? 1 : 0))
const TOP = 13, FOOT = 34                      // % of the stage: where the flag's top edge sits up, and hanging at the foot
/* The cloth: the flag in thin upright slices, each riding a wave a moment
   behind the one before, more the further from the pole. Down at the foot
   it hangs limp — bunched up and sagging; on its way up it opens out and
   catches the wind. */
const SLICES = 44
const CLOTH = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 18" preserveAspectRatio="none"><rect width="27" height="18" fill="#0D5EAF"/><g fill="#fff"><rect y="2" width="27" height="2"/><rect y="6" width="27" height="2"/><rect y="10" width="27" height="2"/><rect y="14" width="27" height="2"/></g><rect width="10" height="10" fill="#0D5EAF"/><g fill="#fff"><rect x="4" width="2" height="10"/><rect y="4" width="10" height="2"/></g></svg>')}")`
const unfurl = computed(() => { const k = Math.min(1, hoist.value / .55); return k * k * (3 - 2 * k) })   // 0 hanging … 1 flying
const clothStyle = computed(() => ({
  '--sx': (.26 + .74 * unfurl.value).toFixed(3), '--sk': `${(40 * (1 - unfurl.value)).toFixed(1)}deg`,
  '--wind': (.18 + .82 * unfurl.value).toFixed(3), '--folds': (.55 * (1 - unfurl.value)).toFixed(3)
}))
let startY = 0, startHoist = 0
function down(e: PointerEvent) {
  if (!canPull.value) return
  dragging.value = true; startY = e.clientY; startHoist = hoist.value; pull.value = startHoist
  try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch {}
}
function move(e: PointerEvent) {
  if (!dragging.value) return
  const dy = (e.clientY - startY) / ((stage.value?.clientHeight || 400) * .3)
  const up = phase.value === 'day'
  pull.value = Math.max(0, Math.min(1, up ? startHoist + dy : startHoist - dy))
  if ((up && pull.value >= 1) || (!up && pull.value <= 0)) finish()
}
function up() {
  if (!dragging.value) return
  dragging.value = false
  if (!sending.value) pull.value = null       // let go too soon: the flag slides back
}
function key(e: KeyboardEvent) {
  if (!canPull.value || !['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) return
  e.preventDefault()
  pull.value = phase.value === 'day' ? 1 : 0
  finish()
}
async function finish() {
  dragging.value = false
  if (sending.value) return
  sending.value = true
  const raising = phase.value === 'day'
  try {
    const r = await $fetch<any>(`/api/admin/flag/${raising ? 'raise' : 'lower'}`, { method: 'POST' })
    sfx('fanfare')
    show(raising ? t('flagRaisedToast', { n: GAME_RANK.flagRaise })
      : r?.both ? t('flagBothToast', { n: GAME_RANK.flagLower, b: GAME_RANK.flagBoth }) : t('flagLoweredToast', { n: GAME_RANK.flagLower }))
  } catch (e: any) { sfx('wrong'); show(errMsg(e)) }
  await refresh()
  pull.value = null
  sending.value = false
}

const who = (x: any) => x?.id === myId.value ? t('flagYou') : x?.name
const weekRows = computed(() => (data.value?.week || []).map((r: any) => ({ ...r, value: String(r.points), unit: 'XP', sub: `⬆️ ${r.up} · ⬇️ ${r.down}` })))
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
      <div class="flag" :class="{ live: dragging }" role="img" :aria-label="t('flagAria')" :style="{ top: `${FOOT - (FOOT - TOP) * hoist}%` }">
        <div class="cloth" :style="clothStyle">
          <span v-for="i in SLICES" :key="i" class="sl" :style="{ '--i': i - 1, backgroundImage: CLOTH, zIndex: SLICES - i }" />
        </div>
      </div>
      <div v-for="p in people" :key="p.l.id" class="who" :class="{ me: p.l.me, star: heroes.has(p.l.id), salute: hoist > .98 }"
           :style="{ left: p.x + '%', top: p.y + '%', width: p.w + '%', zIndex: p.z }">
        <span class="fig" role="img" :aria-label="p.l.me ? t('flagYou') : ''" v-html="svgs.get(p.l.id)" />
      </div>
      <div v-if="canPull" class="handle" :class="{ hint: !dragging }" role="slider" tabindex="0" :aria-label="t('flagRope')"
           :aria-valuenow="Math.round(hoist * 100)" aria-valuemin="0" aria-valuemax="100"
           :style="{ top: `${43 + 9 * (phase === 'day' ? hoist : 1 - hoist)}%` }"
           @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @keydown="key" />
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
        <div class="sb">{{ t('flagFirst') }} <span class="xp">+{{ GAME_RANK.flagRaise }}</span></div>
      </template>
      <template v-else-if="phase === 'day'">
        <div class="st">🇬🇷 {{ t('flagFlying') }}</div>
        <div class="sb">{{ t('flagFlyingSub', { who: who(raised), t: hhmm(raised.at), s: hhmm(data.sunset) }) }}</div>
      </template>
      <template v-else-if="!raised">
        <div class="st">😶 {{ t('flagNotRaised') }}</div>
        <div class="sb">{{ t('flagNotRaisedSub') }}</div>
      </template>
      <template v-else-if="!lowered">
        <div class="st">🌇 {{ t('flagSunDown') }}</div>
        <div class="sb">{{ t('flagPullDown') }}</div>
        <div class="sb">{{ t('flagFirst') }} <span class="xp">+{{ GAME_RANK.flagLower }}</span></div>
        <div v-if="raised.id === myId" class="tiny bonus">⭐ {{ t('flagBothHint', { b: GAME_RANK.flagBoth }) }}</div>
      </template>
      <template v-else>
        <div class="st">🌙 {{ t('flagDown') }}</div>
        <div class="sb">{{ t('flagDownSub', { who: who(lowered), t: hhmm(lowered.at) }) }}</div>
      </template>
      <div class="row">
        <span>⬆️ {{ raised ? `${who(raised)} · ${hhmm(raised.at)}` : t('flagFrom', { t: hhmm(data.sunrise) }) }}</span>
        <span>⬇️ {{ lowered ? `${who(lowered)} · ${hhmm(lowered.at)}` : t('flagFrom', { t: hhmm(data.sunset) }) }}</span>
      </div>
    </div>

    <template v-if="weekRows.length">
      <div class="sec-title">{{ t('kimWeek') }}</div>
      <GameBoard :rows="weekRows" />
    </template>
    <div class="tiny muted rules">{{ t('flagRules', { r: GAME_RANK.flagRaise, l: GAME_RANK.flagLower, b: GAME_RANK.flagBoth }) }}</div>
  </GameScreen>
</template>

<style scoped>
.stage{position:relative; width:100%; max-width:520px; margin:0 auto; aspect-ratio:4/5; border-radius:24px; overflow:hidden;
  box-shadow:0 10px 30px -14px rgba(10,30,60,.45); user-select:none; -webkit-user-select:none}
.sky{position:absolute; inset:0 0 50% 0; transition:background 1s}
.stars{position:absolute; inset:0 0 50% 0; transition:opacity 1s; background-image:radial-gradient(1.5px 1.5px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 70% 20%,#fff,transparent),radial-gradient(1.5px 1.5px at 45% 12%,#fff,transparent),radial-gradient(1px 1px at 85% 40%,#fff,transparent),radial-gradient(1px 1px at 10% 55%,#fff,transparent),radial-gradient(1.5px 1.5px at 60% 45%,#fff,transparent)}
.sun{position:absolute; width:46px; height:46px; margin:-23px 0 0 -23px; border-radius:50%; background:radial-gradient(circle,#fff6c9,#ffd35a 55%,#ffb43a); box-shadow:0 0 40px 12px rgba(255,200,80,.55); transition:left 1s, top 1s, opacity .6s}
.moon{position:absolute; right:14%; top:12%; width:30px; height:30px; border-radius:50%; box-shadow:-8px 4px 0 0 #f4f1d6; transition:opacity 1s}
.hills{position:absolute; left:-10%; right:-10%; top:40%; height:10%; background:radial-gradient(60% 100% at 30% 100%, #6aa865 60%, transparent 61%), radial-gradient(55% 100% at 80% 100%, #5e9c5a 60%, transparent 61%)}
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
.flag.live{transition:none}
.cloth{display:flex; aspect-ratio:3/2; container-type:inline-size; transform-origin:0 0; transform:skewY(var(--sk)) scaleX(var(--sx)); transition:transform .5s ease-out;
  filter:drop-shadow(0 3px 3px rgba(0,0,0,.2))}
.flag.live .cloth{transition:none}
.sl{position:relative; flex:none; width:calc(100cqw / 44 + 1.5px); margin-right:-1.5px; background-repeat:no-repeat;
  background-size:100cqw 100%; background-position:calc(var(--i) * -100cqw / 44) 0;
  --a:calc(var(--i) * .25px * var(--wind) + var(--i) * .05px);
  animation:ripple 1.6s ease-in-out infinite; animation-delay:calc(var(--i) * -.045s)}
/* light and shade across the folds: rolling with the wave, and deep creases when it hangs */
.sl::after{content:""; position:absolute; inset:0; background:#0b1d33; opacity:0; animation:shade 1.6s ease-in-out infinite; animation-delay:inherit}
.sl::before{content:""; position:absolute; inset:0; z-index:1; background:#0b1d33; opacity:calc(var(--folds) * (.5 + .5 * sin(var(--i) * .7rad)))}
@keyframes ripple{0%,100%{transform:translateY(calc(var(--a) * -1))}50%{transform:translateY(var(--a))}}
@keyframes shade{0%,100%{opacity:0}50%{opacity:.16}}
.handle{position:absolute; z-index:2100; left:calc(50% - 24px); width:40px; height:40px; margin-left:-20px; border-radius:50%; background:#fff; border:3px solid #ff8a3d;
  box-shadow:0 2px 10px rgba(0,0,0,.3); cursor:grab; touch-action:none; display:grid; place-items:center; transition:top .25s ease-out}
.handle::after{content:"⇕"; font-weight:900; font-size:18px; color:#ff8a3d}
.handle.hint{animation:tug 1.1s ease-in-out infinite}
@keyframes tug{50%{transform:translateY(10px)}}
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
@media (prefers-reduced-motion: reduce){ .sl, .sl::after, .handle.hint, .who.salute .fig{animation:none} .sky, .sun, .flag, .handle{transition:none} }
</style>
