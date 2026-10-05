<script setup lang="ts">
/* The avatar builder: a big preview on its own background, a row of tabs
   (body, hair, face, glasses, hats, background), and in each tab a row of
   colours and a grid of tiles — each tile the person's own avatar with that
   one choice made, zoomed in on what it changes.

   Members make one here; so may a Βαθμοφόρος, instead of a photo — saving an
   avatar takes their photo down, as only one of the two is shown. Beards and
   moustaches are offered to Βαθμοφόροι only. */
import { AVATAR_OPTIONS, AVATAR_TABS, DEFAULT_AVATAR, avatarSvg, normalizeAvatar, randomAvatar, type Avatar } from '~/utils/avatar'
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
  ...tb, sections: tb.sections.filter(s => s.field !== 'facialHair' || isLeader.value)
})))
const tab = ref('body')
const current = computed(() => tabs.value.find(x => x.key === tab.value)!)

const big = computed(() => avatarSvg(cfg.value, 'big'))
/* a hat would hide what the hair, face and glasses tiles are there to show,
   so only the hats tab draws one */
const tile = (field: string, v: string, crop: any) => avatarSvg(
  { ...cfg.value, ...(tab.value !== 'headwear' && tab.value !== 'bg' ? { headwear: 'none' } : {}), [field]: v },
  `t-${field}-${String(v).replace(/\W/g, '')}`, crop)

/* the tabs stick right under the top bar, whatever its height on this phone */
const barEl = ref<HTMLElement | null>(null)
const barH = ref(57)
onMounted(() => { if (barEl.value) barH.value = barEl.value.offsetHeight })
function choose(field: string, v: string) { cfg.value = { ...cfg.value, [field]: v } as Avatar }
const values = (field: string) => AVATAR_OPTIONS[field as keyof typeof AVATAR_OPTIONS] as readonly string[]
const label = (field: string, v: string) => v.startsWith('#') ? v : t(`avo_${field}_${v}`)
/* a colour for a choice only matters once the choice is made: the glasses'
   colour row waits until there are glasses */
const needs: Record<string, () => boolean> = {
  glassesColor: () => cfg.value.glasses !== 'none',
  headwearColor: () => !['none', 'scout'].includes(cfg.value.headwear),
  hairColor: () => cfg.value.hair !== 'none' || cfg.value.facialHair !== 'none'
}

function shuffle() { cfg.value = { ...randomAvatar(), facialHair: isLeader.value ? cfg.value.facialHair : 'none' } }

const busy = ref(false)
async function save() {
  busy.value = true
  try {
    await $fetch('/api/me/avatar', { method: 'PUT', body: { avatar: cfg.value } })
    saved = JSON.stringify(cfg.value)
    await loadMe()
    show('✅ ' + t('avatarSaved'))
    await navigateTo(props.back)
  } catch (e: any) { show(e?.data?.message || t('error')) } finally { busy.value = false }
}
function close() { navigateTo(props.back) }
onBeforeRouteLeave(() => !dirty.value || busy.value || confirm(t('avatarUnsaved')))

/* the tab icons: line drawings, as in the app's own navigation */
const ICONS: Record<string, string> = {
  body: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  hair: '<rect x="3" y="5" width="18" height="5" rx="2"/><path d="M6 10v8M9 10v8M12 10v8M15 10v8M18 10v8"/>',
  face: '<rect x="4" y="3" width="16" height="18" rx="6"/><circle cx="9.5" cy="11" r="1.4"/><circle cx="14.5" cy="11" r="1.4"/><path d="M9 15.5c1.8 1.4 4.2 1.4 6 0"/>',
  glasses: '<circle cx="7" cy="13" r="3.6"/><circle cx="17" cy="13" r="3.6"/><path d="M10.6 12.5c.9-.7 1.9-.7 2.8 0M3.4 12 2 9M20.6 12 22 9"/>',
  hat: '<path d="M5 16c0-6 3-10 7-10s7 4 7 10"/><path d="M2 16h20v2.5H2z"/>',
  frame: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="9" r="1.6"/>'
}
</script>

<template>
  <div class="builder">
    <header ref="barEl" class="bar">
      <button class="x" :aria-label="t('close')" @click="close">✕</button>
      <b>{{ t('avatarTitle') }}</b>
      <button class="done" :disabled="busy" @click="save">{{ busy ? '…' : t('avatarDone') }}</button>
    </header>

    <div class="stage" :style="{ background: cfg.bg }">
      <div class="big" v-html="big" />
      <button class="dice" :aria-label="t('avatarRandom')" @click="shuffle">🎲</button>
    </div>
    <div v-if="me?.photo" class="photo-note">📷 {{ t('avatarReplacesPhoto') }}</div>

    <nav class="tabs" role="tablist" :style="{ top: barH + 'px' }">
      <button v-for="tb in tabs" :key="tb.key" role="tab" :aria-selected="tab === tb.key" :class="{ on: tab === tb.key }"
              :aria-label="t('avt_' + tb.key)" :title="t('avt_' + tb.key)" @click="tab = tb.key">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS[tb.icon]" />
      </button>
    </nav>

    <div class="panel">
      <template v-for="s in current.sections" :key="s.field">
        <section v-if="!needs[s.field] || needs[s.field]()">
          <h4>{{ t('avs_' + s.field) }}</h4>
          <div v-if="s.swatch" class="swatches">
            <button v-for="v in values(s.field)" :key="v" class="swatch" :class="{ on: cfg[s.field] === v }"
                    :aria-label="label(s.field, v)" @click="choose(s.field, v)">
              <span :style="{ background: v }" />
            </button>
          </div>
          <div v-else class="tiles">
            <button v-for="v in values(s.field)" :key="v" class="tile" :class="{ on: cfg[s.field] === v }"
                    :aria-label="label(s.field, v)" :title="label(s.field, v)" @click="choose(s.field, v)">
              <span class="art" v-html="tile(s.field, v, s.crop)" />
              <span v-if="v === 'none'" class="none">∅</span>
            </button>
          </div>
        </section>
      </template>
      <p class="scarf-note">💛💙 {{ t('avatarScarfNote') }}</p>
    </div>
  </div>
</template>

<style scoped>
.builder{min-height:100dvh; background:#fff; max-width:560px; margin:0 auto; display:flex; flex-direction:column; box-shadow:0 0 40px rgba(30,70,140,.08)}
.bar{position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:10px; padding:calc(10px + env(safe-area-inset-top)) 14px 10px; background:#fff; border-bottom:1px solid var(--hair)}
.bar b{flex:1; text-align:center; font-size:15px; color:var(--muted); font-weight:700}
.x{border:0; background:none; font-size:20px; color:var(--muted); width:44px; height:36px}
.done{border:0; background:none; font:inherit; font-size:15px; font-weight:800; color:#1CB0F6; letter-spacing:.04em; min-width:44px; text-transform:uppercase}
.done:disabled{opacity:.5}
.stage{position:relative; display:flex; justify-content:center; align-items:flex-end; padding-top:18px; transition:background .25s}
.big{width:min(260px, 70vw); aspect-ratio:1}
.big :deep(svg){width:100%; height:100%; display:block}
.big :deep(svg > rect:first-of-type){fill:transparent}
.dice{position:absolute; right:14px; bottom:14px; width:46px; height:46px; border-radius:14px; border:2px solid rgba(0,0,0,.08); border-bottom-width:4px; background:#fff; font-size:22px}
.dice:active{transform:translateY(2px); border-bottom-width:2px}
.photo-note{font-size:12px; color:var(--muted); text-align:center; padding:8px 14px 0}
.tabs{position:sticky; z-index:4; display:flex; background:#fff; border-bottom:2px solid var(--hair)}
.tabs button{flex:1; border:0; background:none; padding:12px 0 10px; color:#AFB8C4; position:relative}
.tabs button svg{width:28px; height:28px}
.tabs button.on{color:#1CB0F6}
.tabs button.on::after{content:""; position:absolute; left:18%; right:18%; bottom:-2px; height:3px; border-radius:2px; background:#1CB0F6}
.panel{flex:1; padding:6px 16px calc(28px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:6px}
h4{margin:14px 0 9px; font-size:15px; font-weight:800; color:var(--ink)}
.swatches{display:flex; gap:10px; overflow-x:auto; padding:3px 3px 6px; margin:0 -3px; scrollbar-width:none}
.swatches::-webkit-scrollbar{display:none}
.swatch{flex:none; width:48px; height:48px; border-radius:14px; border:2px solid #E5E5E5; border-bottom-width:4px; background:#fff; padding:5px}
.swatch span{display:block; width:100%; height:100%; border-radius:8px}
.swatch.on{border-color:#1CB0F6; background:#DDF4FF}
.tiles{display:grid; grid-template-columns:repeat(3, 1fr); gap:10px}
.tile{position:relative; aspect-ratio:1; border-radius:16px; border:2px solid #E5E5E5; border-bottom-width:4px; background:#fff; padding:0; overflow:hidden}
.tile.on{border-color:#1CB0F6; background:#DDF4FF}
.tile .art{display:block; width:100%; height:100%}
.tile .art :deep(svg){width:100%; height:100%; display:block}
.tile .art :deep(svg > rect:first-of-type){fill:transparent}
.tile .none{position:absolute; top:6px; right:9px; font-size:15px; color:#AFB8C4; font-weight:700}
.tile:active, .swatch:active{transform:translateY(2px); border-bottom-width:2px}
.scarf-note{margin:18px 0 0; text-align:center; font-size:12px; color:var(--muted)}
</style>
