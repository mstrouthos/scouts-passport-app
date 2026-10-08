<script setup lang="ts">
/* The Βαθμοφόροι's mini-games on the dashboard: a tile each, opening the
   game full screen, with what is new in it; and the one still to come,
   greyed out, without a name. */
import { GAMES, GAME_SOON_ICON, type GameKey } from '~/utils/games'

const { t } = useI18n()
const { data, refresh } = await useFetch<any>('/api/admin/games', { lazy: true })
const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
onMounted(() => document.addEventListener('visibilitychange', onVisible))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

const tiles = computed(() => {
  const d = data.value
  const line: Record<GameKey, string> = {
    throw: d?.bag ? t('gameThrowBag', { n: d.bag }) : t('gameThrowSub'),
    potato: d?.potato ? (d.potato.mine ? t('gamePotatoMine') : t('gamePotatoAt', { name: d.potato.holderName || '—' })) : t('gamePotatoNone'),
    kim: d?.kim ? t('gameKimDone', { c: d.kim.correct }) : t('gameKimNew'),
    north: d?.north ? t('gameNorthDone', { p: d.north.points }) : t('gameNorthNew')
  }
  const NAME: Record<GameKey, string> = { throw: 'gameThrow', potato: 'gamePotato', kim: 'kimTitle', north: 'northTitle' }
  return (['throw', 'potato', 'kim', 'north'] as GameKey[]).map(k => ({
    key: k, ...GAMES[k], name: t(NAME[k]),
    line: line[k], unread: d?.unread?.[k] || 0, hot: k === 'potato' && !!d?.potato?.mine
  }))
})
</script>

<template>
  <section class="games">
    <div class="sec-title">🎮 {{ t('gamesTitle') }}</div>
    <div class="grid">
      <NuxtLink v-for="g in tiles" :key="g.key" :to="g.path" class="tile" :class="['t-' + g.key, { hot: g.hot }]">
        <span v-if="g.unread" class="badge">{{ g.unread > 9 ? '9+' : g.unread }}</span>
        <img :src="g.icon" alt="" class="ic">
        <b>{{ g.name }}</b>
        <span class="ln">{{ g.line }}</span>
      </NuxtLink>
      <div class="tile soon" aria-disabled="true">
        <img :src="GAME_SOON_ICON" alt="" class="ic">
        <span class="ln soonl">{{ t('gameSoon') }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.games{display:flex; flex-direction:column; gap:10px; margin:14px 0}
.grid{display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px}
.tile{position:relative; display:flex; flex-direction:column; align-items:center; text-align:center; gap:2px;
  padding:12px 8px 12px; border-radius:22px; text-decoration:none; color:var(--ink, #1d2b44);
  box-shadow:0 2px 10px rgba(20,40,70,.08); transition:transform .15s}
.tile:active{transform:scale(.96)}
.t-throw{background:linear-gradient(160deg,#FFE9E4,#FFD2C7)}
.t-potato{background:linear-gradient(160deg,#FFF0D6,#FFD9A8)}
.t-kim{background:linear-gradient(160deg,#ECE7FB,#D9E9D2)}
.t-north{background:linear-gradient(160deg,#DDF0FB,#E6F2DA)}
.ic{width:86px; height:86px; object-fit:contain; filter:drop-shadow(0 4px 6px rgba(0,0,0,.12))}
.tile b{font-size:14.5px; line-height:1.2}
.ln{font-size:11.5px; color:var(--muted); line-height:1.3; min-height:1.3em}
.badge{position:absolute; top:8px; right:8px; min-width:22px; height:22px; padding:0 6px; border-radius:999px;
  background:#E5484D; color:#fff; font-size:12px; font-weight:800; display:grid; place-items:center;
  box-shadow:0 2px 6px rgba(229,72,77,.4)}
.hot .ic{animation:wobble 1.2s ease-in-out infinite}
@keyframes wobble{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg) scale(1.05)}}
.soon{background:#EEF1F4; box-shadow:none; grid-column:1 / -1; flex-direction:row; justify-content:center; gap:14px; padding:8px 12px}
.soon .ic{filter:grayscale(1); opacity:.45; width:64px; height:64px}
.soonl{font-weight:700; color:#8A94A3; letter-spacing:.02em}
@media (prefers-reduced-motion: reduce){ .hot .ic{animation:none} }
</style>
