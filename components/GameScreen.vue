<script setup lang="ts">
/* A mini-game, the whole screen: no tabs, no app header — a slim bar with
   the way back to the dashboard, the game's name, and its own 🔔, where its
   news waits (the app's bell keeps to what matters). */
import { GAMES, type GameKey } from '~/utils/games'

const props = defineProps<{ title: string, sub?: string, game: GameKey }>()
const { t, locale } = useI18n()
const { msg } = useToast()
const router = useRouter()

/* ---- this game's own news ---- */
const inbox = ref<any[]>([])
const inboxOpen = ref(false)
const unread = computed(() => inbox.value.filter(n => !n.read).length)
async function loadInbox() {
  try { inbox.value = await $fetch<any[]>('/api/admin/games/inbox', { query: { game: props.game } }) } catch {}
}
async function openInbox() {
  inboxOpen.value = true
  await loadInbox()
  if (unread.value) {
    // seen; the dots stay until the sheet is closed, so what was new still shows
    $fetch('/api/admin/games/inbox-read', { method: 'POST', body: { game: props.game } }).catch(() => {})
  }
}
function closeInbox() {
  inboxOpen.value = false
  inbox.value.forEach(n => { n.read = true })
}
/** A line that leads somewhere more particular (a throw to answer) goes there. */
function follow(n: any) {
  if (!n.link || n.link === GAMES[props.game].path) return
  closeInbox()
  router.push(n.link)
}
const when = (iso: string) => new Date(iso).toLocaleString(locale.value === 'en' ? 'en-GB' : 'el-GR',
  { timeZone: 'Europe/Nicosia', weekday: 'short', hour: '2-digit', minute: '2-digit' })

const onVisible = () => { if (document.visibilityState === 'visible') loadInbox() }
onMounted(() => { loadInbox(); document.addEventListener('visibilitychange', onVisible) })
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))
defineExpose({ loadInbox })
</script>

<template>
  <div class="game" :class="'g-' + game">
    <header class="gbar">
      <NuxtLink to="/admin" class="gx" :aria-label="t('back')">✕</NuxtLink>
      <img :src="GAMES[game].icon" alt="" class="gic">
      <div class="gt">
        <b>{{ title }}</b>
        <span v-if="sub">{{ sub }}</span>
      </div>
      <slot name="right" />
      <button class="gbell" :aria-label="t('notifications')" @click="openInbox">
        <NavIcon name="bell" />
        <span v-if="unread" class="gdot">{{ unread > 9 ? '9+' : unread }}</span>
      </button>
    </header>

    <main class="gbody">
      <slot />
    </main>

    <div v-if="msg" class="toast gtoast">{{ msg }}</div>
    <PotatoNews />

    <Teleport to="body">
      <div v-if="inboxOpen" class="sheet-backdrop" @click.self="closeInbox">
        <div class="sheet" style="max-height:80dvh;overflow:auto;display:flex;flex-direction:column;gap:10px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ GAMES[game].emoji }} {{ title }} · {{ t('notifications') }}</h3>
          <template v-if="inbox.length">
            <button v-for="n in inbox" :key="n.id" class="gn" :class="{ unread: !n.read }" @click="follow(n)">
              <span class="gnd" :class="{ on: !n.read }" />
              <span class="gnt">
                <span class="gnh"><b>{{ n.title }}</b><small>{{ when(n.createdAt) }}</small></span>
                <span class="gnb">{{ n.body }}</span>
              </span>
            </button>
          </template>
          <div v-else class="tiny muted" style="text-align:center;padding:14px 0">{{ t('gameNoNews') }}</div>
          <button class="btn ghost" @click="closeInbox">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.game{min-height:100dvh; display:flex; flex-direction:column;
  background:linear-gradient(180deg,#CFE9F7 0%,#E4F3E0 38%,#D5EBC8 100%)}
.g-potato{background:linear-gradient(180deg,#FFE7C7 0%,#FFF1DE 40%,#F6E2C4 100%)}
.g-kim{background:linear-gradient(180deg,#E9E3F7 0%,#F4F1E6 40%,#EDE5D3 100%)}
.gbar{position:sticky; top:0; z-index:20; display:flex; align-items:center; gap:10px;
  padding:calc(env(safe-area-inset-top) + 8px) 12px 8px;
  background:rgba(255,255,255,.72); -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px);
  box-shadow:0 1px 0 rgba(20,40,70,.06)}
.gx{flex:none; width:36px; height:36px; border-radius:50%; display:grid; place-items:center; background:#fff;
  color:var(--ink, #1d2b44); font-size:16px; font-weight:800; text-decoration:none; box-shadow:0 1px 4px rgba(20,40,70,.12)}
.gic{flex:none; width:38px; height:38px; object-fit:contain}
.gt{flex:1; min-width:0; display:flex; flex-direction:column; line-height:1.15}
.gt b{font-size:16px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.gt span{font-size:11.5px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.gbell{flex:none; position:relative; width:38px; height:38px; border-radius:50%; border:0; background:#fff;
  display:grid; place-items:center; color:var(--ink, #1d2b44); box-shadow:0 1px 4px rgba(20,40,70,.12)}
.gdot{position:absolute; top:-3px; right:-3px; min-width:18px; height:18px; padding:0 4px; border-radius:999px;
  background:#E5484D; color:#fff; font-size:10.5px; font-weight:800; display:grid; place-items:center}
.gbody{flex:1; padding:12px 12px calc(env(safe-area-inset-bottom) + 20px); display:flex; flex-direction:column; min-width:0}
.gtoast{bottom:calc(env(safe-area-inset-bottom) + 24px)}
.gn{display:flex; gap:10px; text-align:left; border:0; background:#fff; border-radius:14px; padding:10px 12px; width:100%}
.gn.unread{background:var(--accent-soft, #EAF2FF)}
.gnd{flex:none; width:8px; height:8px; border-radius:50%; margin-top:6px}
.gnd.on{background:var(--accent, #2F6FEB)}
.gnt{flex:1; min-width:0; display:flex; flex-direction:column; gap:2px}
.gnh{display:flex; justify-content:space-between; gap:8px}
.gnh b{font-size:13px}
.gnh small{flex:none; font-size:11px; color:var(--muted)}
.gnb{font-size:12.5px; color:var(--muted); line-height:1.4}
</style>
