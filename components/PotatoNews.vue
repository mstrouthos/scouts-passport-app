<script lang="ts">
// shared by every page's shell: the news is asked for at most once a minute
let lastLook = 0
</script>

<script setup lang="ts">
/* The hot potato's news, for every Βαθμοφόρος who opens the app: a new round
   has started — and whoever it bursts on will have to do this — or it has
   burst, on whom, and what they must now do. Each shown once on this device;
   a round the Αρχηγός ended is not announced. Whoever has never seen how the
   game is played gets the new round with the instructions (the video) instead
   — once, on any device. */
const { t } = useI18n()
const news = ref<any>(null)
const open = ref(false)
const key = (n: any) => `potato-news:${n.id}:${n.state}`
const route = useRoute()

async function look() {
  if (Date.now() - lastLook < 60_000) return
  lastLook = Date.now()
  try {
    const n = await $fetch<any>('/api/admin/fun/potato-news')
    if (!n || n.state === 'stopped' || !n.challenge) return
    let seen = false
    try { seen = !!localStorage.getItem(key(n)) } catch {}
    if (seen) return
    news.value = n
    open.value = true
    if (n.state === 'burst') funSound('burn', 'burn', n.burnedIsMe)
    else sfx('pop')
  } catch { /* news is never worth an error */ }
}
function close() {
  open.value = false
  try { localStorage.setItem(key(news.value), '1') } catch {}
}
onMounted(() => setTimeout(look, 1200))
// back in the app after a while: perhaps something happened
const onVisible = () => { if (document.visibilityState === 'visible' && !open.value) look() }
onMounted(() => document.addEventListener('visibilitychange', onVisible))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))
</script>

<template>
  <!-- never seen how it is played: the instructions, with what is at stake -->
  <PotatoRules v-if="open && news?.video" :news="news" @close="close" />
  <Teleport v-else to="body">
    <div v-if="open && news" class="sheet-backdrop" @click.self="close">
      <div class="sheet pnews" :class="news.state">
        <div class="big">{{ news.state === 'burst' ? '💥' : '🥔' }}</div>
        <h3>{{ news.state === 'burst' ? t('potatoBurstTitle') : t('potatoNewTitle') }}</h3>
        <p v-if="news.state === 'active'">{{ t('potatoNewBy', { name: news.startedBy || '—' }) }}</p>
        <p v-else-if="news.burnedIsMe">{{ t('potatoBurstOnMe', { n: news.passes }) }}</p>
        <p v-else>{{ t('potatoBurstOn', { name: news.burned || '—', n: news.passes }) }}</p>
        <div class="dare">«{{ news.challenge }}»</div>
        <NuxtLink v-if="route.path !== '/admin/potato'" to="/admin/potato" class="btn" style="text-decoration:none;text-align:center" @click="close">{{ t('potatoGo') }}</NuxtLink>
        <button class="btn ghost" @click="close">OK</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pnews{display:flex; flex-direction:column; gap:10px; text-align:center}
.pnews .big{font-size:56px; line-height:1; animation:bounce .9s cubic-bezier(.2,1.6,.4,1)}
.pnews h3{margin:0; font-size:19px}
.pnews p{margin:0; font-size:14px; color:var(--muted)}
.dare{font-size:18px; font-weight:800; line-height:1.35; padding:14px 12px; border-radius:16px; background:linear-gradient(135deg,#FFE3B8,#FFC3A0); color:#5A2A0E}
.pnews.burst .dare{background:linear-gradient(135deg,#FFD2C2,#FFB4A0)}
@keyframes bounce{from{transform:scale(.2) rotate(-20deg)}}
</style>
