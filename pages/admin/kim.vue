<script setup lang="ts">
/* Το Ταψί του Κιμ — Kim's Game, a minute a day (utils/kim.ts). Twelve
   things on a tray for twenty seconds; the cloth comes down, four are taken
   away, and which four must be picked from ten. Then the score, a dare to
   someone who has not played yet, and how everyone did today and this week. */
import { kimImage, kimObject, KIM_MISSING, KIM_COVER_MS } from '~/utils/kim'
import { funAction } from '~/utils/fun'
const emojiOf = (k: string) => funAction(k)?.emoji ?? k

const { t, locale } = useI18n()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/kim')

type Phase = 'intro' | 'view' | 'cover' | 'pick' | 'done'
const phase = ref<Phase>('intro')
const play = ref<any>(null)            // the tray, the missing places, the choices
const picks = ref<string[]>([])
const result = ref<any>(null)
const busy = ref(false)
const name = (key: string) => { const o = kimObject(key); return o ? (locale.value === 'en' ? o.en : o.el) : key }
const secs = (ms: number | null | undefined) => ms == null ? '—' : (ms / 1000).toFixed(1).replace('.', locale.value === 'en' ? '.' : ',') + '″'

/* where today stands when the page opens: played, half-way, or not yet */
watch(data, d => {
  if (!d?.mine || phase.value !== 'intro') return
  play.value = d.mine
  if (d.mine.answered) { result.value = { correct: d.mine.correct, ms: d.mine.ms, picks: d.mine.picks || [] }; picks.value = d.mine.picks || []; phase.value = 'done' }
  else {
    const left = d.viewMs - (Date.now() - Date.parse(d.mine.startedAt))
    if (left > 1500) look(left)
    else phase.value = 'pick'
  }
}, { immediate: true })

/* ---- looking ---- */
const remaining = ref(0)
let tick: any
function look(ms: number) {
  phase.value = 'view'
  const end = Date.now() + ms
  remaining.value = ms
  clearInterval(tick)
  tick = setInterval(() => {
    remaining.value = Math.max(0, end - Date.now())
    if (!remaining.value) cover()
  }, 100)
}
onBeforeUnmount(() => clearInterval(tick))
async function start() {
  if (busy.value) return
  busy.value = true
  try {
    play.value = await $fetch<any>('/api/admin/kim/start', { method: 'POST' })
    sfx('pop')
    look(play.value.viewMs)
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}
/* the cloth comes down, four things go, and it comes up again */
const clothDown = ref(false)
function cover() {
  if (phase.value !== 'view') return
  clearInterval(tick)
  phase.value = 'cover'
  clothDown.value = true
  sfx('whoosh')
  setTimeout(() => { phase.value = 'pick'; clothDown.value = false; sfx('whoosh') }, KIM_COVER_MS)
}
const gone = (i: number) => (phase.value === 'pick' || phase.value === 'done') && play.value?.missing?.includes(i)

/* ---- picking ---- */
function toggle(key: string) {
  if (phase.value !== 'pick') return
  if (picks.value.includes(key)) picks.value = picks.value.filter(k => k !== key)
  else if (picks.value.length < KIM_MISSING) { picks.value = [...picks.value, key]; sfx('pop') }
}
async function answer() {
  if (busy.value || picks.value.length !== KIM_MISSING) return
  busy.value = true
  try {
    result.value = await $fetch<any>('/api/admin/kim/answer', { method: 'POST', body: { picks: picks.value } })
    phase.value = 'done'
    sfx(result.value.correct === KIM_MISSING ? 'fanfare' : result.value.correct >= 2 ? 'correct' : 'wrong')
    await refresh()
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}
const missingKeys = computed(() => play.value ? play.value.missing.map((i: number) => play.value.tray[i]) : [])
/** The shareable line: a square for each pick, green if it was gone. */
const grid = computed(() => (result.value?.picks || []).map((k: string) => missingKeys.value.includes(k) ? '🟩' : '🟥').join(''))

/* ---- daring someone ---- */
async function dare(l: any) {
  if (busy.value) return
  busy.value = true
  try {
    await $fetch('/api/admin/kim/challenge', { method: 'POST', body: { to: l.id } })
    sfx('pop')
    show('🧠 ' + t('kimDared', { name: l.firstName }))
    await refresh()
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}
</script>

<template>
  <AppShell :title="t('kimTitle')" :sub="t('kimSub')" back="/admin">
    <!-- the tray itself: what to remember, or what is gone -->
    <div v-if="play && phase !== 'intro'" class="tray-wrap">
      <div v-if="phase === 'view'" class="timer"><span :style="{ width: (remaining / (data?.viewMs || 20000) * 100) + '%' }" /></div>
      <div class="tray">
        <div v-for="(key, i) in play.tray" :key="i" class="slot" :class="{ gone: gone(i) }">
          <template v-if="!gone(i)"><img :src="kimImage(key)" :alt="name(key)"></template>
          <template v-else-if="phase === 'done'">
            <img :src="kimImage(key)" :alt="name(key)" class="was">
            <i class="mark">{{ result?.picks?.includes(key) ? '✅' : '❌' }}</i>
          </template>
          <span v-else class="q">?</span>
        </div>
        <div class="cloth" :class="{ down: clothDown }" />
      </div>
      <div v-if="phase === 'view'" class="hint">
        <span>{{ t('kimLook', { s: Math.ceil(remaining / 1000) }) }}</span>
        <button class="btn ghost small" @click="cover">{{ t('kimReady') }}</button>
      </div>
    </div>

    <!-- what to do before starting -->
    <div v-if="phase === 'intro'" class="card intro">
      <div class="big">🧠</div>
      <b>{{ t('kimIntroTitle') }}</b>
      <p>{{ t('kimIntro') }}</p>
      <button class="btn" :disabled="busy" @click="start">{{ t('kimStart') }}</button>
      <small class="muted">{{ t('kimOnce') }}</small>
    </div>

    <!-- what went? -->
    <template v-if="phase === 'pick'">
      <div class="sec-title">{{ t('kimWhatsGone', { n: KIM_MISSING }) }}</div>
      <div class="choices">
        <button v-for="key in play.choices" :key="key" class="choice" :class="{ on: picks.includes(key) }" @click="toggle(key)">
          <img :src="kimImage(key)" :alt="name(key)"><span>{{ name(key) }}</span>
        </button>
      </div>
      <button class="btn" :disabled="busy || picks.length !== KIM_MISSING" @click="answer">{{ t('kimCheck', { n: picks.length, m: KIM_MISSING }) }}</button>
    </template>

    <!-- how it went -->
    <template v-if="phase === 'done' && result">
      <div class="card score">
        <div class="big">{{ result.correct === KIM_MISSING ? '🏆' : result.correct >= 2 ? '👏' : '🙈' }}</div>
        <b>{{ result.correct }}/{{ KIM_MISSING }} · {{ secs(result.ms) }}</b>
        <span class="grid">{{ grid }}</span>
        <div v-if="result.won && Object.keys(result.won).length" class="won">🎁 {{ t('kimWon') }} <b>{{ Object.entries(result.won).map(([k, n]) => `${n}× ${emojiOf(k)}`).join(' ') }}</b></div>
        <small class="muted">{{ t('kimTomorrow') }}</small>
      </div>

      <div v-if="data?.daredBy?.length" class="card">
        <div class="tiny muted" style="font-weight:700;margin-bottom:6px">{{ t('kimDaredBy') }}</div>
        <div v-for="d in data.daredBy" :key="d.id" class="row">
          <Avatar :name="`${d.firstName} ${d.lastName}`" :photo="d.photo" :avatar="d.figure || d.avatar" :size="34" no-zoom />
          <span class="nm">{{ d.firstName }}</span>
          <b>{{ d.correct }}/{{ KIM_MISSING }} · {{ secs(d.ms) }}</b>
          <span>{{ d.correct == null ? '' : result.correct > d.correct || (result.correct === d.correct && result.ms < d.ms) ? '🏆' : result.correct === d.correct && result.ms === d.ms ? '🤝' : '😅' }}</span>
        </div>
      </div>

      <template v-if="!data?.paused && data?.canDare?.length">
        <div class="sec-title">{{ t('kimDare') }}</div>
        <div class="tiny muted" style="margin-top:-2px">{{ t('kimDareSub') }}</div>
        <div class="dares">
          <button v-for="l in data.canDare" :key="l.id" class="dare" :disabled="busy || data.dared.includes(l.id) || data.dared.length >= 3" @click="dare(l)">
            <Avatar :name="`${l.firstName} ${l.lastName}`" :photo="l.photo" :avatar="l.figure || l.avatar" :size="46" no-zoom />
            <span>{{ data.dared.includes(l.id) ? '✓ ' : '' }}{{ l.firstName }}</span>
          </button>
        </div>
      </template>
    </template>

    <!-- today, and the week -->
    <template v-if="data?.today?.length">
      <div class="sec-title">{{ t('kimToday') }}</div>
      <div class="card">
        <div v-for="(p, i) in data.today" :key="p.id" class="row" :class="{ me: p.me }">
          <span class="pos">{{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1 }}</span>
          <Avatar :name="`${p.firstName} ${p.lastName}`" :photo="p.photo" :avatar="p.figure || p.avatar" :size="34" no-zoom />
          <span class="nm">{{ p.firstName }}</span>
          <b>{{ p.correct }}/{{ KIM_MISSING }}</b><span class="muted">{{ secs(p.ms) }}</span>
        </div>
      </div>
    </template>
    <template v-if="data?.week?.length">
      <div class="sec-title">{{ t('kimWeek') }}</div>
      <div class="card">
        <div v-for="(p, i) in data.week" :key="p.id" class="row">
          <span class="pos">{{ i + 1 }}</span>
          <Avatar :name="`${p.firstName} ${p.lastName}`" :photo="p.photo" :avatar="p.figure || p.avatar" :size="34" no-zoom />
          <span class="nm">{{ p.firstName }}</span>
          <b>{{ p.correct }}</b><span class="muted">{{ t('kimDays', { n: p.days }) }}</span>
        </div>
      </div>
    </template>
  </AppShell>
</template>

<style scoped>
.intro, .score{display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center}
.intro p{margin:0; font-size:13.5px; line-height:1.55}
.big{font-size:44px; line-height:1}
.score b{font-size:24px}
.grid{font-size:22px; letter-spacing:2px}
.won{font-size:13.5px; background:#FFF4E0; border-radius:12px; padding:7px 12px}

.tray-wrap{display:flex; flex-direction:column; gap:8px}
.timer{height:8px; border-radius:4px; background:rgba(0,0,0,.08); overflow:hidden}
.timer span{display:block; height:100%; background:linear-gradient(90deg,#2E7D5B,#E8BB3E); border-radius:4px; transition:width .1s linear}
.tray{position:relative; overflow:hidden; display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:6px; padding:14px;
  border-radius:20px; background:linear-gradient(160deg,#C99460,#A8703F); box-shadow:inset 0 0 0 6px #8A5A30, inset 0 4px 14px rgba(0,0,0,.25), 0 6px 16px rgba(80,50,20,.25)}
.slot{position:relative; aspect-ratio:1; min-width:0; display:grid; place-items:center; border-radius:14px; background:rgba(255,255,255,.08)}
.slot img{width:84%; height:84%; min-width:0; object-fit:contain; filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}
.slot.gone{background:rgba(0,0,0,.14); box-shadow:inset 0 0 0 2px rgba(255,255,255,.35); border:0}
.q{font-size:26px; font-weight:800; color:rgba(255,255,255,.85)}
.slot img.was{opacity:.9}
.mark{position:absolute; right:2px; top:0; font-style:normal; font-size:15px}
/* a gingham cloth, drawn down over the tray and lifted again */
.cloth{position:absolute; inset:0; transform:translateY(-102%); transition:transform .75s cubic-bezier(.6,.05,.3,1); border-radius:20px;
  background:repeating-linear-gradient(0deg, rgba(214,44,54,.75) 0 14px, transparent 14px 28px), repeating-linear-gradient(90deg, rgba(214,44,54,.75) 0 14px, #FFF7F2 14px 28px);
  box-shadow:0 6px 12px rgba(0,0,0,.25)}
.cloth.down{transform:translateY(0)}
.hint{display:flex; align-items:center; justify-content:space-between; gap:10px; font-weight:700; font-size:14px}
.btn.small{padding:8px 14px; font-size:13px; width:auto}

.choices{display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:6px}
.choice{border:0; background:var(--card, #fff); border-radius:14px; padding:6px 2px; display:flex; flex-direction:column; align-items:center; gap:3px; box-shadow:0 1px 4px rgba(20,40,70,.08)}
.choice img{width:44px; height:44px; object-fit:contain}
.choice span{font-size:9px; font-weight:600; line-height:1.1; text-align:center; max-width:100%; overflow-wrap:anywhere; hyphens:auto}
.choice.on{background:#2E7D5B; color:#fff; transform:scale(1.04)}

.row{display:flex; align-items:center; gap:10px; padding:6px 0; border-top:1px solid rgba(20,40,70,.06); font-size:14px}
.row:first-child{border-top:0}
.row.me .nm{color:var(--green, #2E7D5B)}
.row .nm{flex:1; min-width:0; font-weight:600}
.pos{width:24px; text-align:center; font-weight:700}
.dares{display:grid; grid-template-columns:repeat(auto-fill, minmax(72px, 1fr)); gap:8px}
.dare{border:0; background:var(--card, #fff); border-radius:16px; padding:8px 4px; display:flex; flex-direction:column; align-items:center; gap:4px; font-size:12px; font-weight:700; box-shadow:0 1px 4px rgba(20,40,70,.08)}
.dare:disabled{opacity:.5}
</style>
