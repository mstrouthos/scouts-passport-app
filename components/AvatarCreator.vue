<script setup lang="ts">
/* The avatar builder: a big preview on its own background, a row of tabs
   (body, hair, face, glasses, hats, background), and in each tab a row of
   colours and a grid of tiles — each tile the person's own avatar with that
   one choice made, zoomed in on what it changes.

   Members make one here; so may a Βαθμοφόρος, instead of a photo — saving an
   avatar takes their photo down, as only one of the two is shown. Beards and
   moustaches are offered to Βαθμοφόροι only. */
import { AVATAR_OPTIONS, AVATAR_TABS, optionsFor, DEFAULT_AVATAR, avatarSvg, normalizeAvatar, randomAvatar, type Avatar } from '~/utils/avatar'
const props = defineProps<{ back: string }>()
const { t } = useI18n()
const me = useMe()
const { show } = useToast()

const cfg = ref<Avatar>(normalizeAvatar(me.value?.avatar || DEFAULT_AVATAR))
let saved = JSON.stringify(cfg.value)
const dirty = computed(() => JSON.stringify(cfg.value) !== saved)
watch(() => me.value?.avatar, v => { if (v && !dirty.value) { cfg.value = normalizeAvatar(v); saved = JSON.stringify(cfg.value) } })

const isLeader = computed(() => me.value?.role && me.value.role !== 'scout')
const tabs = computed(() => AVATAR_TABS.map(tb => ({
  // beards for Βαθμοφόροι, and only for a man's avatar
  ...tb, sections: tb.sections.filter(s => s.field !== 'facialHair' || (isLeader.value && cfg.value.gender === 'boy'))
})))
// someone making their first avatar starts with the first question
const tab = ref(me.value?.avatar ? 'body' : 'gender')
const current = computed(() => tabs.value.find(x => x.key === tab.value)!)

const big = computed(() => avatarSvg(cfg.value, 'big'))
/* a hat would hide what the hair, face and glasses tiles are there to show,
   so only the hats tab draws one */
// each tile shows what choosing it gives — the girl tile with the long hair
// that switching brings
const tile = (field: string, v: string, crop: any) => avatarSvg(
  { ...applied(field, v), ...(tab.value !== 'headwear' && tab.value !== 'bg' ? { headwear: 'none' } : {}) },
  `t-${field}-${String(v).replace(/\W/g, '')}`, crop)

/* the preview and the tabs stay pinned; picking a tab brings its options
   into view right under them */
const dockEl = ref<HTMLElement | null>(null)
function pick(key: string) {
  tab.value = key
  nextTick(() => {
    const d = dockEl.value
    if (!d) return
    const pinned = d.getBoundingClientRect().top <= 1
    if (pinned) window.scrollTo({ top: d.offsetTop, behavior: 'smooth' })
  })
}
/* changing gender changes the look: a boy's hairstyle becomes long hair for
   a girl, a girl's becomes short for a boy; a hijab or a beard that no longer
   fits goes */
function applied(field: string, v: string): Avatar {
  const next: any = { ...cfg.value, [field]: v }
  if (field === 'gender' && v !== cfg.value.gender) {
    const boys = optionsFor('hair', 'boy')
    if (v === 'girl' && boys.includes(next.hair)) next.hair = 'long'
    if (v === 'boy' && !boys.includes(next.hair)) next.hair = 'short'
    for (const f of ['headwear', 'facialHair']) if (!optionsFor(f, v).includes(next[f])) next[f] = 'none'
  }
  return next
}
function choose(field: string, v: string) { cfg.value = applied(field, v) }
const values = (field: string) => field === 'gender' || !(field in AVATAR_OPTIONS)
  ? AVATAR_OPTIONS[field as keyof typeof AVATAR_OPTIONS] as readonly string[]
  : optionsFor(field, cfg.value.gender)
const label = (field: string, v: string) => v.startsWith('#') ? v : t(`avo_${field}_${v}`)
/* a colour for a choice only matters once the choice is made: the glasses'
   colour row waits until there are glasses */
const needs: Record<string, () => boolean> = {
  glassesColor: () => cfg.value.glasses !== 'none',
  headwearColor: () => !['none', 'scout'].includes(cfg.value.headwear),
  hairColor: () => cfg.value.hair !== 'none',
  facialHairColor: () => cfg.value.facialHair !== 'none'
}

function resetToSaved() { cfg.value = normalizeAvatar(JSON.parse(saved)) }
function shuffle() {
  const r = randomAvatar()
  cfg.value = { ...r, facialHair: isLeader.value && r.gender === 'boy' ? cfg.value.facialHair : 'none' }
}

const busy = ref(false)
async function save() {
  busy.value = true
  try {
    await $fetch('/api/me/avatar', { method: 'PUT', body: { avatar: cfg.value } })
    saved = JSON.stringify(cfg.value)
    await loadMe()
    show('✅ ' + t('avatarSaved'))
    await navigateTo(props.back)
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}
onBeforeRouteLeave(() => !dirty.value || busy.value || confirm(t('avatarUnsaved')))

/* the tab icons: line drawings, as in the app's own navigation */
const ICONS: Record<string, string> = {
  body: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  gender: '<circle cx="7.5" cy="7" r="2.8"/><path d="M3 20v-4.5a4.5 4.5 0 0 1 9 0V20"/><circle cx="16.5" cy="7" r="2.8"/><path d="M12.5 20l1.2-6a3 3 0 0 1 5.6 0l1.2 6Z"/>',
  hair: '<rect x="3" y="5" width="18" height="5" rx="2"/><path d="M6 10v8M9 10v8M12 10v8M15 10v8M18 10v8"/>',
  face: '<rect x="4" y="3" width="16" height="18" rx="6"/><circle cx="9.5" cy="11" r="1.4"/><circle cx="14.5" cy="11" r="1.4"/><path d="M9 15.5c1.8 1.4 4.2 1.4 6 0"/>',
  glasses: '<circle cx="7" cy="13" r="3.6"/><circle cx="17" cy="13" r="3.6"/><path d="M10.6 12.5c.9-.7 1.9-.7 2.8 0M3.4 12 2 9M20.6 12 22 9"/>',
  hat: '<path d="M5 16c0-6 3-10 7-10s7 4 7 10"/><path d="M2 16h20v2.5H2z"/>',
  clothes: '<path d="M8 3 4 5.5 2 10l3.5 1.5L7 9.5V21h10V9.5l1.5 2L22 10l-2-4.5L16 3c-.5 1.6-2.1 2.6-4 2.6S8.5 4.6 8 3Z"/>',
  frame: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="9" r="1.6"/>'
}
</script>

<template>
  <AppShell :title="t('avatarTitle')" :sub="t('avatarSub')" :back="back">
    <!-- pinned: the avatar as it is now, and the sections; only the
         options below them scroll -->
    <div ref="dockEl" class="dock">
      <div class="stage" :style="{ background: cfg.bg }">
        <div class="big" v-html="big" />
        <button class="dice" :aria-label="t('avatarRandom')" :title="t('avatarRandom')" @click="shuffle">🎲</button>
        <!-- back to the avatar as last saved, after trying things out -->
        <button v-if="dirty && me?.avatar" class="dice reset" :aria-label="t('avatarReset')" :title="t('avatarReset')" @click="resetToSaved">↺</button>
      </div>
      <div class="seg tabs" role="tablist">
        <button v-for="tb in tabs" :key="tb.key" role="tab" :aria-selected="tab === tb.key" :class="{ on: tab === tb.key }" @click="pick(tb.key)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS[tb.icon]" />
          <span>{{ t('avt_' + tb.key) }}</span>
        </button>
      </div>
    </div>

    <div v-if="me?.photo" class="note">📷 {{ t('avatarReplacesPhoto') }}</div>

    <!-- one card per choice: its tiles, then its own colours; or colours alone -->
    <div v-for="s in current.sections" :key="tab + s.field" class="card opts">
      <div class="lab">{{ t('avs_' + s.field) }}</div>
      <div v-if="!s.crop" class="swatches">
        <button v-for="v in values(s.field)" :key="v" class="swatch" :class="{ on: cfg[s.field] === v }"
                :aria-label="label(s.field, v)" @click="choose(s.field, v)">
          <span :style="{ background: v }" />
        </button>
      </div>
      <template v-else>
        <template v-if="s.color && (!needs[s.color] || needs[s.color]())">
          <div class="lab sub">{{ t('avs_' + s.color) }}</div>
          <div class="swatches">
            <button v-for="v in values(s.color)" :key="v" class="swatch" :class="{ on: cfg[s.color] === v }"
                    :aria-label="v" @click="choose(s.color, v)">
              <span :style="{ background: v }" />
            </button>
          </div>
        </template>
        <div class="tiles">
          <button v-for="v in values(s.field)" :key="v" class="tile" :class="{ on: cfg[s.field] === v }"
                  :aria-label="label(s.field, v)" :title="label(s.field, v)" @click="choose(s.field, v)">
            <span class="art" v-html="tile(s.field, v, s.crop)" />
            <span v-if="v === 'none'" class="none">∅</span>
          </button>
        </div>
      </template>
    </div>
    <div class="tiny muted" style="text-align:center">💛💙 {{ t('avatarScarfNote') }}</div>

    <div class="savebar">
      <button class="btn" :disabled="busy || (!dirty && !!me?.avatar)" @click="save">
        {{ busy ? t('loading') : dirty || !me?.avatar ? t('avatarSave') : '✓ ' + t('saved') }}
      </button>
    </div>
  </AppShell>
</template>

<style scoped>
/* pinned under the top of the screen once the header has scrolled away */
.dock{position:sticky; top:env(safe-area-inset-top); z-index:6; display:flex; flex-direction:column; gap:10px;
  margin:-6px -16px 0; padding:6px 16px 10px; background:linear-gradient(180deg,#E0EDFB 0%,#DCEAF9 100%)}
.stage{position:relative; display:flex; justify-content:center; align-items:flex-end; height:min(30vh, 210px);
  border-radius:var(--r-card); overflow:hidden; box-shadow:var(--shadow); transition:background .25s}
.big{height:100%; aspect-ratio:1}
.big :deep(svg){width:100%; height:100%; display:block}
.big :deep(svg > rect:first-of-type){fill:transparent}
.dice{position:absolute; right:10px; top:10px; width:42px; height:42px; border-radius:50%; border:0; background:#fff; font-size:20px; box-shadow:var(--shadow-sm)}
.dice:active{transform:rotate(25deg) scale(.95)}
.dice.reset{right:60px; font-size:22px; font-weight:800; color:var(--accent-deep)}
.dice.reset:active{transform:rotate(-40deg) scale(.95)}
.tabs button{display:flex; flex-direction:column; align-items:center; gap:2px; padding:7px 0 6px; min-width:0; overflow:hidden}
.tabs{overflow-x:auto; scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tabs button{min-width:40px}
.tabs svg{width:21px; height:21px}
.tabs{gap:2px}
.tabs span{font-size:9px; font-weight:650; letter-spacing:-.15px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%}
.tabs button.on{color:var(--accent-deep)}
.opts{display:flex; flex-direction:column; gap:10px}
.opts .lab{margin:0}
.opts .lab.sub{margin-top:0}
.opts .swatches + .tiles{margin-top:4px}
.swatches{display:flex; flex-wrap:wrap; gap:9px}
.swatch{width:42px; height:42px; border-radius:50%; border:3px solid #fff; padding:0; box-shadow:0 0 0 1.5px var(--line)}
.swatch span{display:block; width:100%; height:100%; border-radius:50%}
.swatch.on{box-shadow:0 0 0 3px var(--accent)}
.tiles{display:grid; grid-template-columns:repeat(auto-fill, minmax(92px, 1fr)); gap:9px}
.tile{position:relative; aspect-ratio:1; border-radius:16px; border:2px solid var(--line); background:var(--hair); padding:0; overflow:hidden}
.tile.on{border-color:var(--accent); background:var(--accent-soft)}
.tile .art{display:block; width:100%; height:100%}
.tile .art :deep(svg){width:100%; height:100%; display:block}
.tile .art :deep(svg > rect:first-of-type){fill:transparent}
.tile .none{position:absolute; top:5px; right:8px; font-size:14px; color:var(--muted); font-weight:700}
.tile:active, .swatch:active{transform:scale(.96)}
.savebar{position:sticky; bottom:calc(84px + env(safe-area-inset-bottom)); z-index:5}
@media (min-width:820px){
  .dock{margin:0; padding:6px 0 10px}
  .savebar{bottom:16px}
}
</style>
