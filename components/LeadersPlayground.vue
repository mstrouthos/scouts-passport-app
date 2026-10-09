<script setup lang="ts">
/* The Βαθμοφόροι's playground: every leader of every sector, standing on a
   campsite. Tap one and throw a tomato, poke them, or send a hug — they are
   told, and it plays out here: the thing flies across, lands, and a thrown
   one leaves its mark on them for a while. What the others get up to plays
   out too, live; what was done to you while you were away plays when you
   come back. Tapping yourself sets how much of it you want.
   Two games on the same campsite, each a full screen of its own: 'throw'
   (the backpack, throws, shoves and hugs, and the day's target) and 'potato'
   (only the hot potato: tap someone to throw it to them). */
import { avatarSvg, DEFAULT_AVATAR } from '~/utils/avatar'
import { shortName } from '~/utils/shortName'
import { FUN_ACTIONS, FUN_GAME, FUN_IMPACT, FUN_SPARKLE, FUN_KIND_SCREEN, funAction, funAllowed, isPlay, isThrowable, THROWABLES, ITEM_TIER, BAG_MAX, pouchOf, type FunAction, type FunMotion } from '~/utils/fun'

const props = withDefaults(defineProps<{ game?: 'throw' | 'potato' }>(), { game: 'throw' })
const isPotato = computed(() => props.game === 'potato')
/** Whether a line of the feed (or a throw to replay) belongs to this game. */
const POTATO_ACTIONS = ['potato', 'burn']
const inGame = (action: string) => POTATO_ACTIONS.includes(action) === isPotato.value

const { t, locale } = useI18n()
const { show } = useToast()
const route = useRoute()
const { data, refresh } = await useFetch<any>('/api/admin/fun', { lazy: true })

const myId = computed<number | undefined>(() => data.value?.me?.id)
/* ten, then two hours' rest, then ten more (utils/fun.ts) */
const round = computed<{ left: number, readyAt: string | null, done: boolean }>(() => data.value?.me?.round || { left: 0, readyAt: null, done: false })
const left = computed(() => round.value.left)
const ammoText = computed(() => round.value.done ? t('funDone')
  : round.value.readyAt ? t('funRest', { t: new Date(round.value.readyAt).toLocaleTimeString(locale.value === 'en' ? 'en-GB' : 'el-GR', { timeZone: 'Europe/Nicosia', hour: '2-digit', minute: '2-digit', hour12: false }) })
  : t('funLeftRound', { n: left.value }))
const recent = computed<any[]>(() => data.value?.recent || [])
const nameOf = (l: any) => shortName(l)
const text = (a: FunAction) => locale.value === 'en' ? a.en : a.el

/* ---- the figures ----
   faces, a round one each, to fit more on the screen; or, for whoever
   prefers it, everyone standing in full — kept on this phone */
const fullBody = ref(false)
onMounted(() => { try { fullBody.value = localStorage.getItem('fun.view') === 'body' } catch {} })
function toggleView() {
  fullBody.value = !fullBody.value
  try { localStorage.setItem('fun.view', fullBody.value ? 'body' : 'face') } catch {}
}
const svgs = computed(() => new Map((data.value?.leaders || []).map((l: any) =>
  [l.id, avatarSvg(l.figure || DEFAULT_AVATAR, 'fun' + l.id, fullBody.value ? 'stand' : 'full')])))
const initials = (l: any) => `${l.firstName?.[0] || ''}${l.lastName?.[0] || ''}`.toUpperCase()

// a small number from an id, for where a mark lands on someone
const hash = (n: number) => { let x = Math.imul(n, 2654435761) >>> 0; x = (x ^ (x >>> 13)) >>> 0; return (x % 1000) / 1000 }
const HOURS = 3600_000
/** The marks still on someone: what was thrown at them in the last 12 hours. */
function stainsOn(id: number) {
  return recent.value.filter(r => r.to === id && funAction(r.action)?.stain && Date.now() - Date.parse(r.at) < 12 * HOURS)
    .slice(0, 6).map(r => ({ id: r.id, color: funAction(r.action)!.stain!, img: funAction(r.action)!.art?.splat, x: 32 + hash(r.id) * 36, y: fullBody.value ? 24 + hash(r.id + 7) * 34 : 28 + hash(r.id + 7) * 44, s: 10 + hash(r.id + 3) * 7 }))
}
/** The kind things lately done to them, at their feet. */
function giftsAt(id: number) {
  const seen = new Set<string>()
  return recent.value.filter(r => r.to === id && funAction(r.action)?.motion === 'kind' && Date.now() - Date.parse(r.at) < 12 * HOURS)
    .map(r => funAction(r.action)!).filter(a => !seen.has(a.key) && seen.add(a.key)).slice(0, 3)
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
  const done = recent.value.filter(r => isPlay(funAction(r.action)) && !r.auto)
  return { me: done.filter(r => r.from === myId.value && r.to === id).length, them: done.filter(r => r.from === id && r.to === myId.value).length }
}

/* ---- doing it ---- */
const busy = ref(false)
const played = new Set<number>()
// "who did it?": the next throw goes without a name (once a week)
const anon = ref(false)
watch(target, () => { anon.value = false })
async function act(to: any, a: FunAction, back = false) {
  const asAnon = anon.value && a.motion === 'throw'
  target.value = null
  if (busy.value) return
  busy.value = true
  try {
    const r = await $fetch<any>('/api/admin/fun', { method: 'POST', body: { to: to.id, action: a.key, anon: asAnon } })
    played.add(r.id)
    if (data.value?.me && r.round) data.value.me.round = r.round
    if (r.bag && data.value) data.value.bag = r.bag
    if (back) show(`↩️ ${t('funBackDone', { e: a.emoji, name: shortName(to) })}`, 2600)
    await play(a, myId.value!, to.id)
    await refresh()
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}
/** Send back to someone what they last sent you — up on the campsite, where
    it can be seen landing. With none of it left in the backpack, their card
    opens to send something else. */
async function backTo(r: any) {
  const l = data.value?.leaders?.find((x: any) => x.id === r.from)
  const a = funAction(r.action)
  if (!l || !a) return
  if (isThrowable(a.key) && !bag.value[a.key]) { show(t('funBackNone', { e: a.emoji })); target.value = l; return }
  stage.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  await new Promise(res => setTimeout(res, 380))
  await act(l, a, true)
}

/* ---- "who did it?": guessing who threw it ---- */
const guessing = ref<any>(null)
const tried = ref<number[]>([])
function openGuess(r: any) { guessing.value = r; tried.value = [] }
async function guess(who: any) {
  const r = guessing.value
  if (!r || busy.value) return
  busy.value = true
  try {
    const res = await $fetch<any>('/api/admin/fun/guess', { method: 'POST', body: { id: r.id, who: who.id } })
    if (res.right) {
      guessing.value = null
      show(`🎯 ${t('funGuessRight', { name: res.fromName })}`, 3200)
      played.add(res.backId)
      const a = funAction(res.action)
      if (a) await play(a, myId.value!, res.from)
      await refresh()
    } else if (res.left > 0) {
      tried.value = [...tried.value, who.id]
      r.guessesLeft = res.left
      sfx('wrong')
      show(`❌ ${t('funGuessWrong', { n: res.left })}`)
    } else {
      guessing.value = null
      sfx('wrong')
      show(`😎 ${t('funGuessEscaped', { name: res.fromName })}`, 3600)
      await refresh()
    }
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}

/* ---- the hot potato ---- */
const potato = computed<any>(() => data.value?.potato || {})
const holdIt = computed(() => potato.value.active?.holder === myId.value)
const clock = ref(Date.now())
let clockTimer: any
onMounted(() => { clockTimer = setInterval(() => { clock.value = Date.now() }, 1000) })
onBeforeUnmount(() => clearInterval(clockTimer))
/** How long the holder has had it — the longer, the likelier it bursts on them. */
const heldFor = computed(() => {
  const m = potato.value.active ? Math.max(0, Math.floor((clock.value - Date.parse(potato.value.active.gotAt)) / 60_000)) : 0
  return m < 60 ? `${m}′` : `${Math.floor(m / 60)} ${t('funHoursShort')} ${m % 60}′`
})
/* ---- the backpack 🎒 ---- */
const bag = computed<Record<string, number>>(() => data.value?.bag || {})
const bagCount = computed(() => Object.values(bag.value).reduce((n, x) => n + x, 0))
const have = (a: FunAction) => !isThrowable(a.key) || (bag.value[a.key] || 0) > 0
const itemsText = (items: Record<string, number>) => Object.entries(items).map(([k, n]) => `${funAction(k)?.emoji ?? k}×${n}`).join(' ')
const bagHelp = ref(false)
/** What the hold has earned so far — paid when the potato is passed on. */
const pouch = computed(() => holdIt.value ? pouchOf(potato.value.active.gotAt, clock.value) : 0)
/* what was put in the backpack while away: told once, then marked seen */
const REASON: Record<string, string> = { welcome: 'bagWelcome', potato: 'bagFromPotato', 'kim-dare': 'bagFromDare', 'kim-day': 'bagFromKimDay', 'kim-week': 'bagFromKimWeek' }
watch(() => data.value?.grants, async gs => {
  if (!import.meta.client || !gs?.length) return
  await new Promise(r => setTimeout(r, 1800))
  // one at a time, so each is read
  for (const g of gs) {
    sfx('unlock')
    show(`🎒 ${t(REASON[g.reason] || 'bagGift')}: +${itemsText(g.items)}`, 3000)
    await new Promise(r => setTimeout(r, 3200))
  }
  try { await $fetch('/api/admin/fun/grants-seen', { method: 'POST', body: { ids: gs.map((g: any) => g.id) } }) } catch {}
  if (data.value) data.value.grants = []
}, { immediate: true })
/* the rules, for anyone who asks; the Αρχηγός ends a round, and writes the challenges */
const rulesOpen = ref(false)
async function stopRound() {
  if (!confirm(t('funPotatoStopQ'))) return
  try { await $fetch('/api/admin/fun/potato-stop', { method: 'POST' }); await refresh(); show('⏹ ' + t('funPotatoStopped')) } catch (e: any) { show(errMsg(e)) }
}
// the Αρχηγός's editable list (one row each); everyone else's read-only one
const challenges = ref<string[] | null>(null)
const challengeList = ref<string[] | null>(null)
async function openChallenges() {
  try {
    const list = (await $fetch<any>('/api/admin/fun/potato-challenges')).challenges as string[]
    // the Αρχηγός writes them; everyone else reads them
    if (potato.value.canStop) challenges.value = [...list]
    else challengeList.value = list
  } catch (e: any) { show(errMsg(e)) }
}
async function addChallenge() {
  challenges.value = [...(challenges.value || []), '']
  // the new row, ready to type in
  await nextTick()
  const rows = document.querySelectorAll<HTMLInputElement>('.chrow input')
  rows[rows.length - 1]?.focus()
}
const removeChallenge = (i: number) => { challenges.value = challenges.value!.filter((_, j) => j !== i) }
async function saveChallenges() {
  try {
    await $fetch('/api/admin/fun/potato-challenges', { method: 'PUT', body: { challenges: (challenges.value || []).map(c => c.trim()).filter(Boolean) } })
    challenges.value = null; show('✅ ' + t('saved'))
  } catch (e: any) { show(errMsg(e)) }
}
/* ---- the day's target ----
   who had the most thrown at them (told to all at 23:00); opened big once —
   or when the notification is tapped — and a card until the next one */
const dailyTop = computed<any[]>(() => (data.value?.daily?.top || [])
  .map((id: number) => data.value?.leaders?.find((l: any) => l.id === id)).filter(Boolean))
const dailyNames = computed(() => {
  const n = dailyTop.value.map(l => l.me ? t('funYouCap') : shortName(l))
  return n.length > 1 ? n.slice(0, -1).join(', ') + ` ${t('and')} ` + n.at(-1) : n[0] || ''
})
const dailyOpen = ref(false)
watch(() => data.value?.daily?.day, (day) => {
  if (!day || isPotato.value || !import.meta.client) return
  let seen = ''
  try { seen = localStorage.getItem('fun.daily.seen') || '' } catch {}
  if (route.query.top || seen !== day) dailyOpen.value = true
}, { immediate: true })
function closeDaily() {
  dailyOpen.value = false
  try { localStorage.setItem('fun.daily.seen', data.value?.daily?.day || '') } catch {}
}
/* the Αρχηγός Συστήματος leaves someone out of the games that need them to
   take part, or lets them back; if they hold the potato it is thrown on */
/* the games' news kept off someone's phone, by the Αρχηγός Συστήματος */
async function toggleMuted(l: any) {
  busy.value = true
  try {
    await $fetch('/api/admin/fun/mute', { method: 'POST', body: { id: l.id, muted: !l.muted } })
    show(!l.muted ? t('gameNotifsMutedThem', { name: l.firstName }) : t('gameNotifsUnmutedThem', { name: l.firstName }))
    target.value = null
    await refresh()
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}
async function toggleExcluded(l: any) {
  const out = !l.excluded
  if (out && !confirm(t('gamesExcludeQ', { name: l.firstName }))) return
  busy.value = true
  try {
    const r = await $fetch<any>('/api/admin/fun/exclude', { method: 'POST', body: { id: l.id, out } })
    target.value = null
    await refresh()
    show(out ? (r.passedTo ? t('gamesExcludedPassed', { name: l.firstName, to: r.passedTo }) : r.ended ? t('gamesExcludedEnded', { name: l.firstName }) : t('gamesExcludedDone', { name: l.firstName })) : t('gamesIncludedDone', { name: l.firstName }))
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}
/** Whether I may throw the potato at them now: I hold it and they have not
    had it yet this round, or none is in play and one may start. */
const meExcluded = computed(() => !!data.value?.leaders?.find((l: any) => l.me)?.excluded)
const canPotato = (l: any) => !!l && !l.me && l.pref === 'all' && !l.excluded && !meExcluded.value && data.value?.me?.pref === 'all' && !data.value?.paused
  && (holdIt.value ? !!potato.value.active.canGet?.includes(l.id) : !!potato.value.canStart)
/** They had it this round already, so it cannot go to them yet. */
const hadIt = (l: any) => !!l && holdIt.value && l.pref === 'all' && !potato.value.active.canGet?.includes(l.id) && !l.me
/** How many have yet to hold it this round. */
const stillToGo = computed(() => potato.value.active ? Math.max(0, (data.value?.leaders || []).filter((l: any) => l.pref === 'all' && !potato.value.active.had?.includes(l.id)).length) : 0)
async function throwPotato(to: any) {
  target.value = null
  if (busy.value) return
  busy.value = true
  try {
    const r = await $fetch<any>('/api/admin/fun/potato', { method: 'POST', body: { to: to.id } })
    played.add(r.id)
    await play(FUN_GAME[0], myId.value!, to.id)
    if (r.newRound) show('🥔 ' + t('funPotatoNewRound', { name: shortName(to) }), 3200)
    if (r.paid && Object.keys(r.paid).length) { sfx('unlock'); show(`🎒 ${t('bagFromPotato')}: +${itemsText(r.paid)}`, 3600) }
    await refresh()
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
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
  return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height * 0.5, face: r.top - s.top + r.height * (fullBody.value ? 0.28 : 0.45), w: r.width }
}
function sprite(txt: string, cls = 'sprite') {
  const el = document.createElement('div')
  el.className = cls; el.textContent = txt
  stage.value!.appendChild(el)
  return el
}
function picture(src: string, cls: string) {
  const el = document.createElement('img')
  el.className = cls; el.src = src; el.alt = ''
  stage.value!.appendChild(el)
  return el
}
/* the drawn splat across the whole screen, when it is you they hit; it
   slides down the glass, and a tap wipes it off */
type ScreenFx = { kind: 'splat' | 'pow' | 'kind', src: string, key: number, wiping: boolean }
const screenSplat = ref<ScreenFx | null>(null)
let splatTimer: any
/* what lands on you fills the screen: a thrown thing's splat sliding down the
   glass; a shove's bang with what did it; a kind thing in a shower of sparkles */
function onScreen(src: string, kind: ScreenFx['kind']) {
  if (kind === 'splat') return addSplat(src)
  clearTimeout(splatTimer)
  screenSplat.value = { src, kind, key: Date.now(), wiping: false }
  splatTimer = setTimeout(wipe, kind === 'splat' ? 4200 : kind === 'pow' ? 1500 : 2600)
}
function wipe() {
  if (!screenSplat.value || screenSplat.value.wiping) return
  screenSplat.value.wiping = true
  clearTimeout(splatTimer)
  setTimeout(() => { screenSplat.value = null }, 450)
}
/* A splat stays on the glass until it is wiped off with a quick swipe — one
   swipe, one splat; a slow drag only smears it — and nothing under it can be
   tapped until the screen is clean. Only here, in Σπλατς: nowhere else in the
   app does anything land on the screen. */
type Splat = { key: number, src: string, x: number, y: number, r: number, s: number, gone: '' | 'l' | 'r' | 'u' | 'd' }
const splats = ref<Splat[]>([])
const smear = ref(0)
const glass = ref<HTMLElement | null>(null)
const splatsLeft = computed(() => splats.value.filter(s => !s.gone).length)
function addSplat(src: string) {
  const r = (n: number) => (Math.random() - .5) * n
  splats.value = [...splats.value, { key: Date.now() + Math.random(), src, x: r(28), y: r(26), r: r(50), s: .8 + Math.random() * .35, gone: '' as const }].slice(-8)
  nextTick(() => glass.value?.focus({ preventScroll: true }))
}
let swipe: { x: number, y: number, t: number } | null = null
function swipeStart(e: PointerEvent) {
  swipe = { x: e.clientX, y: e.clientY, t: performance.now() }
  try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch {}
}
function swipeEnd(e: PointerEvent) {
  if (!swipe) return
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y, dt = Math.max(1, performance.now() - swipe.t)
  swipe = null
  const dist = Math.hypot(dx, dy)
  // fast enough: a flick, not a drag
  if (dist > 60 && dist / dt > .6) wipeOne(Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'l' : 'r') : (dy < 0 ? 'u' : 'd'))
  else smear.value++
}
function wipeOne(dir: Splat['gone'] = 'l') {
  const top = [...splats.value].reverse().find(s => !s.gone)
  if (!top) return
  top.gone = dir
  sfx('whoosh')
  // gone from the list only once it has slid off, so the glass keeps catching taps until then
  setTimeout(() => { splats.value = splats.value.filter(s => s !== top) }, 420)
}
function glassKey(e: KeyboardEvent) {
  if (['Enter', ' ', 'Escape', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); wipeOne(e.key === 'ArrowRight' ? 'r' : 'l') }
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

/** One thing done by one to another, played out on the stage, with its
    drawn art and its own sound; when it is you they did it to, it fills
    your screen too. */
async function play(a: FunAction, fromId: number | null, toId: number) {
  if (!stage.value) return
  const to = spot(toId)
  if (!to) return
  const from = fromId != null ? spot(fromId) : null
  const atMe = toId === myId.value
  const sx = from?.x ?? stage.value.clientWidth / 2, sy = from?.y ?? stage.value.clientHeight + 20
  const art = a.art || {}
  if (reduced()) {
    funSound(a.key, a.motion, atMe)
    if (art.sprite) pop(art.sprite, to.x, to.face, 900)
    else burst(to.x, to.face, null, a.emoji, 1)
    return
  }
  if (a.motion === 'pass') {
    // the potato flies over, steaming, and stays in their hands
    sfx('whoosh')
    const el = sprite(a.emoji, 'sprite')
    const dx = to.x - sx, dy = to.y - sy
    const frames = Array.from({ length: 14 }, (_, i) => {
      const p = i / 13
      return { transform: `translate(${sx + dx * p}px, ${sy + dy * p - 4 * 80 * p * (1 - p)}px) rotate(${p * 360}deg)` }
    })
    await el.animate(frames, { duration: 650, easing: 'linear' }).finished
    el.remove()
    funSound(a.key, a.motion, atMe)
    burst(to.x, to.y - 10, null, '💨', 5)
    shake(toId, 'pushR')
    if (atMe) onScreen(a.emoji, 'pow')
    await wait(250)
    return
  }
  if (a.motion === 'burn') {
    funSound(a.key, a.motion, atMe)
    burst(to.x, to.y, null, '🔥', 9)
    shake(toId, 'splat')
    if (atMe) onScreen('🔥', 'pow')
    await wait(400)
    return
  }
  if (a.motion === 'throw') {
    sfx('whoosh')
    const el = thing(a, 'sprite')
    const dx = to.x - sx, dy = to.face - sy
    const lift = 70 + Math.hypot(dx, dy) * 0.25
    const spin = a.key === 'water' || a.key === 'pie' ? 40 : 540
    const frames = Array.from({ length: 16 }, (_, i) => {
      const p = i / 15
      return { transform: `translate(${sx + dx * p}px, ${sy + dy * p - 4 * lift * p * (1 - p)}px) rotate(${p * spin}deg) scale(${1 + p * 0.3})` }
    })
    await el.animate(frames, { duration: 620, easing: 'linear' }).finished
    el.remove()
    funSound(a.key, a.motion, atMe)
    shake(toId, 'splat')
    if (art.splat) {
      burst(to.x, to.face, a.stain || '#999', null, 11)
      // the splat lands on their face, holds a moment, and settles into the mark
      const s = picture(art.splat, 'splatpic')
      s.animate([
        { transform: `translate(${to.x}px, ${to.face}px) scale(.2) rotate(-20deg)`, opacity: 1 },
        { transform: `translate(${to.x}px, ${to.face}px) scale(1.15) rotate(4deg)`, opacity: 1, offset: 0.12 },
        { transform: `translate(${to.x}px, ${to.face}px) scale(1) rotate(0deg)`, opacity: 1, offset: 0.2 },
        { transform: `translate(${to.x}px, ${to.face + 14}px) scale(.9)`, opacity: 1, offset: 0.75 },
        { transform: `translate(${to.x}px, ${to.face + 20}px) scale(.85)`, opacity: 0 }
      ], { duration: 1600, easing: 'ease-out' }).finished.then(() => s.remove())
      if (atMe && art.screen) onScreen(art.screen, 'splat')
    } else {
      // a pine cone does not splat: it bonks, and bounces off
      pop(FUN_IMPACT, to.x, to.face - 6, 500, 0.8)
      const b = thing(a, 'sprite')
      b.animate([
        { transform: `translate(${to.x}px, ${to.face}px) rotate(0deg)` },
        { transform: `translate(${to.x + 30}px, ${to.face - 40}px) rotate(200deg)`, offset: 0.4 },
        { transform: `translate(${to.x + 55}px, ${to.y + 60}px) rotate(420deg)`, opacity: 0 }
      ], { duration: 800, easing: 'ease-in' }).finished.then(() => b.remove())
      if (atMe) onScreen(art.sprite || a.emoji, 'pow')
    }
  } else if (a.motion === 'shove') {
    const el = thing(a, 'sprite big')
    const side = sx <= to.x ? -1 : 1
    const x0 = to.x + side * (to.w * 0.8)
    const flip = side > 0 ? ' scaleX(-1)' : ''
    if (a.key === 'mosquito') {
      // it buzzes round their head before it bites
      const f = Array.from({ length: 24 }, (_, i) => {
        const p = i / 23, r = 26 * (1 - p * 0.6)
        return { transform: `translate(${to.x + Math.cos(p * 14) * r}px, ${to.face - 10 + Math.sin(p * 14) * r * 0.6}px)${Math.cos(p * 14 + 1.6) > 0 ? '' : ' scaleX(-1)'}` }
      })
      funSound(a.key, a.motion, atMe)
      await el.animate(f, { duration: 1100, easing: 'linear' }).finished
    } else {
      const jab = [
        { transform: `translate(${x0}px, ${to.y}px)${flip} scale(.6)`, opacity: 0 },
        { transform: `translate(${x0}px, ${to.y}px)${flip} scale(1.1)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${to.x + side * to.w * 0.2}px, ${to.y}px)${flip} scale(1.25)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${x0}px, ${to.y}px)${flip} scale(1)`, opacity: 0 }
      ]
      const done = el.animate(jab, { duration: 760, easing: 'ease-in-out' }).finished
      await wait(440)
      funSound(a.key, a.motion, atMe)
      await done
    }
    el.remove()
    pop(FUN_IMPACT, to.x - side * 6, to.y - 8, 420, 0.7)
    shake(toId, side < 0 ? 'pushR' : 'pushL')
    if (atMe) onScreen(art.sprite || a.emoji, 'pow')
  } else {
    funSound(a.key, a.motion, atMe)
    if (FUN_SPARKLE) pop(FUN_SPARKLE, to.x, to.face - 10, 1100, 1.2)
    else burst(to.x, to.face, null, a.key === 'confetti' ? '🎊' : '✨', 7)
    shake(toId, 'glow')
    const el = thing(a, 'sprite big')
    await el.animate([
      { transform: `translate(${to.x}px, ${to.face}px) scale(.3)`, opacity: 0 },
      { transform: `translate(${to.x}px, ${to.face - 30}px) scale(1.4)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${to.x}px, ${to.face - 40}px) scale(1.25)`, opacity: 1, offset: 0.7 },
      { transform: `translate(${to.x}px, ${to.face - 64}px) scale(1.1)`, opacity: 0 }
    ], { duration: 1300, easing: 'cubic-bezier(.2,.8,.3,1)' }).finished
    el.remove()
    if (atMe) onScreen(art.sprite || a.emoji, 'kind')
  }
  await wait(250)
}
/** What flies or appears: its drawing, or its emoji until it has one. */
const thing = (a: FunAction, cls: string) => a.art?.sprite ? picture(a.art.sprite, cls + ' pic') : sprite(a.emoji, cls)
/** A picture that pops up at a spot and fades. */
function pop(src: string, x: number, y: number, ms: number, size = 1) {
  const el = picture(src, 'poppic')
  el.animate([
    { transform: `translate(${x}px, ${y}px) scale(${0.2 * size})`, opacity: 1 },
    { transform: `translate(${x}px, ${y}px) scale(${1.1 * size})`, opacity: 1, offset: 0.25 },
    { transform: `translate(${x}px, ${y}px) scale(${1 * size})`, opacity: 1, offset: 0.6 },
    { transform: `translate(${x}px, ${y}px) scale(${0.9 * size})`, opacity: 0 }
  ], { duration: ms, easing: 'ease-out' }).finished.then(() => el.remove())
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
    queue = queue.filter(r => inGame(r.action))
    if (queue.length) show(`${t('funAway')} ${[...new Set(queue.map(r => funAction(r.action)?.emoji))].join('')}`)
  } else queue = rows.filter(r => r.id > baseline)
  baseline = top
  writeSeen(top)
  queue = queue.filter(r => !played.has(r.id) && inGame(r.action)).sort((a, b) => a.id - b.id).slice(-4)
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
onMounted(() => {
  // the small pictures now; the big full-screen splats a moment later
  const load = (srcs: (string | null | undefined)[]) => { for (const src of srcs) if (src) new Image().src = src }
  load([FUN_IMPACT, FUN_SPARKLE, ...FUN_ACTIONS.flatMap(a => [a.art?.sprite, a.art?.splat])])
  setTimeout(() => load([FUN_KIND_SCREEN, ...FUN_ACTIONS.map(a => a.art?.screen)]), 3000)
})
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
const feed = computed(() => recent.value.filter(r => inGame(r.action)).slice(0, 12).map(r => ({
  ...r, a: funAction(r.action),
  fromLabel: r.from == null ? `❓ ${t('funSomeone')}` : r.from === myId.value ? t('funYou') : r.fromName,
  toLabel: r.to === myId.value ? t('funYouObj') : r.toName,
  // a throw with no name on it, at me, still to be guessed
  canGuess: r.anon && r.from == null && r.to === myId.value,
  canReturn: isPlay(funAction(r.action)) && !r.anon && r.from != null && r.to === myId.value && r.from !== myId.value && Date.now() - Date.parse(r.at) < 24 * HOURS
    && !recent.value.some(x => x.from === myId.value && x.to === r.from && Date.parse(x.at) > Date.parse(r.at))
})).filter(r => r.a))
</script>

<template>
  <div v-if="data?.leaders?.length" class="fun">
    <div class="fun-head">
      <span>{{ data.paused ? t('funPaused') : isPotato ? t('potatoGameSub') : t('funSub') }}</span>
      <span v-if="!isPotato && !data.paused && data.me.pref !== 'off'" class="ammo">{{ ammoText }}</span>
    </div>

    <!-- the day's target: who had the most thrown at them, told to all at 23:00 -->
    <button v-if="!isPotato && dailyTop.length" class="daily" @click="dailyOpen = true">
      <span class="dfaces"><Avatar v-for="l in dailyTop.slice(0, 3)" :key="l.id" :name="`${l.firstName} ${l.lastName}`" :photo="l.photo" :avatar="l.figure || l.avatar" :size="40" no-zoom /></span>
      <span class="dtxt"><b>🎯 {{ t('funDailyTitle') }}</b><span>{{ t('funDailyLine', { who: dailyNames, n: data.daily.count }) }}</span></span>
      <span class="chev">›</span>
    </button>

    <!-- the backpack: what there is to throw, earned in the games -->
    <button v-if="!isPotato && data.me.pref !== 'off'" class="bagbar" @click="bagHelp = true">
      <span class="bagic">🎒</span>
      <span class="bagitems">
        <span v-for="k in THROWABLES.filter(k => bag[k])" :key="k" class="bi" :class="ITEM_TIER[k]">
          <img v-if="funAction(k)?.art?.sprite" :src="funAction(k)!.art!.sprite" alt=""><span v-else>{{ funAction(k)?.emoji }}</span><b>{{ bag[k] }}</b>
        </span>
        <span v-if="!bagCount" class="tiny muted">{{ t('bagEmpty') }}</span>
      </span>
      <span class="bagn">{{ bagCount }}/{{ BAG_MAX }}</span>
    </button>

    <!-- the hot potato: who has it (never when it bursts), what is at stake, or how the last one ended -->
    <div v-if="isPotato && meExcluded && !data.paused" class="note soft">🚫 {{ t('gamesExcludedMe') }}</div>
    <div v-else-if="isPotato && data.me.pref !== 'all' && !data.paused" class="note soft">🥔 {{ t('potatoNeedsAll') }}</div>
    <div v-if="isPotato && !data.paused" class="potato"
         :class="{ mine: holdIt, burst: !potato.active && potato.last?.burned }">
      <div class="prow">
        <span class="spud">{{ !potato.active && potato.last?.burned ? '💥' : '🥔' }}</span>
        <div v-if="holdIt" class="ptxt"><b>{{ t('funPotatoYours') }}</b><span>{{ t('funPotatoYoursSub', { held: heldFor }) }}</span><span class="pouch">💰 {{ t('funPouch', { n: pouch }) }}</span></div>
        <div v-else-if="potato.active" class="ptxt"><b>{{ t('funPotatoAt', { name: potato.active.holderName }) }}</b><span>{{ t('funPotatoPasses', { n: potato.active.passes, m: stillToGo }) }}</span></div>
        <div v-else-if="potato.last?.burned" class="ptxt"><b>{{ t('funPotatoBurst', { name: potato.last.burned === myId ? t('funYouObj') : potato.last.burnedName }) }}</b><span>{{ t('funPotatoBurstSub', { n: potato.last.passes }) }}</span></div>
        <div v-else-if="potato.last?.stopped" class="ptxt"><b>{{ t('funPotatoWasStopped') }}</b><span>{{ t('funPotatoStartSub') }}</span></div>
        <div v-else class="ptxt"><b>{{ t('funPotatoStart') }}</b><span>{{ t('funPotatoStartSub') }}</span></div>
        <button class="pinfo" :aria-label="t('funPotatoRulesTitle')" @click="rulesOpen = true">ℹ️</button>
      </div>
      <!-- what is at stake, from the start; what is owed, once it has burst -->
      <div v-if="potato.active?.challenge" class="pstake">🎯 {{ t('funPotatoStake') }} <b>«{{ potato.active.challenge }}»</b></div>
      <div v-else-if="!potato.active && potato.last?.challenge" class="pstake">🎯 {{ t('funPotatoOwes', { name: potato.last.burned === myId ? t('funYouCap') : potato.last.burnedName }) }} <b>«{{ potato.last.challenge }}»</b></div>
      <div class="pbtns">
        <button class="chip" @click="openChallenges">🎯 {{ t('funPotatoChallengesBtn') }}</button>
        <button v-if="potato.active && potato.canStop" class="chip" @click="stopRound">⏹ {{ t('funPotatoStop') }}</button>
      </div>
    </div>

    <div ref="stage" class="stage" :class="{ paused: data.paused, faces: !fullBody }">
      <span class="deco d1">🌲</span><span class="deco d2">⛺</span><span class="deco d3">🌲</span>
      <button class="viewtog" :aria-label="fullBody ? t('funViewFaces') : t('funViewBodies')" @click="toggleView">{{ fullBody ? '😀 ' + t('funViewFaces') : '🧍 ' + t('funViewBodies') }}</button>
      <button v-for="l in data.leaders" :key="l.id" class="who" :class="[hit[l.id], { me: l.me, off: l.pref === 'off' }]"
              :aria-label="`${l.firstName} ${l.lastName}`" @click="tap(l)">
        <span :ref="el => setFig(l.id, el)" class="fig">
          <!-- a face: their photo if they have one, else their avatar -->
          <img v-if="!fullBody && l.photo" :src="l.photo" alt="" class="body photo" loading="lazy">
          <span v-else class="body" v-html="svgs.get(l.id)" />
          <span v-if="fullBody && !l.figure" class="disc">
            <img v-if="l.photo" :src="l.photo" alt="" loading="lazy">
            <template v-else>{{ initials(l) }}</template>
          </span>
          <template v-for="s in stainsOn(l.id)" :key="s.id">
            <img v-if="s.img" :src="s.img" alt="" class="stain pic" :style="{ left: s.x + '%', top: s.y + '%', width: s.s * 1.5 + 'px' }">
            <span v-else class="stain" :style="{ left: s.x + '%', top: s.y + '%', width: s.s + 'px', height: s.s + 'px', background: s.color }" />
          </template>
          <span v-if="isPotato && l.excluded" class="outmark" :title="t('gamesExcludedThem', { name: l.firstName })">🚫</span>
          <span v-if="potato.active?.holder === l.id" class="held">🥔<i>💨</i></span>
          <span v-else-if="potato.active?.had?.includes(l.id)" class="had" :title="t('funPotatoHad')">🥔</span>
          <span v-if="giftsAt(l.id).length" class="gifts"><template v-for="g in giftsAt(l.id)" :key="g.key"><img v-if="g.art?.sprite" :src="g.art.sprite" alt=""><span v-else>{{ g.emoji }}</span></template></span>
        </span>
        <span class="nm"><template v-if="l.me">{{ t('funYou') }}</template><template v-else><span class="fn">{{ l.firstName }}</span><span v-if="l.lastName" class="ln">{{ l.lastName.trim()[0]?.toLocaleUpperCase('el') }}.</span></template></span>
        <span class="wh">{{ l.where }}</span>
      </button>
    </div>

    <div class="feed">
      <div class="tiny muted feed-t">{{ t('funFeed') }}</div>
      <div v-if="!feed.length" class="tiny muted">{{ t('funNone') }}</div>
      <div v-for="r in feed" :key="r.id" class="line">
        <img v-if="r.a!.art?.sprite" class="em" :src="r.a!.art.sprite" :alt="r.a!.emoji"><span v-else class="em emo">{{ r.a!.emoji }}</span>
        <span v-if="r.action === 'burn'" class="txt"><b>{{ t('funBurnLine', { name: r.toLabel }) }}</b><small>{{ ago(r.at) }}</small></span>
        <span v-else class="txt"><b>{{ r.fromLabel }}</b> → <b>{{ r.toLabel }}</b>
          <small>{{ text(r.a!) }}<template v-if="r.anon"> · 🕶️ {{ r.outcome === 'guessed' ? t('funFound') : r.outcome === 'escaped' ? t('funEscaped') : t('funMystery') }}</template> · {{ ago(r.at) }}</small></span>
        <button v-if="r.canGuess && !data.paused" class="back guess" :disabled="busy" @click="openGuess(r)">🕵️ {{ t('funGuess', { n: r.guessesLeft }) }}</button>
        <button v-else-if="r.canReturn && !data.paused && data.me.pref !== 'off'" class="back" :disabled="busy" @click="backTo(r)">↩️ {{ t('funBack') }}</button>
      </div>
    </div>

    <Teleport to="body">
      <!-- the glass, splattered: swipe fast to clean it; nothing beneath can be tapped till then -->
      <div v-if="splats.length" ref="glass" class="glass" role="dialog" aria-modal="true" :aria-label="t('funWipeAria')" tabindex="0"
           @pointerdown.prevent="swipeStart" @pointerup="swipeEnd" @pointercancel="swipe = null" @click.stop.prevent @keydown="glassKey">
        <img v-for="s in splats" :key="s.key" :src="s.src" alt="" class="gsplat" :class="s.gone ? 'gone-' + s.gone : ''"
             :style="{ '--x': s.x + 'vw', '--y': s.y + 'vh', '--r': s.r + 'deg', '--s': s.s }" draggable="false">
        <div :key="smear" class="ghint" :class="{ again: smear }">👆💨 {{ t('funWipe') }}<small v-if="splatsLeft > 1"> · {{ splatsLeft }}</small></div>
      </div>
      <div v-if="screenSplat" :key="screenSplat.key" class="screen-splat" :class="[screenSplat.kind, { wiping: screenSplat.wiping }]" @click="wipe">
        <img v-if="screenSplat.kind === 'splat'" :src="screenSplat.src" alt="" class="splat">
        <template v-else>
          <img v-if="screenSplat.kind === 'pow' || FUN_KIND_SCREEN" :src="screenSplat.kind === 'pow' ? FUN_IMPACT : FUN_KIND_SCREEN!" alt="" class="fx-back">
          <img v-if="screenSplat.src.startsWith('/')" :src="screenSplat.src" alt="" class="fx-front">
          <span v-else class="fx-front emo">{{ screenSplat.src }}</span>
        </template>
      </div>
      <div v-if="target" class="sheet-backdrop" @click.self="target = null">
        <div class="sheet fun-sheet">
          <div class="t-head">
            <Avatar :name="`${target.firstName} ${target.lastName}`" :photo="target.photo" :avatar="target.avatar" :size="46" no-zoom />
            <div style="min-width:0">
              <b>{{ target.firstName }} {{ target.lastName }}</b>
              <span class="tiny muted">{{ target.where }}</span>
            </div>
            <div v-if="!isPotato && score(target.id).me + score(target.id).them" class="score">
              <small>{{ t('funWeek') }}</small>
              <b>{{ score(target.id).me }} – {{ score(target.id).them }}</b>
            </div>
          </div>
          <div v-if="data.paused" class="note">{{ t('funPaused') }}</div>
          <div v-else-if="data.me.pref === 'off'" class="note">{{ t('funPrefOff') }} · {{ t('funMine') }} ›</div>
          <div v-else-if="target.pref === 'off'" class="note">{{ target.firstName }}: {{ t('funOut') }}</div>
          <template v-else>
            <template v-if="isPotato">
            <button v-if="canPotato(target)" class="potato-btn" :disabled="busy" @click="throwPotato(target)">
              🥔 {{ holdIt ? t('funPotatoPass', { name: shortName(target) }) : t('funPotatoStartAt', { name: shortName(target) }) }}
            </button>
            <div v-else-if="hadIt(target)" class="note soft">🥔 {{ t('funPotatoHadIt', { name: shortName(target) }) }}</div>
            <div v-else class="note soft">🥔 {{ target.excluded ? t('gamesExcludedThem', { name: target.firstName }) : target.pref !== 'all' ? t('potatoTheyOut', { name: target.firstName })
              : potato.active && !holdIt ? t('potatoNotYours', { name: potato.active.holderName }) : t('potatoNeedsAll') }}</div>
            </template>
            <template v-else>
            <div v-if="target.pref === 'kind'" class="note soft">{{ t('funKindOnly') }}</div>
            <label v-if="data.me.anonLeft && target.pref === 'all'" class="anon" :class="{ on: anon }">
              <input v-model="anon" type="checkbox">
              <span>🕶️ <b>{{ t('funAnon') }}</b><small>{{ t('funAnonSub') }}</small></span>
            </label>
            <div v-for="g in groupsFor(target)" :key="g.motion" class="grp">
              <div class="tiny muted">{{ t(g.label) }}</div>
              <div class="acts">
                <button v-for="a in g.actions" :key="a.key" class="act" :class="[g.motion, { none: !have(a) }]" :disabled="!left || busy || !have(a) || (anon && a.motion !== 'throw')" @click="act(target, a)">
                  <i v-if="isThrowable(a.key)" class="cnt">{{ bag[a.key] || 0 }}</i>
                  <img v-if="a.art?.sprite" class="e" :src="a.art.sprite" :alt="a.emoji"><span v-else class="e emo">{{ a.emoji }}</span><span class="l">{{ text(a) }}</span>
                </button>
              </div>
            </div>
            <div class="tiny muted" style="text-align:center">{{ ammoText }}</div>
            </template>
          </template>
          <button v-if="data.canExclude" class="btn ghost exclude" :disabled="busy" @click="toggleExcluded(target)">
            {{ target.excluded ? '✅ ' + t('gamesIncludeBtn') : '🚫 ' + t('gamesExcludeBtn') }}
          </button>
          <button v-if="data.canExclude" class="btn ghost exclude" :disabled="busy" @click="toggleMuted(target)">
            {{ target.muted ? '🔔 ' + t('gameNotifsUnmuteBtn') : '🔇 ' + t('gameNotifsMuteBtn') }}
          </button>
        </div>
      </div>

      <div v-if="dailyOpen && dailyTop.length" class="sheet-backdrop" @click.self="closeDaily">
        <div class="sheet fun-sheet dsheet">
          <div class="dbig">🎯</div>
          <h3>{{ t('funDailyTitle') }}</h3>
          <div class="dwho">
            <div v-for="l in dailyTop" :key="l.id" class="dperson">
              <Avatar :name="`${l.firstName} ${l.lastName}`" :photo="l.photo" :avatar="l.figure || l.avatar" :size="dailyTop.length > 1 ? 72 : 110" no-zoom />
              <b>{{ l.me ? t('funYouCap') : shortName(l) }}</b>
            </div>
          </div>
          <div class="dcount"><span>{{ data.daily.count }}</span>{{ data.daily.count === 1 ? t('funDailyThing') : t('funDailyThings') }} 🍅</div>
          <div class="tiny muted" style="text-align:center">{{ dailyTop.length > 1 ? t('funDailySubMany') : dailyTop[0]?.me ? t('funDailySubMe') : t('funDailySub') }}</div>
          <button class="btn" @click="closeDaily">OK</button>
        </div>
      </div>

      <div v-if="guessing" class="sheet-backdrop" @click.self="guessing = null">
        <div class="sheet fun-sheet">
          <h3 style="margin:0;font-size:17px;text-align:center">🕵️ {{ t('funWhoDidIt') }}</h3>
          <div class="tiny muted" style="text-align:center">{{ t('funWhoDidItSub', { n: guessing.guessesLeft }) }}</div>
          <div class="suspects">
            <button v-for="l in data.leaders.filter((x: any) => !x.me)" :key="l.id" class="suspect" :disabled="busy || tried.includes(l.id)" @click="guess(l)">
              <Avatar :name="`${l.firstName} ${l.lastName}`" :photo="l.photo" :avatar="l.figure || l.avatar" :size="52" no-zoom />
              <span>{{ tried.includes(l.id) ? '❌' : shortName(l) }}</span>
            </button>
          </div>
          <button class="btn ghost" @click="guessing = null">{{ t('close') }}</button>
        </div>
      </div>

      <!-- how the hot potato is played -->
      <PotatoRules v-if="rulesOpen" @close="rulesOpen = false" />
      <!-- how the backpack fills -->
      <div v-if="bagHelp" class="sheet-backdrop" @click.self="bagHelp = false">
        <div class="sheet fun-sheet">
          <h3 style="margin:0;font-size:17px;text-align:center">🎒 {{ t('bagTitle') }}</h3>
          <div class="bagall">
            <span v-for="k in THROWABLES" :key="k" class="bi" :class="[ITEM_TIER[k], { zero: !bag[k] }]">
              <img v-if="funAction(k)?.art?.sprite" :src="funAction(k)!.art!.sprite" alt=""><b>{{ bag[k] || 0 }}</b><small>{{ t('tier_' + ITEM_TIER[k]) }}</small>
            </span>
          </div>
          <ul class="rules"><li v-for="n in 6" :key="n">{{ t('bagHow' + n) }}</li></ul>
          <button class="btn ghost" @click="bagHelp = false">{{ t('close') }}</button>
        </div>
      </div>
      <!-- the challenges a round may draw, for anyone to read -->
      <div v-if="challengeList" class="sheet-backdrop" @click.self="challengeList = null">
        <div class="sheet fun-sheet">
          <h3 style="margin:0;font-size:17px;text-align:center">🎯 {{ t('funPotatoChallenges') }}</h3>
          <div class="tiny muted" style="text-align:center">{{ t('funPotatoChallengesRead') }}</div>
          <ol class="rules"><li v-for="c in challengeList" :key="c">{{ c }}</li></ol>
          <button class="btn ghost" @click="challengeList = null">{{ t('close') }}</button>
        </div>
      </div>
      <!-- the Αρχηγός's list of challenges, one a line -->
      <div v-if="challenges !== null" class="sheet-backdrop" @click.self="challenges = null">
        <div class="sheet fun-sheet">
          <h3 style="margin:0;font-size:17px;text-align:center">🥔 {{ t('funPotatoChallenges') }}</h3>
          <div class="tiny muted" style="text-align:center">{{ t('funPotatoChallengesNote') }}</div>
          <div class="chlist">
            <div v-for="(c, i) in challenges" :key="i" class="chrow">
              <span class="chn">{{ i + 1 }}</span>
              <input v-model="challenges[i]" class="in" maxlength="200" :placeholder="t('funPotatoChallengePh')">
              <button class="chdel" :aria-label="t('delete')" @click="removeChallenge(i)">🗑</button>
            </div>
            <div v-if="!challenges.length" class="tiny muted" style="text-align:center">{{ t('funPotatoChallengesEmpty') }}</div>
          </div>
          <button class="btn ghost" @click="addChallenge">＋ {{ t('funPotatoChallengeAdd') }}</button>
          <button class="btn" @click="saveChallenges">{{ t('save') }}</button>
          <button class="btn ghost" @click="challenges = null">{{ t('close') }}</button>
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
          <button v-if="potato.canStop" class="btn ghost" @click="mine = false; openChallenges()">🥔 {{ t('funPotatoChallenges') }}</button>
          <button class="btn ghost" @click="mine = false">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.fun{margin:4px 0 14px}
.exclude{font-size:13px; padding:10px}
.outmark{position:absolute; right:-2px; top:-2px; font-size:16px; z-index:4}
.daily{display:flex; align-items:center; gap:10px; width:100%; border:0; text-align:left; margin-bottom:10px;
  background:linear-gradient(135deg,#FFF1C9,#FFD9C2); border-radius:18px; padding:10px 12px; box-shadow:0 2px 10px rgba(180,90,30,.15)}
.dfaces{display:flex; flex:none}
.dfaces > *:not(:first-child){margin-left:-12px}
.dtxt{flex:1; min-width:0; display:flex; flex-direction:column; line-height:1.25}
.dtxt b{font-size:14px; color:#7A3A10}
.dtxt span{font-size:12.5px; color:#8A5530}
.dsheet{align-items:center; text-align:center}
.dsheet h3{margin:0; font-size:19px}
.dbig{font-size:46px; line-height:1; animation:dpop .7s cubic-bezier(.2,1.6,.4,1)}
@keyframes dpop{from{transform:scale(.2) rotate(-25deg)}}
.dwho{display:flex; flex-wrap:wrap; justify-content:center; gap:14px}
.dperson{display:flex; flex-direction:column; align-items:center; gap:6px}
.dperson b{font-size:15px}
.dcount{font-size:15px; font-weight:700; color:#7A3A10; display:flex; align-items:baseline; gap:6px}
.dcount span{font-size:40px; font-weight:900; color:#D2491D}
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
.viewtog{position:absolute; top:6px; left:8px; z-index:2; border:0; border-radius:999px; background:rgba(255,255,255,.85); font-size:11px; font-weight:700; padding:4px 9px; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,.08)}
.stage{padding-top:34px}
/* faces: a round one each, more to a row */
.stage.faces{grid-template-columns:repeat(auto-fill, minmax(62px, 1fr)); gap:12px 2px}
.stage.faces .fig{aspect-ratio:1; width:86%; max-width:58px; transform-origin:50% 50%}
.stage.faces .fig::after{display:none}
.stage.faces .body{border-radius:50%; overflow:hidden; box-shadow:0 2px 6px rgba(30,60,30,.18), 0 0 0 2px #fff}
.stage.faces .body.photo{object-fit:cover}
.stage.faces .who.me .body{box-shadow:0 2px 6px rgba(30,60,30,.18), 0 0 0 3px var(--green, #2E7D5B)}
.stage.faces .held{right:-6px; top:auto; bottom:-4px}
.stage.faces .had{right:-2px; bottom:-2px}
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
.stain.pic{border-radius:0; opacity:.95; height:auto; filter:drop-shadow(0 1px 1px rgba(0,0,0,.2))}
.gifts{position:absolute; left:50%; bottom:-6px; transform:translateX(-50%); display:flex; gap:1px; white-space:nowrap; pointer-events:none}
.gifts img{width:15px; height:15px; object-fit:contain}
.gifts span{font-size:12px; line-height:15px}
/* the first name, and under it the surname's initial — never cut in two */
.nm{font-size:12px; font-weight:700; margin-top:6px; color:var(--ink, #1d2b44); max-width:100%; text-align:center; line-height:1.15; display:flex; flex-direction:column; align-items:center}
.nm .fn{max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.nm .ln{font-size:11px; color:var(--muted)}
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
.stage :deep(.sprite.pic){width:34px; height:34px; margin:-17px 0 0 -17px; object-fit:contain}
.stage :deep(.sprite.pic.big){width:44px; height:44px; margin:-22px 0 0 -22px}
.stage :deep(.poppic){position:absolute; left:0; top:0; width:60px; margin:-30px 0 0 -30px; pointer-events:none; z-index:6}
.stage :deep(.splatpic){position:absolute; left:0; top:0; width:64px; margin:-32px 0 0 -32px; pointer-events:none; z-index:6; filter:drop-shadow(0 2px 2px rgba(0,0,0,.2))}
.stage :deep(.spark){position:absolute; left:0; top:0; margin:-9px 0 0 -9px; font-size:16px; pointer-events:none; z-index:5}
.stage :deep(.drop){position:absolute; left:0; top:0; margin:-5px 0 0 -5px; width:10px; height:10px; border-radius:50%; pointer-events:none; z-index:5}

.feed{margin-top:10px; background:#fff; border-radius:18px; padding:10px 12px; box-shadow:0 1px 6px rgba(20,40,70,.06)}
.feed-t{font-weight:700; margin-bottom:4px}
.line{display:flex; align-items:center; gap:8px; padding:6px 0; border-top:1px solid rgba(20,40,70,.06); font-size:13px}
.line:first-of-type{border-top:0}
.line .em{width:24px; height:24px; object-fit:contain; flex:none}
.line .em.emo{font-size:18px; line-height:24px; text-align:center}
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
.act .e{width:34px; height:34px; object-fit:contain}
.act .e.emo{font-size:27px; line-height:34px; text-align:center}
.act .l{font-size:10.5px; font-weight:600; line-height:1.15; text-align:center; color:var(--ink, #1d2b44)}
.act.kind{background:#FFF7E6}
.prefs{display:flex; flex-direction:column; gap:8px}
.pref{border:0; background:#fff; border-radius:14px; padding:12px; font-weight:700; font-size:14px; box-shadow:0 1px 4px rgba(20,40,70,.08)}
.pref.on{background:var(--green, #2E7D5B); color:#fff}
.pause{display:flex; align-items:center; justify-content:space-between; background:#fff; border-radius:14px; padding:12px; font-weight:700}
.pause input{width:22px; height:22px}

/* the splattered glass: catches every touch until it is clean */
.glass{position:fixed; inset:0; z-index:1000; overflow:hidden; touch-action:none; user-select:none; -webkit-user-select:none; cursor:grab; outline:none;
  animation:splat-shake .35s ease}
.gsplat{position:absolute; left:50%; top:45%; width:min(118vw, 760px); max-width:none; pointer-events:none; filter:drop-shadow(0 6px 10px rgba(0,0,0,.18));
  transform:translate(-50%, -50%) translate(var(--x), var(--y)) rotate(var(--r)) scale(var(--s));
  animation:gs-hit .22s cubic-bezier(.2,1.6,.4,1), gs-drip 7s .3s ease-in forwards}
@keyframes gs-hit{from{transform:translate(-50%, -50%) translate(var(--x), var(--y)) rotate(var(--r)) scale(.15); opacity:.6}}
@keyframes gs-drip{to{transform:translate(-50%, -50%) translate(var(--x), calc(var(--y) + 4vh)) rotate(var(--r)) scale(var(--s)) scaleY(1.05)}}
.gsplat.gone-l{animation:gs-out-l .4s ease-in forwards}
.gsplat.gone-r{animation:gs-out-r .4s ease-in forwards}
.gsplat.gone-u{animation:gs-out-u .4s ease-in forwards}
.gsplat.gone-d{animation:gs-out-d .4s ease-in forwards}
@keyframes gs-out-l{to{transform:translate(-50%, -50%) translate(calc(var(--x) - 140vw), var(--y)) rotate(calc(var(--r) - 25deg)); opacity:0}}
@keyframes gs-out-r{to{transform:translate(-50%, -50%) translate(calc(var(--x) + 140vw), var(--y)) rotate(calc(var(--r) + 25deg)); opacity:0}}
@keyframes gs-out-u{to{transform:translate(-50%, -50%) translate(var(--x), calc(var(--y) - 140vh)) rotate(var(--r)); opacity:0}}
@keyframes gs-out-d{to{transform:translate(-50%, -50%) translate(var(--x), calc(var(--y) + 140vh)) rotate(var(--r)); opacity:0}}
.ghint{position:absolute; left:50%; bottom:calc(env(safe-area-inset-bottom, 0px) + 28px); transform:translateX(-50%); background:rgba(29,43,68,.92); color:#fff;
  border-radius:999px; padding:11px 18px; font-weight:800; font-size:15px; white-space:nowrap; pointer-events:none; box-shadow:0 8px 24px rgba(0,0,0,.3)}
.ghint small{font-weight:700; opacity:.8}
.ghint.again{animation:gh-wiggle .4s ease}
@keyframes gh-wiggle{25%{transform:translateX(calc(-50% - 8px))} 50%{transform:translateX(calc(-50% + 8px))} 75%{transform:translateX(calc(-50% - 4px))}}
@media (prefers-reduced-motion: reduce){ .glass, .gsplat, .ghint.again{animation:none} .gsplat[class*="gone-"]{opacity:0} }

/* what lands on you, across the whole screen; a tap wipes it off */
.screen-splat{position:fixed; inset:0; z-index:90; display:grid; place-items:center; cursor:pointer; overflow:hidden;
  animation:splat-shake .35s ease}
.screen-splat > *{grid-area:1/1}
.screen-splat .splat{width:min(118vw, 760px); max-height:120vh; object-fit:contain; transform-origin:50% 40%;
  animation:splat-hit .22s cubic-bezier(.2,1.6,.4,1), splat-slide 4.2s .25s ease-in forwards; filter:drop-shadow(0 6px 10px rgba(0,0,0,.18))}
.screen-splat.pow .fx-back{width:min(92vw, 520px); animation:pow-in .5s cubic-bezier(.2,1.6,.4,1), fade-late 1.5s forwards}
.screen-splat.pow .fx-front{width:min(46vw, 260px); animation:pow-front .6s cubic-bezier(.2,1.6,.4,1), fade-late 1.5s forwards}
.screen-splat.kind{background:radial-gradient(circle at 50% 45%, rgba(255,236,170,.45), transparent 65%); animation:none}
.screen-splat.kind .fx-back{width:min(130vw, 820px); max-height:130vh; object-fit:contain; animation:kind-rain 2.6s ease-out forwards}
.screen-splat .fx-front.emo{font-size:min(36vw, 200px); line-height:1}
.screen-splat.kind .fx-front{width:min(44vw, 240px); animation:kind-front 2.6s cubic-bezier(.2,1.4,.4,1) forwards}
.screen-splat.wiping{pointer-events:none}
.screen-splat.wiping > *{animation:splat-wipe .45s ease-in forwards !important}
@keyframes splat-hit{from{transform:scale(.15) rotate(-12deg); opacity:.6}}
@keyframes splat-slide{0%{transform:none; opacity:1} 78%{transform:translateY(6vh) scaleY(1.05); opacity:1} 100%{transform:translateY(10vh) scaleY(1.07); opacity:0}}
@keyframes splat-wipe{to{transform:translateX(-120vw) rotate(-8deg); opacity:0}}
@keyframes splat-shake{20%{transform:translate(-6px, 4px)} 45%{transform:translate(5px, -3px)} 70%{transform:translate(-3px, 2px)}}
@keyframes pow-in{from{transform:scale(.1) rotate(-30deg)}}
@keyframes pow-front{from{transform:scale(2.4) translateX(40vw)} to{transform:none}}
@keyframes fade-late{0%, 70%{opacity:1} 100%{opacity:0}}
@keyframes kind-rain{from{transform:translateY(-12vh) scale(.95); opacity:0} 15%{opacity:1} 80%{opacity:1} to{transform:translateY(8vh) scale(1.05); opacity:0}}
@keyframes kind-front{0%{transform:scale(.2); opacity:0} 20%{transform:scale(1.15); opacity:1} 35%{transform:scale(1)} 80%{transform:translateY(-2vh); opacity:1} 100%{transform:translateY(-8vh) scale(.9); opacity:0}}

/* the backpack */
.bagbar{display:flex; align-items:center; gap:8px; width:100%; border:0; background:#fff; border-radius:14px; padding:7px 10px; margin-bottom:8px; box-shadow:0 1px 6px rgba(20,40,70,.06); cursor:pointer; text-align:left}
.bagic{font-size:20px; flex:none}
.bagitems{flex:1; min-width:0; display:flex; flex-wrap:wrap; gap:4px 8px; align-items:center}
.bi{display:inline-flex; align-items:center; gap:2px; font-size:12px}
.bi img{width:22px; height:22px; object-fit:contain}
.bi.rare b{color:#B26A00}
.bagn{flex:none; font-size:11px; color:var(--muted); font-weight:700}
.bagall{display:grid; grid-template-columns:repeat(4, 1fr); gap:8px}
.bagall .bi{flex-direction:column; background:#fff; border-radius:14px; padding:8px 4px; gap:2px}
.bagall .bi img{width:36px; height:36px}
.bagall .bi small{font-size:9.5px; color:var(--muted)}
.bagall .bi.rare{box-shadow:inset 0 0 0 2px #E8BB3E}
.bagall .bi.zero{opacity:.45}
.act{position:relative}
.act .cnt{position:absolute; top:4px; right:6px; font-style:normal; font-size:10.5px; font-weight:800; background:#2A2330; color:#fff; border-radius:999px; min-width:17px; padding:1px 4px; text-align:center}
.act.none .cnt{background:#C9CED6}
.pouch{display:block; margin-top:3px; font-weight:700; color:#7A2E0E}
/* the hot potato */
.potato .prow{display:flex; align-items:center; gap:10px}
.potato.burst{background:linear-gradient(135deg,#FFE0D6,#FFD2C2)}
.pinfo{flex:none; border:0; background:none; font-size:18px; padding:2px; cursor:pointer}
.pstake{font-size:12.5px; background:rgba(255,255,255,.65); border-radius:10px; padding:6px 9px; line-height:1.4}
.pbtns{display:flex; flex-wrap:wrap; gap:6px}
.chlist{display:flex; flex-direction:column; gap:8px}
.chrow{display:flex; align-items:center; gap:8px}
.chrow .in{flex:1; min-width:0}
.chn{flex:none; width:22px; text-align:center; font-weight:800; color:var(--muted); font-size:13px}
.chdel{flex:none; border:0; background:#fff; border-radius:10px; width:36px; height:36px; font-size:15px; cursor:pointer; box-shadow:0 1px 4px rgba(20,40,70,.08)}
.rules{margin:0; padding-left:20px; display:flex; flex-direction:column; gap:7px; font-size:13.5px; line-height:1.5}
.had{position:absolute; right:6%; bottom:4%; font-size:11px; opacity:.55; filter:grayscale(.4); pointer-events:none}
.potato{display:flex; align-items:center; gap:10px; background:#fff; border-radius:16px; padding:9px 12px; margin-bottom:8px; box-shadow:0 1px 6px rgba(20,40,70,.06)}
.potato.mine{background:linear-gradient(135deg,#FFE3B8,#FFC3A0); animation:hot 1.1s ease-in-out infinite}
.potato .spud{font-size:26px; flex:none}
.potato.mine .spud{animation:jiggle .5s ease-in-out infinite}
.ptxt{flex:1; min-width:0}
.ptxt b{display:block; font-size:13.5px}
.ptxt span{display:block; font-size:11.5px; color:var(--muted)}
.potato{flex-direction:column; align-items:stretch; gap:8px}
@keyframes hot{50%{box-shadow:0 0 0 4px rgba(255,120,60,.25)}}
@keyframes jiggle{25%{transform:rotate(-12deg)} 75%{transform:rotate(12deg)}}
.held{position:absolute; right:2%; top:56%; font-size:20px; pointer-events:none; animation:jiggle .6s ease-in-out infinite}
.held i{position:absolute; left:4px; top:-14px; font-size:11px; font-style:normal; opacity:.8; animation:steam 1.4s ease-out infinite}
@keyframes steam{from{transform:translateY(4px); opacity:.9} to{transform:translateY(-8px); opacity:0}}
.potato-btn{border:0; border-radius:16px; padding:12px; font-weight:800; font-size:14.5px; color:#7A2E0E; background:linear-gradient(135deg,#FFE3B8,#FFB48A)}
.potato-btn:active{transform:scale(.97)}
/* who did it? */
.anon{display:flex; align-items:center; gap:10px; background:#fff; border-radius:14px; padding:10px 12px; cursor:pointer}
.anon.on{background:#2A2330; color:#fff}
.anon input{width:20px; height:20px; flex:none}
.anon b{font-size:13.5px}
.anon small{display:block; font-size:11px; opacity:.75}
.back.guess{background:#2A2330; color:#fff}
.suspects{display:grid; grid-template-columns:repeat(auto-fill, minmax(70px, 1fr)); gap:10px}
.suspect{border:0; background:#fff; border-radius:16px; padding:8px 4px; display:flex; flex-direction:column; align-items:center; gap:5px; font-size:12px; font-weight:700}
.suspect:disabled{opacity:.45}
</style>
