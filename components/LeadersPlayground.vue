<script setup lang="ts">
/* The Βαθμοφόροι's playground: every leader of every sector, standing on a
   campsite. Tap one and throw a tomato, poke them, or send a hug — they are
   told, and it plays out here: the thing flies across, lands, and a thrown
   one leaves its mark on them for a while. What the others get up to plays
   out too, live; what was done to you while you were away plays when you
   come back. Tapping yourself sets how much of it you want. */
import { avatarSvg, DEFAULT_AVATAR } from '~/utils/avatar'
import { FUN_ACTIONS, funAction, funAllowed, type FunAction, type FunMotion } from '~/utils/fun'

const { t, locale } = useI18n()
const { show } = useToast()
const route = useRoute()
const { data, refresh } = await useFetch<any>('/api/admin/fun', { lazy: true })

const myId = computed<number | undefined>(() => data.value?.me?.id)
const left = computed(() => Math.max(0, (data.value?.me?.limit ?? 0) - (data.value?.me?.sentToday ?? 0)))
const recent = computed<any[]>(() => data.value?.recent || [])
const nameOf = (l: any) => l.firstName
const text = (a: FunAction) => locale.value === 'en' ? a.en : a.el

/* ---- the figures ---- */
const svgs = computed(() => new Map((data.value?.leaders || []).map((l: any) =>
  [l.id, avatarSvg(l.figure || DEFAULT_AVATAR, 'fun' + l.id, 'stand')])))
const initials = (l: any) => `${l.firstName?.[0] || ''}${l.lastName?.[0] || ''}`.toUpperCase()

// a small number from an id, for where a mark lands on someone
const hash = (n: number) => { let x = Math.imul(n, 2654435761) >>> 0; x = (x ^ (x >>> 13)) >>> 0; return (x % 1000) / 1000 }
const HOURS = 3600_000
/** The marks still on someone: what was thrown at them in the last 12 hours. */
function stainsOn(id: number) {
  return recent.value.filter(r => r.to === id && funAction(r.action)?.stain && Date.now() - Date.parse(r.at) < 12 * HOURS)
    .slice(0, 6).map(r => ({ id: r.id, color: funAction(r.action)!.stain!, x: 32 + hash(r.id) * 36, y: 24 + hash(r.id + 7) * 34, s: 10 + hash(r.id + 3) * 7 }))
}
/** The kind things lately done to them, at their feet. */
function giftsAt(id: number) {
  const seen = new Set<string>()
  return recent.value.filter(r => r.to === id && funAction(r.action)?.motion === 'kind' && Date.now() - Date.parse(r.at) < 12 * HOURS)
    .map(r => funAction(r.action)!.emoji).filter(e => !seen.has(e) && seen.add(e)).slice(0, 3)
}

/* ---- the sheet ---- */
const target = ref<any>(null)
const mine = ref(false)
function tap(l: any) {
  if (l.me) { mine.value = true; return }
  target.value = l
}
const GROUPS: { motion: FunMotion, label: string }[] = [
  { motion: 'throw', label: 'funGroupThrow' }, { motion: 'shove', label: 'funGroupShove' }, { motion: 'kind', label: 'funGroupKind' }]
const groupsFor = (l: any) => GROUPS.map(g => ({ ...g, actions: FUN_ACTIONS.filter(a => a.motion === g.motion && funAllowed(l.pref, a)) }))
  .filter(g => g.actions.length)
/** This week, between me and them. */
function score(id: number) {
  return { me: recent.value.filter(r => r.from === myId.value && r.to === id).length, them: recent.value.filter(r => r.from === id && r.to === myId.value).length }
}

/* ---- doing it ---- */
const busy = ref(false)
const played = new Set<number>()
async function act(to: any, a: FunAction) {
  target.value = null
  if (busy.value) return
  busy.value = true
  try {
    const r = await $fetch<any>('/api/admin/fun', { method: 'POST', body: { to: to.id, action: a.key } })
    played.add(r.id)
    if (data.value?.me) data.value.me.sentToday++
    await play(a, myId.value!, to.id)
    await refresh()
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}
/** Send back to someone what they last sent you. */
const backTo = (r: any) => {
  const l = data.value?.leaders?.find((x: any) => x.id === r.from)
  const a = funAction(r.action)
  if (l && a) act(l, a)
}

/* ---- how it plays out ---- */
const stage = ref<HTMLElement | null>(null)
const figs = new Map<number, HTMLElement>()
const setFig = (id: number, el: any) => { if (el) figs.set(id, el as HTMLElement); else figs.delete(id) }
const hit = ref<Record<number, string>>({})
const reduced = () => import.meta.client && matchMedia('(prefers-reduced-motion: reduce)').matches
const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Where on the stage someone stands: their middle, and their face. */
function spot(id: number) {
  const s = stage.value!.getBoundingClientRect()
  const el = figs.get(id)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height * 0.5, face: r.top - s.top + r.height * 0.28, w: r.width }
}
function sprite(txt: string, cls = 'sprite') {
  const el = document.createElement('div')
  el.className = cls; el.textContent = txt
  stage.value!.appendChild(el)
  return el
}
function burst(x: number, y: number, color: string | null, emoji: string | null, n = 9) {
  for (let i = 0; i < n; i++) {
    const el = emoji ? sprite(emoji, 'spark') : sprite('', 'drop')
    if (color) el.style.background = color
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.5, d = 26 + Math.random() * 26
    el.animate([
      { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 1 },
      { transform: `translate(${x + Math.cos(ang) * d}px, ${y + Math.sin(ang) * d + (emoji ? -20 : 14)}px) scale(${emoji ? 1.2 : 0.4})`, opacity: 0 }
    ], { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(.2,.7,.3,1)' }).finished.then(() => el.remove())
  }
}
function shake(id: number, how: string) {
  hit.value = { ...hit.value, [id]: how }
  setTimeout(() => { const h = { ...hit.value }; delete h[id]; hit.value = h }, 700)
}

/** One thing done by one to another, played out on the stage. */
async function play(a: FunAction, fromId: number, toId: number) {
  if (!stage.value) return
  const to = spot(toId)
  if (!to) return
  const from = spot(fromId)
  const sx = from?.x ?? stage.value.clientWidth / 2, sy = from?.y ?? stage.value.clientHeight + 20
  if (reduced()) {
    sfx(a.motion === 'throw' ? 'splat' : a.motion === 'shove' ? 'thud' : 'twinkle')
    burst(to.x, to.face, null, a.emoji, 1)
    return
  }
  if (a.motion === 'throw') {
    sfx('whoosh')
    const el = sprite(a.emoji)
    const dx = to.x - sx, dy = to.face - sy
    const lift = 70 + Math.hypot(dx, dy) * 0.25
    const frames = Array.from({ length: 16 }, (_, i) => {
      const p = i / 15
      return { transform: `translate(${sx + dx * p}px, ${sy + dy * p - 4 * lift * p * (1 - p)}px) rotate(${p * 540}deg) scale(${1 + p * 0.3})` }
    })
    await el.animate(frames, { duration: 620, easing: 'linear' }).finished
    el.remove()
    sfx('splat')
    burst(to.x, to.face, a.stain || '#999', null, 11)
    shake(toId, 'splat')
  } else if (a.motion === 'shove') {
    const el = sprite(a.emoji)
    const side = sx <= to.x ? -1 : 1
    const x0 = to.x + side * (to.w * 0.75)
    await el.animate([
      { transform: `translate(${x0}px, ${to.y}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${x0}px, ${to.y}px) scale(1.15)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${to.x + side * to.w * 0.25}px, ${to.y}px) scale(1.3)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${x0}px, ${to.y}px) scale(1)`, opacity: 0 }
    ], { duration: 700, easing: 'ease-in-out' }).finished.then(() => el.remove())
    sfx('thud')
    shake(toId, side < 0 ? 'pushR' : 'pushL')
  } else {
    sfx('twinkle')
    const el = sprite(a.emoji)
    burst(to.x, to.face, null, a.key === 'confetti' ? '🎊' : '✨', 7)
    shake(toId, 'glow')
    await el.animate([
      { transform: `translate(${to.x}px, ${to.face}px) scale(.3)`, opacity: 0 },
      { transform: `translate(${to.x}px, ${to.face - 30}px) scale(1.5)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${to.x}px, ${to.face - 60}px) scale(1.2)`, opacity: 0 }
    ], { duration: 1100, easing: 'cubic-bezier(.2,.8,.3,1)' }).finished
    el.remove()
  }
  await wait(250)
}

/* ---- what happened while I was away, and what happens now ---- */
const SEEN = 'fun.seen'
const readSeen = () => { try { return Number(localStorage.getItem(SEEN)) || 0 } catch { return 0 } }
const writeSeen = (n: number) => { try { localStorage.setItem(SEEN, String(n)) } catch {} }
let baseline = -1
async function playNew() {
  const rows = recent.value
  if (!rows.length || !myId.value) return
  const top = Math.max(...rows.map(r => r.id))
  let queue: any[] = []
  if (baseline < 0) {
    // the first look: what was done to me since I last looked (a day at most),
    // or the one a notification opened
    const seen = readSeen()
    const asked = Number(route.query.fun) || 0
    queue = rows.filter(r => r.to === myId.value && ((r.id > seen && Date.now() - Date.parse(r.at) < 24 * HOURS) || r.id === asked))
    if (queue.length) show(`${t('funAway')} ${[...new Set(queue.map(r => funAction(r.action)?.emoji))].join('')}`)
  } else queue = rows.filter(r => r.id > baseline)
  baseline = top
  writeSeen(top)
  queue = queue.filter(r => !played.has(r.id)).sort((a, b) => a.id - b.id).slice(-4)
  if (queue.length) await nextTick()
  for (const r of queue) {
    played.add(r.id)
    const a = funAction(r.action)
    if (a) await play(a, r.from, r.to)
  }
}
watch(() => data.value?.recent, () => { if (import.meta.client) setTimeout(playNew, baseline < 0 ? 500 : 0) }, { immediate: true })
// live: a look every 20 seconds while the page is in front
let timer: any
onMounted(() => { timer = setInterval(() => { if (document.visibilityState === 'visible' && !busy.value) refresh() }, 20_000) })
onBeforeUnmount(() => clearInterval(timer))

/* ---- my own say ---- */
async function setPref(pref: string) {
  try {
    await $fetch('/api/admin/fun/settings', { method: 'POST', body: { pref } })
    if (data.value?.me) data.value.me.pref = pref
    await refresh(); sfx('pop')
  } catch (e: any) { show(errMsg(e)) }
}
async function setPaused(paused: boolean) {
  try { await $fetch('/api/admin/fun/settings', { method: 'POST', body: { paused } }); await refresh() } catch (e: any) { show(errMsg(e)) }
}

/* ---- the feed ---- */
function ago(iso: string) {
  const m = Math.floor((Date.now() - Date.parse(iso)) / 60_000)
  if (m < 1) return t('funJustNow')
  if (m < 60) return t('funMinAgo', { n: m })
  if (m < 1440) return t('funHourAgo', { n: Math.floor(m / 60) })
  return t('funDayAgo', { n: Math.floor(m / 1440) })
}
const feed = computed(() => recent.value.slice(0, 12).map(r => ({
  ...r, a: funAction(r.action),
  fromLabel: r.from === myId.value ? t('funYou') : r.fromName,
  toLabel: r.to === myId.value ? t('funYouObj') : r.toName,
  canReturn: r.to === myId.value && r.from !== myId.value && Date.now() - Date.parse(r.at) < 24 * HOURS
})).filter(r => r.a))
</script>

<template>
  <div v-if="data?.leaders?.length" class="fun">
    <div class="fun-head">
      <div>
        <b>🎪 {{ t('funTitle') }}</b>
        <span>{{ data.paused ? t('funPaused') : t('funSub') }}</span>
      </div>
      <span v-if="!data.paused && data.me.pref !== 'off'" class="ammo">{{ t('funLeft', { n: left }) }}</span>
    </div>

    <div ref="stage" class="stage" :class="{ paused: data.paused }">
      <span class="deco d1">🌲</span><span class="deco d2">⛺</span><span class="deco d3">🌲</span>
      <button v-for="l in data.leaders" :key="l.id" class="who" :class="[hit[l.id], { me: l.me, off: l.pref === 'off' }]"
              :aria-label="`${l.firstName} ${l.lastName}`" @click="tap(l)">
        <span :ref="el => setFig(l.id, el)" class="fig">
          <span class="body" v-html="svgs.get(l.id)" />
          <span v-if="!l.figure" class="disc">
            <img v-if="l.photo" :src="l.photo" alt="" loading="lazy">
            <template v-else>{{ initials(l) }}</template>
          </span>
          <span v-for="s in stainsOn(l.id)" :key="s.id" class="stain"
                :style="{ left: s.x + '%', top: s.y + '%', width: s.s + 'px', height: s.s + 'px', background: s.color }" />
          <span v-if="giftsAt(l.id).length" class="gifts">{{ giftsAt(l.id).join('') }}</span>
        </span>
        <span class="nm">{{ l.me ? t('funYou') : nameOf(l) }}</span>
        <span class="wh">{{ l.where }}</span>
      </button>
    </div>

    <div class="feed">
      <div class="tiny muted feed-t">{{ t('funFeed') }}</div>
      <div v-if="!feed.length" class="tiny muted">{{ t('funNone') }}</div>
      <div v-for="r in feed" :key="r.id" class="line">
        <span class="em">{{ r.a!.emoji }}</span>
        <span class="txt"><b>{{ r.fromLabel }}</b> → <b>{{ r.toLabel }}</b><small>{{ text(r.a!) }} · {{ ago(r.at) }}</small></span>
        <button v-if="r.canReturn && !data.paused && data.me.pref !== 'off'" class="back" :disabled="busy" @click="backTo(r)">↩️ {{ t('funBack') }}</button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="target" class="sheet-backdrop" @click.self="target = null">
        <div class="sheet fun-sheet">
          <div class="t-head">
            <Avatar :name="`${target.firstName} ${target.lastName}`" :photo="target.photo" :avatar="target.avatar" :size="46" no-zoom />
            <div style="min-width:0">
              <b>{{ target.firstName }} {{ target.lastName }}</b>
              <span class="tiny muted">{{ target.where }}</span>
            </div>
            <div v-if="score(target.id).me + score(target.id).them" class="score">
              <small>{{ t('funWeek') }}</small>
              <b>{{ score(target.id).me }} – {{ score(target.id).them }}</b>
            </div>
          </div>
          <div v-if="data.paused" class="note">{{ t('funPaused') }}</div>
          <div v-else-if="data.me.pref === 'off'" class="note">{{ t('funPrefOff') }} · {{ t('funMine') }} ›</div>
          <div v-else-if="target.pref === 'off'" class="note">{{ target.firstName }}: {{ t('funOut') }}</div>
          <template v-else>
            <div v-if="target.pref === 'kind'" class="note soft">{{ t('funKindOnly') }}</div>
            <div v-for="g in groupsFor(target)" :key="g.motion" class="grp">
              <div class="tiny muted">{{ t(g.label) }}</div>
              <div class="acts">
                <button v-for="a in g.actions" :key="a.key" class="act" :class="g.motion" :disabled="!left || busy" @click="act(target, a)">
                  <span class="e">{{ a.emoji }}</span><span class="l">{{ text(a) }}</span>
                </button>
              </div>
            </div>
            <div class="tiny muted" style="text-align:center">{{ t('funLeft', { n: left }) }}</div>
          </template>
        </div>
      </div>

      <div v-if="mine" class="sheet-backdrop" @click.self="mine = false">
        <div class="sheet fun-sheet">
          <h3 style="margin:0 0 4px;font-size:17px;text-align:center">{{ t('funMine') }}</h3>
          <div class="prefs">
            <button v-for="p in ['all', 'kind', 'off']" :key="p" class="pref" :class="{ on: data.me.pref === p }" @click="setPref(p)">
              {{ t(p === 'all' ? 'funPrefAll' : p === 'kind' ? 'funPrefKind' : 'funPrefOff') }}
            </button>
          </div>
          <div class="tiny muted" style="text-align:center">{{ t('funPrefNote') }}</div>
          <label v-if="data.canPause" class="pause">
            <span>⏸️ {{ t('funPause') }}</span>
            <input type="checkbox" :checked="data.paused" @change="setPaused(($event.target as HTMLInputElement).checked)">
          </label>
          <button class="btn ghost" @click="mine = false">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.fun{margin:14px 0}
.fun-head{display:flex; align-items:flex-end; justify-content:space-between; gap:10px; margin:0 2px 8px}
.fun-head b{display:block; font-size:16px}
.fun-head span{font-size:12.5px; color:var(--muted)}
.ammo{flex:none; font-weight:700; color:var(--ink, #1d2b44) !important; background:#fff; border-radius:999px; padding:4px 10px; box-shadow:0 1px 4px rgba(0,0,0,.08)}

.stage{
  position:relative; border-radius:22px; padding:16px 8px 12px; overflow:hidden;
  display:grid; grid-template-columns:repeat(auto-fill, minmax(74px, 1fr)); gap:8px 0;
  background:
    radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,.7), transparent 60%),
    linear-gradient(180deg, #CFE8FA 0%, #E4F3E0 38%, #BFE0A8 100%);
  box-shadow:inset 0 0 0 1px rgba(46,125,91,.12);
}
.stage.paused{filter:grayscale(.7); opacity:.8}
.deco{position:absolute; font-size:28px; opacity:.35; pointer-events:none}
.d1{left:8px; bottom:6px} .d2{right:10px; bottom:8px; font-size:24px} .d3{right:38%; top:6px; font-size:20px; opacity:.2}

.who{position:relative; border:0; background:none; padding:0; display:flex; flex-direction:column; align-items:center; cursor:pointer; -webkit-tap-highlight-color:transparent}
.who.off{opacity:.55}
.fig{position:relative; width:100%; max-width:96px; aspect-ratio:184/352; display:block; transform-origin:50% 100%}
.fig::after{content:""; position:absolute; left:18%; right:18%; bottom:-2px; height:9px; border-radius:50%; background:rgba(30,60,30,.22); z-index:-1}
.body :deep(svg){width:100%; height:100%; display:block}
.body{display:block; width:100%; height:100%}
.who:active .fig{transform:scale(.96)}
.who.me .nm{color:var(--green, #2E7D5B)}
.disc{position:absolute; left:50%; top:24%; width:44%; aspect-ratio:1; transform:translate(-50%, -50%); border-radius:50%; overflow:hidden;
  display:grid; place-items:center; background:var(--grad-lead, #2E86AC); color:#fff; font-weight:800; font-size:13px; box-shadow:0 0 0 2px #fff}
.disc img{width:100%; height:100%; object-fit:cover}
.stain{position:absolute; transform:translate(-50%, -50%); border-radius:58% 42% 61% 39% / 45% 57% 43% 55%; opacity:.88; pointer-events:none;
  filter:drop-shadow(0 1px 1px rgba(0,0,0,.25))}
.gifts{position:absolute; left:50%; bottom:-6px; transform:translateX(-50%); font-size:13px; white-space:nowrap; pointer-events:none}
.nm{font-size:12.5px; font-weight:700; margin-top:6px; color:var(--ink, #1d2b44); max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.wh{font-size:10px; color:var(--muted); max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}

.who.splat .fig{animation:splat .6s ease}
.who.pushR .fig{animation:pushR .6s ease}
.who.pushL .fig{animation:pushL .6s ease}
.who.glow .fig{animation:glow .7s ease}
@keyframes splat{20%{transform:scale(1.06,.92)} 45%{transform:rotate(-6deg)} 70%{transform:rotate(4deg)}}
@keyframes pushR{30%{transform:translateX(10px) rotate(9deg)} 60%{transform:translateX(-3px) rotate(-3deg)}}
@keyframes pushL{30%{transform:translateX(-10px) rotate(-9deg)} 60%{transform:translateX(3px) rotate(3deg)}}
@keyframes glow{40%{transform:translateY(-8px) scale(1.04); filter:drop-shadow(0 0 10px #FFD54F)}}

.stage :deep(.sprite){position:absolute; left:0; top:0; margin:-16px 0 0 -16px; width:32px; height:32px; font-size:28px; line-height:32px; text-align:center; pointer-events:none; z-index:5}
.stage :deep(.spark){position:absolute; left:0; top:0; margin:-9px 0 0 -9px; font-size:16px; pointer-events:none; z-index:5}
.stage :deep(.drop){position:absolute; left:0; top:0; margin:-5px 0 0 -5px; width:10px; height:10px; border-radius:50%; pointer-events:none; z-index:5}

.feed{margin-top:10px; background:#fff; border-radius:18px; padding:10px 12px; box-shadow:0 1px 6px rgba(20,40,70,.06)}
.feed-t{font-weight:700; margin-bottom:4px}
.line{display:flex; align-items:center; gap:8px; padding:6px 0; border-top:1px solid rgba(20,40,70,.06); font-size:13px}
.line:first-of-type{border-top:0}
.line .em{font-size:18px; flex:none}
.line .txt{flex:1; min-width:0}
.line .txt small{display:block; font-size:11.5px; color:var(--muted)}
.back{flex:none; border:0; border-radius:999px; background:#FDECEC; color:#B3261E; font-weight:700; font-size:12px; padding:5px 10px}

.fun-sheet{display:flex; flex-direction:column; gap:12px; max-height:86dvh; overflow:auto}
.t-head{display:flex; align-items:center; gap:12px}
.t-head b{display:block; font-size:16px}
.score{margin-left:auto; text-align:center; background:#fff; border-radius:14px; padding:5px 10px; flex:none}
.score small{display:block; font-size:10px; color:var(--muted)}
.score b{font-size:17px}
.note{background:#fff; border-radius:14px; padding:12px; text-align:center; font-weight:600}
.note.soft{padding:8px; font-size:13px; font-weight:600; background:#EAF6EF; color:#2E7D5B}
.grp .tiny{font-weight:700; margin:0 2px 6px}
.acts{display:grid; grid-template-columns:repeat(4, 1fr); gap:8px}
.act{border:0; background:#fff; border-radius:16px; padding:10px 4px 8px; display:flex; flex-direction:column; align-items:center; gap:4px; box-shadow:0 1px 4px rgba(20,40,70,.08)}
.act:active{transform:scale(.94)}
.act:disabled{opacity:.4}
.act .e{font-size:26px; line-height:1}
.act .l{font-size:10.5px; font-weight:600; line-height:1.15; text-align:center; color:var(--ink, #1d2b44)}
.act.kind{background:#FFF7E6}
.prefs{display:flex; flex-direction:column; gap:8px}
.pref{border:0; background:#fff; border-radius:14px; padding:12px; font-weight:700; font-size:14px; box-shadow:0 1px 4px rgba(20,40,70,.08)}
.pref.on{background:var(--green, #2E7D5B); color:#fff}
.pause{display:flex; align-items:center; justify-content:space-between; background:#fff; border-radius:14px; padding:12px; font-weight:700}
.pause input{width:22px; height:22px}
</style>
