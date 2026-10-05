<script setup lang="ts">
/* The avatar creator: a member builds their own cartoon — skin, face, hair,
   eyes, mouth, glasses, hat (the scout hat too), shirt, background — and
   wears the troop's scarf whatever they choose. Each choice is shown as their
   own avatar with that one thing changed, so they see what they will get.
   Members make one here; so may a Βαθμοφόρος, instead of a photo — saving an
   avatar takes their photo down, as only one of the two is shown. */
const props = defineProps<{ back: string }>()
import { AVATAR_OPTIONS, DEFAULT_AVATAR, avatarSvg, normalizeAvatar, randomAvatar, type Avatar } from '~/utils/avatar'
const { t } = useI18n()
const me = useMe()
const { show } = useToast()

const cfg = ref<Avatar>(normalizeAvatar(me.value?.avatar || DEFAULT_AVATAR))
let saved = JSON.stringify(cfg.value)
const dirty = computed(() => JSON.stringify(cfg.value) !== saved)
watch(() => me.value?.avatar, v => { if (v && !dirty.value) { cfg.value = normalizeAvatar(v); saved = JSON.stringify(cfg.value) } })

type Cat = keyof typeof AVATAR_OPTIONS
const CATS: Array<{ key: Cat, icon: string, swatch?: boolean }> = [
  { key: 'gender', icon: '🧒' }, { key: 'skin', icon: '🎨', swatch: true }, { key: 'face', icon: '🙂' },
  { key: 'hair', icon: '💇' }, { key: 'hairColor', icon: '🖌️', swatch: true }, { key: 'eyes', icon: '👀' },
  { key: 'mouth', icon: '👄' }, { key: 'facewear', icon: '👓' }, { key: 'hat', icon: '🎩' },
  { key: 'shirt', icon: '👕', swatch: true }, { key: 'bg', icon: '🟦', swatch: true }
]
const cat = ref<Cat>('hair')
const current = computed(() => CATS.find(c => c.key === cat.value)!)
const options = computed(() => AVATAR_OPTIONS[cat.value] as readonly string[])
/* each option drawn on the member's own avatar, zoomed to what changes */
const preview = (v: string) => avatarSvg({ ...cfg.value, [cat.value]: v }, `o-${cat.value}-${v.replace(/\W/g, '')}`)
const big = computed(() => avatarSvg(cfg.value, 'big'))
function choose(v: string) {
  cfg.value = { ...cfg.value, [cat.value]: v } as Avatar
}
function shuffle() { cfg.value = randomAvatar() }

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
onBeforeRouteLeave(() => !dirty.value || busy.value || confirm(t('avatarUnsaved')))
</script>

<template>
  <AppShell :title="t('avatarTitle')" :sub="t('avatarSub')" :back="back">
    <div v-if="me?.photo" class="note">📷 {{ t('avatarReplacesPhoto') }}</div>
    <div class="stage">
      <div class="big" v-html="big" />
      <button class="dice" :aria-label="t('avatarRandom')" @click="shuffle">🎲</button>
    </div>
    <div class="tiny muted center">💛💙 {{ t('avatarScarfNote') }}</div>

    <div class="cats">
      <button v-for="c in CATS" :key="c.key" class="chip" :class="{ on: cat === c.key }" @click="cat = c.key">
        {{ c.icon }} {{ t('avc_' + c.key) }}
      </button>
    </div>

    <div class="card opts" :class="{ sw: current.swatch }">
      <template v-if="current.swatch">
        <button v-for="v in options" :key="v" class="swatch" :class="{ on: cfg[cat] === v }"
                :style="{ background: v }" :aria-label="v" @click="choose(v)" />
      </template>
      <template v-else>
        <button v-for="v in options" :key="v" class="opt" :class="{ on: cfg[cat] === v }" @click="choose(v)">
          <span class="mini" v-html="preview(v)" />
          <span class="lbl">{{ t(`avo_${cat}_${v}`) }}</span>
        </button>
      </template>
    </div>

    <div class="savebar">
      <button class="btn" :disabled="busy || (!dirty && !!me?.avatar)" @click="save">
        {{ busy ? t('loading') : dirty || !me?.avatar ? t('avatarSave') : '✓ ' + t('saved') }}
      </button>
    </div>
  </AppShell>
</template>

<style scoped>
.stage{position:relative; align-self:center; margin-top:4px}
.big{width:180px; height:180px; border-radius:50%; overflow:hidden; box-shadow:0 10px 28px rgba(30,70,140,.18), 0 0 0 5px #fff}
.big :deep(svg){width:100%; height:100%; display:block}
.dice{position:absolute; right:-6px; bottom:6px; width:46px; height:46px; border-radius:50%; border:0; background:#fff; font-size:22px; box-shadow:var(--shadow)}
.dice:active{transform:rotate(30deg) scale(.95)}
.center{text-align:center}
.cats{display:flex; gap:7px; overflow-x:auto; padding:2px 2px 6px; margin:0 -2px; scrollbar-width:none}
.cats::-webkit-scrollbar{display:none}
.cats .chip{flex:none}
.opts{display:grid; grid-template-columns:repeat(auto-fill, minmax(84px, 1fr)); gap:10px}
.opts.sw{grid-template-columns:repeat(auto-fill, minmax(52px, 1fr)); justify-items:center}
.opt{display:flex; flex-direction:column; align-items:center; gap:5px; border:2px solid transparent; border-radius:16px; background:var(--hair); padding:8px 4px; font:inherit; color:inherit}
.opt.on{border-color:var(--accent); background:var(--accent-soft)}
.mini{width:64px; height:64px; border-radius:50%; overflow:hidden; display:block}
.mini :deep(svg){width:100%; height:100%; display:block}
.lbl{font-size:11px; font-weight:600; text-align:center; line-height:1.2}
.swatch{width:46px; height:46px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 0 1.5px var(--line)}
.swatch.on{box-shadow:0 0 0 3px var(--accent)}
.savebar{position:sticky; bottom:calc(84px + env(safe-area-inset-bottom)); z-index:5}
@media (min-width:820px){ .savebar{bottom:16px} }
</style>
