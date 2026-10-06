<script setup lang="ts">
import { vocative } from '~/utils/season'
/* One of the smaller wins, played when the app opens: points from a leader,
   a photo mission approved, 👏 from the Ενωμοτία, a place gained on the
   league table, the Ενωμοτία going top, a birthday. A card on a dark veil
   with rays turning behind it, the member's own avatar where it is about
   them, the number counting up, confetti for the big ones, and a sound. */
const props = defineProps<{ m: any }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { t, locale } = useI18n()
const me = useMe()

const ord = (n: number) => locale.value === 'el' ? `${n}η` : `${n}${['th', 'st', 'nd', 'rd'][n % 10 < 4 && (n % 100 < 11 || n % 100 > 13) ? n % 10 : 0]}`
const names = (list: string[]) => list.length <= 2 ? list.join(locale.value === 'el' ? ' και ' : ' and ')
  : `${list.slice(0, 2).join(', ')} ${t('momentAndMore', { n: list.length - 2 })}`

const big = computed(() => ['rank', 'patrolTop', 'birthday'].includes(props.m.type))
const points = computed(() => props.m.type === 'points' || props.m.type === 'mission' ? props.m.points : 0)
/* the number rolls up from nothing */
const shown = ref(0)
onMounted(() => {
  sfx(({ rank: 'rankUp', patrolTop: 'fanfare', birthday: 'fanfare', kudos: 'pop', mission: 'unlock', points: 'unlock' } as any)[props.m.type] || 'unlock')
  if (!points.value) return
  const start = performance.now()
  const step = (now: number) => {
    const k = Math.min(1, (now - start) / 900)
    shown.value = Math.round(points.value * (1 - Math.pow(1 - k, 3)))
    if (k < 1) requestAnimationFrame(step)
  }
  setTimeout(() => requestAnimationFrame(step), 350)
})
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 3.7 + (i % 5) * 7) % 100, delay: (i % 7) * 120, dur: 2200 + (i % 5) * 300,
  tone: ['#F5D547', '#2E7D5B', '#E7643C', '#4E8FD6', '#E35D9A', '#FFFFFF'][i % 6], rot: (i % 2 ? 1 : -1) * (200 + i * 17)
}))
</script>

<template>
  <Teleport to="body">
    <div class="veil" role="dialog" aria-live="polite" @click.self="emit('close')">
      <div v-if="big" class="confetti" aria-hidden="true">
        <i v-for="(c, i) in CONFETTI" :key="i" :style="{ left: c.left + '%', background: c.tone, animationDelay: c.delay + 'ms', animationDuration: c.dur + 'ms', '--r': c.rot + 'deg' }" />
      </div>
      <div class="card" :class="m.type">
        <div class="rays" aria-hidden="true" />

        <!-- what it is about -->
        <div class="stagebox">
          <template v-if="m.type === 'rank'">
            <div class="podium" aria-hidden="true"><i class="s2" /><i class="s1" /><i class="s3" /></div>
            <div class="jumper"><Avatar :name="me?.firstName || ''" :avatar="me?.avatar || {}" :size="92" /></div>
          </template>
          <div v-else-if="m.type === 'birthday'" class="jumper bday">
            <Avatar :name="me?.firstName || ''" :avatar="me?.avatar || {}" :size="112" party />
          </div>
          <div v-else-if="m.type === 'patrolTop'" class="emblem">{{ m.emblem }}<span class="crown">👑</span></div>
          <div v-else-if="m.type === 'kudos'" class="emblem claps"><span v-for="i in Math.min(m.count, 5)" :key="i" :style="{ animationDelay: i * 90 + 'ms' }">👏</span></div>
          <div v-else class="emblem">{{ m.type === 'mission' ? m.emoji : '⭐' }}</div>
        </div>

        <template v-if="m.type === 'rank'">
          <div class="kicker">{{ m.to <= 3 ? t('momentPodium') : t('momentUp') }}</div>
          <b class="title">{{ t('momentRank', { place: ord(m.to) }) }}</b>
          <div class="sub">{{ t('momentRankFrom', { from: ord(m.from), to: ord(m.to) }) }}</div>
        </template>
        <template v-else-if="m.type === 'patrolTop'">
          <div class="kicker">🏆 {{ t('momentPatrolKicker') }}</div>
          <b class="title">{{ t('momentPatrolTop', { name: m.name }) }}</b>
          <div class="sub">{{ t('momentPatrolSub') }}</div>
        </template>
        <template v-else-if="m.type === 'birthday'">
          <div class="kicker">🎂 {{ t('momentBdayKicker') }}</div>
          <b class="title">{{ t('momentBday', { name: locale === 'el' ? vocative(m.firstName) : m.firstName }) }}</b>
          <div class="sub">{{ t('momentBdaySub') }}</div>
        </template>
        <template v-else-if="m.type === 'kudos'">
          <div class="kicker">{{ t('momentKudosKicker') }}</div>
          <b class="title">{{ t('momentKudos', { n: m.count }) }}</b>
          <div class="sub">{{ t('momentKudosFrom', { names: names(m.names) }) }}</div>
        </template>
        <template v-else>
          <div class="kicker">{{ m.type === 'mission' ? t('momentMission') : t('momentPoints') }}</div>
          <b class="pts">+{{ shown }} <small>{{ t('pts') }}</small></b>
          <div v-if="m.type === 'mission'" class="sub">{{ m.title }}</div>
          <ul v-else class="why"><li v-for="r in m.reasons" :key="r">{{ r }}</li></ul>
        </template>

        <button class="go" @click="emit('close')">{{ t('momentNice') }}</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.veil{position:fixed; inset:0; z-index:95; background:rgba(10,20,40,.6); display:grid; place-items:center; padding:20px; animation:fade .25s both; overflow:hidden}
.card{position:relative; overflow:hidden; width:min(340px, 100%); border-radius:28px; padding:24px 20px 18px; text-align:center; color:#fff;
  background:linear-gradient(180deg,#2E5E8C 0%,#1A2849 100%); box-shadow:0 24px 60px rgba(0,0,0,.35);
  display:flex; flex-direction:column; align-items:center; gap:6px; animation:pop .55s cubic-bezier(.2,.9,.3,1.3) both}
.card.birthday{background:linear-gradient(180deg,#E35D9A 0%,#7B3FA0 100%)}
.card.patrolTop{background:linear-gradient(180deg,#2E7D5B 0%,#163B2C 100%)}
.card.kudos{background:linear-gradient(180deg,#E08A2E 0%,#8E3B16 100%)}
.rays{position:absolute; left:50%; top:30%; width:560px; height:560px; margin:-280px 0 0 -280px; border-radius:50%;
  background:repeating-conic-gradient(from 0deg, rgba(255,255,255,.12) 0 10deg, transparent 10deg 20deg); animation:spin 16s linear infinite}
.stagebox{position:relative; height:150px; width:100%; display:grid; place-items:center}
.emblem{position:relative; font-size:84px; line-height:1; animation:bounce 1.1s cubic-bezier(.3,1.6,.5,1) both}
.emblem .crown{position:absolute; top:-30px; left:50%; transform:translateX(-50%); font-size:40px; animation:drop .6s .5s cubic-bezier(.3,1.6,.5,1) both}
.claps{display:flex; gap:2px; font-size:46px}
.claps span{animation:clap .6s cubic-bezier(.3,1.6,.5,1) both}
.podium{position:absolute; bottom:0; left:50%; transform:translateX(-50%); display:flex; align-items:flex-end; gap:4px}
.podium i{display:block; width:64px; border-radius:10px 10px 0 0; background:linear-gradient(180deg,rgba(255,255,255,.35),rgba(255,255,255,.12))}
.podium .s1{height:46px; background:linear-gradient(180deg,#FFE27A,#F2C230)}
.podium .s2{height:30px}
.podium .s3{height:20px}
.jumper{position:absolute; bottom:40px; left:50%; transform:translateX(-50%); animation:jump 1s .2s cubic-bezier(.3,1.5,.5,1) both}
.jumper :deep(.avatar){box-shadow:0 0 0 4px #FFD84A, 0 10px 24px rgba(0,0,0,.35)}
.jumper.bday{bottom:12px}
.kicker{position:relative; font-size:12px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#FFD84A}
.title{position:relative; font-size:22px; line-height:1.2}
.sub{position:relative; font-size:13.5px; opacity:.9; line-height:1.4}
.pts{position:relative; font-size:46px; line-height:1; color:#FFD84A; font-variant-numeric:tabular-nums}
.pts small{font-size:18px; color:#fff}
.why{position:relative; list-style:none; margin:4px 0 0; padding:0; font-size:13px; opacity:.9; display:flex; flex-direction:column; gap:2px}
.go{position:relative; margin-top:12px; width:100%; border:0; border-radius:16px; padding:14px; font:inherit; font-weight:800; font-size:16px; color:#3A2A00;
  background:linear-gradient(180deg,#FFE27A,#F2C230); box-shadow:0 4px 0 #C99A18; cursor:pointer}
.go:active{transform:translateY(2px); box-shadow:0 2px 0 #C99A18}
.confetti{position:absolute; inset:0; pointer-events:none}
.confetti i{position:absolute; top:-20px; width:9px; height:14px; border-radius:2px; animation:fall linear infinite}
@keyframes fade{from{opacity:0}}
@keyframes pop{from{opacity:0; transform:scale(.7)}}
@keyframes spin{to{rotate:360deg}}
@keyframes bounce{0%{opacity:0; transform:scale(.3)}60%{opacity:1; transform:scale(1.15)}100%{transform:scale(1)}}
@keyframes drop{from{opacity:0; transform:translate(-50%,-30px)}}
@keyframes clap{0%{opacity:0; transform:scale(.2) rotate(-30deg)}100%{opacity:1; transform:none}}
@keyframes jump{0%{opacity:0; transform:translate(-50%,60px) scale(.6)}55%{opacity:1; transform:translate(-50%,-26px) scale(1.05)}75%{transform:translate(-50%,4px) scale(.98)}100%{transform:translate(-50%,0)}}
@keyframes fall{to{transform:translateY(110vh) rotate(var(--r))}}
@media (prefers-reduced-motion: reduce){.rays,.confetti{display:none} .card,.emblem,.jumper,.claps span{animation:none}}
</style>
