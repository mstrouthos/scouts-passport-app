<script setup lang="ts">
const { t, locale } = useI18n()
const me = useMe()
const lx = useLx()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/challenges')
/* The quiz is the Ομάδα's. The Αγέλη's weekly challenges are a separate thing
   and live on the family page — a typed URL should not cross the two. */
const sectionGuard = computed(() => me.value?.section?.slug === 'omada')
watchEffect(() => { if (me.value && !sectionGuard.value) navigateTo('/app') })

const open = ref<any>(null)      // the question sheet
const picked = ref<number | null>(null)
const busy = ref(false)

/* Reading time is free. The clock — and the point decay — starts only when the
   scout asks to see the options, and the server owns the start time. */
const reveal = ref<any>(null)       // { revealedAt, points, minPoints, decayEveryMs }
const elapsed = ref(0)
/* Wall-clock anchor of the server's revealedAt, in this device's time. The
   countdown is Date.now() minus this, so it keeps running while the scout is
   off in another app — googling, say — and is exact again the moment they
   come back. performance.now() would not do: it can pause in the background. */
let revealedAtLocal = 0
let ticker: any = null
/* Five seconds to read the question, then the options appear on their own
   and the clock starts. There is no button to hold off on. */
const READ_MS = 5000
const readLeft = ref(0)
let readTimer: any = null
let readTick: any = null
function stopRead() {
  if (readTimer) { clearTimeout(readTimer); readTimer = null }
  if (readTick) { clearInterval(readTick); readTick = null }
  readLeft.value = 0
}

const live = computed(() => {
  const r = reveal.value
  if (!r) return null
  return Math.max(r.minPoints, r.points - Math.floor(elapsed.value / r.decayEveryMs))
})

function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null } }
const tick = () => { elapsed.value = Math.max(0, Date.now() - revealedAtLocal) }
/* Back from another app: the server still holds the true start, so ask it
   again rather than trust a clock that may have drifted while we were away. */
async function resync() {
  if (document.visibilityState !== 'visible' || !open.value || !reveal.value || open.value.answer) return
  try {
    const r = await $fetch<any>(`/api/challenges/${open.value.id}/reveal`, { method: 'POST' })
    revealedAtLocal = Date.now() - r.elapsedMs
    tick()
  } catch { tick() }
}
onMounted(() => document.addEventListener('visibilitychange', resync))
onBeforeUnmount(() => { stopTicker(); stopRead(); document.removeEventListener('visibilitychange', resync) })

async function revealOptions() {
  if (!open.value || busy.value) return
  busy.value = true
  try {
    const r = await $fetch<any>(`/api/challenges/${open.value.id}/reveal`, { method: 'POST' })
    reveal.value = r
    revealedAtLocal = Date.now() - r.elapsedMs
    tick()
    stopTicker()
    ticker = setInterval(tick, 250)
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
/* Opening a question: a short head start to read it, then the options come
   by themselves. A question whose clock already started (reopened, or a
   reload) skips the head start — the clock has not been waiting. */
function startReading() {
  stopRead()
  if (open.value.revealedAt) { revealOptions(); return }
  readLeft.value = READ_MS / 1000
  const until = Date.now() + READ_MS
  readTick = setInterval(() => { readLeft.value = Math.max(0, Math.ceil((until - Date.now()) / 1000)) }, 200)
  readTimer = setTimeout(() => { stopRead(); if (open.value) revealOptions() }, READ_MS)
}
const K = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ']
const DAYS = ['Δ', 'Τ', 'Τ', 'Π', 'Π', 'Σ', 'Κ']

const items = computed<any[]>(() => data.value?.items || [])
/** Nodes zig-zag like a trail; only the answerable one is tappable. */
const offsetOf = (i: number) => [0, 46, 70, 46, 0, -46, -70, -46][i % 8]

function nodeClass(c: any) {
  return {
    correct: c.state === 'correct',
    wrong: c.state === 'wrong',
    missed: c.state === 'missed',
    open: c.state === 'open',
    bonus: c.isBonus
  }
}
function nodeIcon(c: any) {
  if (c.state === 'correct') return '★'
  if (c.state === 'wrong') return '✕'
  if (c.state === 'missed') return '−'
  return c.imageEmoji || '?'
}
function tap(c: any) {
  picked.value = null
  reveal.value = null
  elapsed.value = 0
  stopTicker(); stopRead()
  open.value = c
  if (!c.answer && !c.closed) startReading()
}
watch(open, v => { if (!v) { stopTicker(); stopRead(); result.value = null } })
/* the reading countdown as a ring that empties */
const RING = 2 * Math.PI * 30
const readFrac = computed(() => readLeft.value / (READ_MS / 1000))
/* The moment of the answer, shown in the sheet itself: a right one lights the
   card, the phoenix cheers and the points float up; a wrong one wobbles. */
const result = ref<{ correct: boolean; points: number } | null>(null)
let resultTimer: any = null
async function submit() {
  if (picked.value == null || !open.value || busy.value) return
  busy.value = true
  try {
    const res = await $fetch<any>(`/api/challenges/${open.value.id}/answer`, {
      method: 'POST', body: { optionId: picked.value }
    })
    stopTicker()
    result.value = { correct: !!res.isCorrect, points: res.points || 0 }
    clearTimeout(resultTimer); resultTimer = setTimeout(() => { result.value = null }, 2200)
    await refresh()
    open.value = items.value.find(x => x.id === open.value.id) || null
    picked.value = null
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
function optClass(c: any, o: any) {
  if (!c.answer) return { sel: picked.value === o.id }
  return { correct: o.isCorrect, wrong: c.answer.optionId === o.id && !o.isCorrect, mine: c.answer.optionId === o.id }
}
</script>

<template>
  <AppShell :title="t('challenges')">
    <!-- streak header -->
    <div class="streak-card">
      <div class="flame">
        <span style="font-size:26px">{{ data?.streak ? '🔥' : '🌱' }}</span>
        <b>{{ data?.streak ?? 0 }}</b>
        <span class="tiny">{{ t('dayStreak') }}</span>
      </div>
      <div class="week">
        <div v-for="(d, i) in data?.week || []" :key="d.day" class="wd" :class="{ done: d.done, future: d.future }">
          <span>{{ DAYS[i] }}</span>
          <i>{{ d.done ? '✓' : '' }}</i>
        </div>
      </div>
    </div>
    <div class="tiny muted" style="text-align:center">
      <template v-if="data?.bonusEarned">🎁 {{ t('bonusUnlocked') }}</template>
      <template v-else>{{ t('bonusHint') }}</template>
    </div>

    <!-- the path -->
    <!-- the trail: coins laid on a path, seen from above and a little behind -->
    <div v-if="items.length" class="path">
      <div v-for="(c, i) in items" :key="c.id" class="row" :style="{ '--x': offsetOf(i) + 'px', '--i': i }">
        <div v-if="c.state === 'open'" class="here">{{ t('today') }}</div>
        <button class="node" :class="nodeClass(c)" :disabled="c.state === 'missed'" @click="tap(c)">
          <span class="face"><span class="ico">{{ nodeIcon(c) }}</span></span>
          <span v-if="c.isBonus" class="star">🎁</span>
        </button>
        <div class="cap" :class="{ dim: c.state === 'missed' }">{{ lx(c) }}</div>
      </div>
    </div>
    <div v-else class="empty">{{ t('noChallenges') }}</div>

    <Teleport to="body">
      <div v-if="open" class="sheet-backdrop" @click.self="open = null">
        <div class="sheet qsheet" style="display:flex;flex-direction:column;gap:13px;max-height:88dvh;overflow:auto">
          <div v-if="open.imageEmoji" style="text-align:center;font-size:40px">{{ open.imageEmoji }}</div>
          <div v-if="open.isBonus" class="pill sched" style="align-self:center">🎁 {{ t('bonusQuestion') }}</div>
          <div style="font-size:15px;font-weight:650;line-height:1.4">{{ lx(open, 'question') }}</div>

          <!-- a few seconds to read, then the options appear on their own -->
          <template v-if="!open.answer && !open.closed && !reveal">
            <div class="readring">
              <svg viewBox="0 0 72 72" aria-hidden="true">
                <circle cx="36" cy="36" r="30" class="track" />
                <circle cx="36" cy="36" r="30" class="left" :style="{ strokeDasharray: RING, strokeDashoffset: RING * (1 - readFrac) }" />
              </svg>
              <b>{{ readLeft }}</b>
            </div>
            <div class="tiny muted" style="text-align:center">👀 {{ t('readCountdown') }}</div>
          </template>

          <template v-else>
            <div v-if="reveal && !open.answer" class="timer" :class="{ floor: live === reveal.minPoints }">
              <span>⏱</span><b>{{ live }}</b><span class="tiny">{{ t('ptsNow') }}</span>
            </div>
            <div class="opts">
              <button v-for="(o, i) in open.options" :key="o.id" class="opt" :class="optClass(open, o)"
                      :style="{ animationDelay: i * 80 + 'ms' }"
                      :disabled="!!open.answer || open.closed" @click="picked = o.id">
                <span class="k">{{ K[i] }}</span>{{ lx(o, 'text') }}
              </button>
            </div>
          </template>

          <div v-if="result" class="moment" :class="result.correct ? 'good' : 'bad'" @click="result = null">
            <div class="m-burst" aria-hidden="true"><i v-for="n in 12" :key="n" :style="{ '--a': n * 30 + 'deg' }" /></div>
            <MascotPhoenix v-if="result.correct" class="m-bird" pose="cheer" />
            <div class="m-pts">{{ result.correct ? `+${result.points}` : '✕' }}</div>
            <div class="m-word">{{ result.correct ? t('correct') : t('wrong') }}</div>
          </div>
          <template v-if="open.answer">
            <div class="verdict" :class="open.answer.isCorrect ? 'good' : 'bad'">
              <b>{{ open.answer.isCorrect ? t('correct') : t('wrong') }}</b>
              <span v-if="open.answer.isCorrect"> +{{ open.answer.points }} {{ t('pts') }}</span>
            </div>
            <p v-if="lx(open, 'explanation')" style="font-size:13px;line-height:1.55;color:#44536B;margin:0">
              {{ lx(open, 'explanation') }}
            </p>
          </template>
          <template v-else-if="open.closed">
            <div class="verdict bad"><b>{{ t('closed') }}</b></div>
          </template>
          <template v-else-if="reveal">
            <div class="tiny muted">{{ t('oneTry') }}</div>
            <button class="btn" :disabled="picked == null || busy" @click="submit">{{ t('submit') }}</button>
          </template>

          <button class="btn ghost" @click="open = null">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.streak-card{
  background:var(--card); border-radius:var(--r-card); box-shadow:var(--shadow);
  padding:14px 15px; display:flex; align-items:center; gap:16px;
}
.flame{display:flex; flex-direction:column; align-items:center; line-height:1.1; min-width:58px}
.flame b{font-size:20px}
.flame .tiny{color:var(--muted)}
.week{display:flex; gap:6px; flex:1; justify-content:space-between}
.wd{
  flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;
  font-size:10.5px; font-weight:700; color:var(--muted);
}
.wd i{
  width:24px; height:24px; border-radius:50%; display:grid; place-items:center;
  background:#EEF2F6; color:#fff; font-style:normal; font-size:12px; font-weight:800;
}
.wd.done i{background:var(--accent)}
.wd.future{opacity:.4}
.timer{
  align-self:center; display:flex; align-items:center; gap:7px;
  background:#EEF2F6; border-radius:999px; padding:5px 14px; color:var(--ink);
}
.timer b{font-size:17px}
.timer.floor{background:#FDECE7; color:var(--danger)}

.path{display:flex; flex-direction:column; align-items:center; gap:10px; padding:10px 0 28px; perspective:700px}
.row{
  display:flex; flex-direction:column; align-items:center; gap:6px; position:relative;
  transform:translateX(var(--x)); animation:drop .5s calc(var(--i) * 70ms) cubic-bezier(.3,1.3,.5,1) both;
}
/* a coin on the ground: tilted back, with a rim underneath for thickness */
.node{
  position:relative; width:72px; height:72px; border:0; padding:0; border-radius:50%; background:none;
  transform:rotateX(38deg); transform-style:preserve-3d; transition:transform .15s;
  --top:#DDE5EE; --rim:#AFBCCB; --ink:#8494A8;
}
.node .face{
  position:absolute; inset:0; border-radius:50%; display:grid; place-items:center;
  background:radial-gradient(circle at 38% 30%, color-mix(in srgb, var(--top) 55%, #fff), var(--top) 62%);
  box-shadow:0 7px 0 var(--rim), 0 16px 18px rgba(20,40,80,.22), inset 0 2px 0 rgba(255,255,255,.6);
  color:var(--ink);
}
.node .ico{font-size:27px; transform:rotateX(-38deg) translateY(-3px); display:block}
.node:active:not(:disabled){transform:rotateX(38deg) translateY(5px)}
.node:active:not(:disabled) .face{box-shadow:0 2px 0 var(--rim), 0 6px 8px rgba(20,40,80,.2)}
.node.open{--top:#FFFFFF; --rim:var(--accent-deep); --ink:var(--ink)}
.node.open .face{box-shadow:0 7px 0 var(--rim), 0 0 0 4px var(--accent), 0 16px 26px rgba(46,124,246,.35)}
.node.open::after{ /* a pulse on the ground around today's coin */
  content:""; position:absolute; inset:-10px; border-radius:50%; border:3px solid var(--accent);
  animation:pulse 1.8s ease-out infinite; pointer-events:none;
}
.node.correct{--top:#3BBF7E; --rim:#1B7A4B; --ink:#fff}
.node.wrong{--top:#E4674E; --rim:#A63C28; --ink:#fff}
.node.missed{opacity:.55}
.node.bonus{--top:#A77BE0; --rim:#6B3FA0; --ink:#fff}
.node .star{position:absolute; top:-10px; right:-8px; font-size:18px; transform:rotateX(-38deg)}
.row:has(.here){margin-top:18px}
.here{
  position:absolute; top:-26px; z-index:2; font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase;
  background:var(--accent); color:#fff; padding:3px 9px; border-radius:999px; box-shadow:0 4px 10px rgba(46,124,246,.35);
  animation:bob 1.6s ease-in-out infinite;
}
.here::after{content:""; position:absolute; left:50%; bottom:-4px; margin-left:-4px; border:4px solid transparent; border-top-color:var(--accent); border-bottom:0}
.cap{font-size:11.5px; font-weight:650; text-align:center; max-width:150px}
.cap.dim{color:var(--muted); font-weight:500}

/* reading: a ring that empties */
.readring{position:relative; align-self:center; width:72px; height:72px; display:grid; place-items:center}
.readring svg{position:absolute; inset:0; transform:rotate(-90deg)}
.readring circle{fill:none; stroke-width:6}
.readring .track{stroke:#E6ECF3}
.readring .left{stroke:var(--accent); stroke-linecap:round; transition:stroke-dashoffset .2s linear}
.readring b{font-size:24px}

/* options fall into place, one after another */
.opts{display:flex; flex-direction:column; gap:8px; perspective:800px}
.opt{transform-origin:50% 0; animation:flipin .45s cubic-bezier(.3,1.3,.5,1) both}
.opt.correct.mine{animation:glow .9s ease-out both}
.opt.wrong.mine{animation:wobble .6s ease-in-out both}

/* the answer's moment: over the whole sheet for two seconds, then gone */
.qsheet{position:relative}
.moment{
  position:absolute; inset:0; z-index:5; display:flex; flex-direction:column; align-items:center; justify-content:center;
  border-radius:inherit; cursor:pointer;
  background:radial-gradient(60% 45% at 50% 42%, rgba(255,255,255,.96), rgba(248,251,254,.88) 70%);
  animation:mfade 2.2s ease-in-out both;
}
.m-bird{width:150px}
.m-pts{font-size:48px; font-weight:900; letter-spacing:-.02em; line-height:1; margin-top:-6px; animation:floatup 2.2s cubic-bezier(.2,.8,.3,1) both}
.m-word{font-size:15px; font-weight:750; margin-top:6px; animation:floatup 2.2s .08s cubic-bezier(.2,.8,.3,1) both}
.moment.good .m-pts, .moment.good .m-word{color:var(--green)}
.moment.good .m-pts{text-shadow:0 6px 22px rgba(47,163,107,.45)}
.moment.bad .m-pts, .moment.bad .m-word{color:var(--danger)}
.moment.bad .m-pts{font-size:64px; animation:wobble .6s ease-in-out both}
.m-burst{position:absolute; left:50%; top:42%}
.m-burst i{position:absolute; width:6px; height:20px; margin:-10px 0 0 -3px; border-radius:3px; opacity:0;
  background:linear-gradient(#FFF1B0,#F5C542); animation:mspark .8s .1s ease-out both}
.moment.bad .m-burst{display:none}
@keyframes mfade{0%{opacity:0}10%,82%{opacity:1}100%{opacity:0}}
@keyframes mspark{0%{opacity:0; transform:rotate(var(--a)) translateY(-40px) scaleY(.4)}30%{opacity:1}100%{opacity:0; transform:rotate(var(--a)) translateY(-120px)}}

@keyframes drop{from{opacity:0; transform:translateX(var(--x)) translateY(-26px) scale(.8)}}
@keyframes pulse{from{opacity:.8; transform:scale(.85)}to{opacity:0; transform:scale(1.45)}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes flipin{from{opacity:0; transform:rotateX(-80deg) translateY(-6px)}}
@keyframes glow{0%{transform:scale(1)}35%{transform:scale(1.04) translateZ(20px); box-shadow:0 0 0 4px rgba(47,163,107,.3), 0 12px 28px rgba(47,163,107,.35)}100%{transform:scale(1)}}
@keyframes wobble{0%,100%{transform:rotateY(0)}20%{transform:rotateY(-18deg) translateX(-6px)}40%{transform:rotateY(14deg) translateX(5px)}60%{transform:rotateY(-9deg) translateX(-3px)}80%{transform:rotateY(5deg)}}
@keyframes floatup{0%{opacity:0; transform:translateY(20px) scale(.6)}20%{opacity:1; transform:translateY(0) scale(1.15)}35%{transform:scale(1)}100%{opacity:1; transform:translateY(-10px)}}

@media (prefers-reduced-motion: reduce){
  .row, .opt, .here, .node.open::after, .m-pts, .m-word, .opt.correct.mine, .opt.wrong.mine{animation:none}
  .m-burst{display:none}
}
</style>
