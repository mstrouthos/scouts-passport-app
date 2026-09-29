<script setup lang="ts">
/* The day's check-in: shown once a day, after a scout's first answer of the
   day, right or wrong — it is showing up that keeps a streak, not scoring.
   The flame catches and flickers, the number rolls up to today's count, the
   week's done days join into one band and today's check pops in on the end
   of it. On the Sunday that completes a full week, the bonus is announced. */
const props = defineProps<{
  streak: number
  week: Array<{ day: string, done: boolean, future: boolean }>
  bonus?: boolean
}>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { t } = useI18n()

const DAYS = ['Δ', 'Τ', 'Τ', 'Π', 'Π', 'Σ', 'Κ']
// today is the last day of the week that is not still to come
const todayIdx = computed(() => {
  let i = -1
  props.week.forEach((d, n) => { if (!d.future) i = n })
  return i
})
const cells = computed(() => props.week.map((d, i) => {
  const today = i === todayIdx.value
  const done = d.done
  return {
    letter: DAYS[i], date: Number(d.day.slice(8, 10)), today, done, future: d.future,
    // done days in a row share one band: open on the side a neighbour continues it
    joinL: done && i > 0 && props.week[i - 1].done,
    joinR: done && i < 6 && props.week[i + 1].done,
    // the band grows left to right, a beat per day, ending on today
    delay: 0.9 + i * 0.07
  }
}))
const from = computed(() => Math.max(0, props.streak - 1))
const rolled = ref(false)
onMounted(() => { setTimeout(() => { rolled.value = true }, 700) })
</script>

<template>
  <Teleport to="body">
    <div class="streak-veil" role="dialog" aria-live="polite" @click.self="emit('close')">
      <div class="streak-card">
        <div class="glow" aria-hidden="true" />
        <div class="flame" aria-hidden="true">
          <svg viewBox="0 0 120 140">
            <defs>
              <linearGradient id="streak-f-out" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#E8891E" /><stop offset=".55" stop-color="#F0B429" /><stop offset="1" stop-color="#FFD65C" />
              </linearGradient>
              <radialGradient id="streak-f-in" cx=".5" cy=".75" r=".6">
                <stop offset="0" stop-color="#FFFBEA" /><stop offset=".7" stop-color="#FFF3C4" /><stop offset="1" stop-color="#FCE08E" />
              </radialGradient>
            </defs>
            <path class="f-out" d="M62 4c-4 16 10 26 14 42 3 12 0 22-4 24 6 2 12-4 14-12 10 12 16 26 14 42-3 22-22 36-44 36S12 122 10 100c-2-16 4-30 12-40 1 8 6 14 12 14-4-14-2-30 8-44 6-8 16-16 20-26Z" fill="url(#streak-f-out)" />
            <path class="f-in" d="M62 58c-2 10 6 16 8 26 2 8 0 13-3 15 4 0 7-3 8-7 5 6 8 13 7 22-1 12-10 20-22 20s-21-8-22-20c-1-12 6-22 12-30 1 5 3 8 6 9-2-10 0-24 6-35Z" fill="url(#streak-f-in)" />
          </svg>
          <i class="spark" /><i class="spark" /><i class="spark" /><i class="spark" />
        </div>

        <div class="num" :aria-label="String(props.streak)">
          <div class="roll" :class="{ on: rolled }"><span>{{ from }}</span><span>{{ props.streak }}</span></div>
        </div>
        <div class="lbl">{{ props.streak === 1 ? t('streakDay') : t('streakDays') }}</div>

        <div class="week">
          <div v-for="(c, i) in cells" :key="i" class="wd">
            <span class="letter" :class="{ now: c.today }">{{ c.letter }}</span>
            <div class="slot">
              <i v-if="c.done" class="band" :class="{ jl: c.joinL, jr: c.joinR }" :style="{ animationDelay: c.delay + 's' }" />
              <b v-if="c.today && c.done" class="today" :style="{ animationDelay: (c.delay + 0.15) + 's' }">✓</b>
              <b v-else-if="c.done" class="tick" :style="{ animationDelay: c.delay + 's' }">✓</b>
              <b v-else class="date" :class="{ missed: !c.future }">{{ c.date }}</b>
            </div>
          </div>
        </div>

        <div class="sub">{{ props.bonus ? '🎁 ' + t('bonusUnlocked') : props.streak === 1 ? t('streakStarted') : t('streakKeep') }}</div>
        <button class="go" @click="emit('close')">{{ t('streakContinue') }}</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.streak-veil{
  position:fixed; inset:0; z-index:140; display:grid; place-items:center; padding:20px;
  background:rgba(10,24,18,.6); -webkit-backdrop-filter:blur(5px); backdrop-filter:blur(5px);
  animation:fade .25s both;
}
.streak-card{
  position:relative; width:min(92vw, 340px); padding:26px 20px 22px; border-radius:34px; overflow:hidden;
  display:flex; flex-direction:column; align-items:center; text-align:center; color:#fff;
  /* the camp green of the landing and the crest, deepening like dusk */
  background:linear-gradient(180deg, #4F8069 0%, var(--logo-green) 40%, #27473A 72%, #1E382D 100%);
  box-shadow:0 30px 80px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.06);
  animation:card .5s cubic-bezier(.2,1.3,.4,1) both;
}
.glow{
  position:absolute; left:50%; top:130px; width:280px; height:220px; margin-left:-140px; border-radius:50%;
  background:radial-gradient(closest-side, rgba(240,180,41,.4), rgba(240,180,41,0));
  animation:glow 1.6s .5s ease-in-out infinite alternate, fade .6s .35s both;
}

/* the flame: catches, then never quite sits still */
.flame{position:relative; width:150px; height:175px; transform-origin:50% 90%; animation:catch .9s .15s cubic-bezier(.3,1.6,.5,1) both}
.flame svg{width:100%; height:100%; overflow:visible}
.f-out{transform-box:fill-box; transform-origin:50% 100%; animation:flick 1.2s 1s ease-in-out infinite alternate}
.f-in{transform-box:fill-box; transform-origin:50% 100%; animation:flick2 .8s 1s ease-in-out infinite alternate}
.spark{position:absolute; left:50%; bottom:30%; width:5px; height:5px; border-radius:50%; background:#FFE9A0; opacity:0;
  animation:spark 1.8s 1.1s ease-out infinite}
.spark:nth-of-type(2){margin-left:-22px; animation-delay:1.5s}
.spark:nth-of-type(3){margin-left:18px; animation-delay:1.9s}
.spark:nth-of-type(4){margin-left:-8px; animation-delay:2.4s}

/* the count rolls up from yesterday's */
.num{position:relative; height:64px; margin-top:2px; overflow:hidden; animation:fade .4s .45s both}
.roll{display:flex; flex-direction:column; transition:transform .7s cubic-bezier(.3,1.6,.5,1)}
.roll.on{transform:translateY(-64px)}
.roll span{height:64px; font-size:60px; font-weight:850; line-height:64px; letter-spacing:-.03em;
  background:linear-gradient(180deg,#FFF3C4,#FFD65C 45%,var(--gold)); -webkit-background-clip:text; background-clip:text; color:transparent}
.lbl{font-size:24px; font-weight:800; color:#FFD65C; letter-spacing:-.02em; margin-top:-2px; animation:up .5s .6s both}

/* the week */
.week{display:flex; justify-content:space-between; width:100%; margin-top:18px; padding:14px 10px; border-radius:18px;
  background:rgba(0,0,0,.2); box-shadow:inset 0 0 0 1px rgba(255,255,255,.06); animation:up .5s .75s both}
.wd{flex:1; display:flex; flex-direction:column; align-items:center; gap:8px}
.letter{font-size:13px; font-weight:600; opacity:.85}
.letter.now{color:#FFD65C; opacity:1}
.slot{position:relative; width:100%; height:34px; display:grid; place-items:center}
.band{position:absolute; left:4px; right:4px; top:4px; bottom:4px; border-radius:13px; background:rgba(240,180,41,.22);
  transform-origin:0 50%; animation:band .25s ease-out both}
.band.jl{left:0; border-top-left-radius:0; border-bottom-left-radius:0}
.band.jr{right:0; border-top-right-radius:0; border-bottom-right-radius:0}
.tick{position:relative; color:#FFD65C; font-size:17px; animation:pop .3s cubic-bezier(.3,1.8,.5,1) both}
.today{position:relative; width:32px; height:32px; border-radius:50%; display:grid; place-items:center; font-size:17px; color:#27473A; font-weight:900;
  background:linear-gradient(180deg,#FFD65C,var(--gold)); box-shadow:0 0 0 3px rgba(240,180,41,.28), 0 0 18px rgba(240,180,41,.65);
  animation:today .55s cubic-bezier(.3,1.9,.5,1) both}
.date{width:30px; height:30px; border-radius:50%; display:grid; place-items:center; font-size:14px; font-weight:600;
  background:rgba(255,255,255,.14); color:rgba(255,255,255,.9)}
.date.missed{background:transparent; box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.18); color:rgba(255,255,255,.45)}

.sub{margin-top:14px; font-size:13px; line-height:1.45; color:rgba(255,255,255,.8); animation:up .5s 1.5s both}
.go{margin-top:16px; width:100%; padding:14px; border-radius:999px; /* the app's reward button, as on an awarded medal */
  font-size:16px; font-weight:800; color:#3E2C03; border:0;
  background:linear-gradient(180deg,#FFD65C,var(--gold)); box-shadow:0 4px 0 #B98217; animation:up .5s 1.7s both; cursor:pointer}
.go:active{transform:scale(.98)}

@keyframes fade{from{opacity:0}}
@keyframes up{from{opacity:0; transform:translateY(12px)}}
@keyframes card{from{opacity:0; transform:scale(.85) translateY(20px)}}
@keyframes catch{0%{transform:scale(0) rotate(-14deg); opacity:0}55%{transform:scale(1.18) rotate(5deg); opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes flick{from{transform:scale(1,1) skewX(0)}to{transform:scale(1.04,.95) skewX(-2.5deg)}}
@keyframes flick2{from{transform:scale(1,1) skewX(0)}to{transform:scale(.92,1.08) skewX(3deg)}}
@keyframes glow{from{opacity:.7; transform:scale(.95)}to{opacity:1; transform:scale(1.06)}}
@keyframes spark{0%{opacity:0; transform:translate(0,0) scale(1)}20%{opacity:1}100%{opacity:0; transform:translate(8px,-70px) scale(.3)}}
@keyframes band{from{transform:scaleX(0)}}
@keyframes pop{from{opacity:0; transform:scale(.3)}}
@keyframes today{0%{opacity:0; transform:scale(.2)}70%{transform:scale(1.25)}100%{opacity:1; transform:scale(1)}}

@media (prefers-reduced-motion: reduce){
  .streak-veil, .streak-card, .glow, .flame, .f-out, .f-in, .num, .lbl, .week, .band, .tick, .today, .sub, .go{animation:none}
  .spark{display:none}
  .roll{transition:none}
}
</style>
