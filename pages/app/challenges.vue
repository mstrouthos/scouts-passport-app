<script setup lang="ts">
const { t, locale } = useI18n()
const lx = useLx()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/challenges')

const open = ref<any>(null)      // the question sheet
const picked = ref<number | null>(null)
const busy = ref(false)

/* Reading time is free. The clock — and the point decay — starts only when the
   scout asks to see the options, and the server owns the start time. */
const reveal = ref<any>(null)       // { revealedAt, points, minPoints, decayEveryMs }
const elapsed = ref(0)
let startedAt = 0                   // performance clock at reveal, minus time already spent
let ticker: any = null

const live = computed(() => {
  const r = reveal.value
  if (!r) return null
  return Math.max(r.minPoints, r.points - Math.floor(elapsed.value / r.decayEveryMs))
})

function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null } }
onBeforeUnmount(stopTicker)

async function revealOptions() {
  if (!open.value || busy.value) return
  busy.value = true
  try {
    const r = await $fetch<any>(`/api/challenges/${open.value.id}/reveal`, { method: 'POST' })
    reveal.value = r
    startedAt = performance.now() - r.elapsedMs
    elapsed.value = r.elapsedMs
    stopTicker()
    ticker = setInterval(() => { elapsed.value = performance.now() - startedAt }, 250)
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
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
  stopTicker()
  open.value = c
}
async function submit() {
  if (picked.value == null || !open.value || busy.value) return
  busy.value = true
  try {
    const res = await $fetch<any>(`/api/challenges/${open.value.id}/answer`, {
      method: 'POST', body: { optionId: picked.value }
    })
    stopTicker()
    show(res.isCorrect ? `🎉 +${res.points} ${t('pts')}` : t('wrong'))
    await refresh()
    open.value = items.value.find(x => x.id === open.value.id) || null
    picked.value = null
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
function optClass(c: any, o: any) {
  if (!c.answer) return { sel: picked.value === o.id }
  return { correct: o.isCorrect, wrong: c.answer.optionId === o.id && !o.isCorrect }
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
    <div v-if="items.length" class="path">
      <div v-for="(c, i) in items" :key="c.id" class="row" :style="{ transform: `translateX(${offsetOf(i)}px)` }">
        <button class="node" :class="nodeClass(c)" :disabled="c.state === 'missed'" @click="tap(c)">
          <span class="ico">{{ nodeIcon(c) }}</span>
          <span v-if="c.isBonus" class="star">🎁</span>
        </button>
        <div class="cap" :class="{ dim: c.state === 'missed' }">{{ lx(c) }}</div>
      </div>
    </div>
    <div v-else class="empty">{{ t('noChallenges') }}</div>

    <Teleport to="body">
      <div v-if="open" class="sheet-backdrop" @click.self="open = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:13px;max-height:88dvh;overflow:auto">
          <div v-if="open.imageEmoji" style="text-align:center;font-size:40px">{{ open.imageEmoji }}</div>
          <div v-if="open.isBonus" class="pill sched" style="align-self:center">🎁 {{ t('bonusQuestion') }}</div>
          <div style="font-size:15px;font-weight:650;line-height:1.4">{{ lx(open, 'question') }}</div>

          <!-- read first, then start the clock -->
          <template v-if="!open.answer && !open.closed && !reveal">
            <div class="tiny muted" style="text-align:center">{{ t('readFirst') }}</div>
            <button class="btn" :disabled="busy" @click="revealOptions">{{ t('showOptions') }}</button>
          </template>

          <template v-else>
            <div v-if="reveal && !open.answer" class="timer" :class="{ floor: live === reveal.minPoints }">
              <span>⏱</span><b>{{ live }}</b><span class="tiny">{{ t('ptsNow') }}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <button v-for="(o, i) in open.options" :key="o.id" class="opt" :class="optClass(open, o)"
                      :disabled="!!open.answer || open.closed" @click="picked = o.id">
                <span class="k">{{ K[i] }}</span>{{ lx(o, 'text') }}
              </button>
            </div>
          </template>

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

.path{display:flex; flex-direction:column; align-items:center; gap:6px; padding:6px 0 20px}
.row{display:flex; flex-direction:column; align-items:center; gap:4px; transition:transform .2s}
.node{
  position:relative; width:68px; height:68px; border-radius:50%; border:0;
  background:#D9E1EA; color:#fff; font-size:26px; display:grid; place-items:center;
  box-shadow:0 5px 0 #BCC7D3; transition:transform .1s;
}
.node:active:not(:disabled){transform:translateY(3px); box-shadow:0 2px 0 #BCC7D3}
.node.open{background:#fff; border:3px solid var(--accent); box-shadow:0 5px 0 var(--accent-deep)}
.node.correct{background:var(--green); box-shadow:0 5px 0 #1B7A4B}
.node.wrong{background:var(--danger); box-shadow:0 5px 0 #A63C28}
.node.missed{opacity:.5}
.node.bonus{background:linear-gradient(145deg,#C79BEA,#8B5CC7); box-shadow:0 5px 0 #6B3FA0}
.node .star{position:absolute; top:-6px; right:-6px; font-size:17px}
.cap{font-size:11.5px; font-weight:650; text-align:center; max-width:150px}
.cap.dim{color:var(--muted); font-weight:500}
</style>
