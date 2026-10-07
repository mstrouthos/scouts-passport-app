<script setup lang="ts">
/* Someone's avatar or photo, full screen: as large as the screen allows,
   their name under it. A tap anywhere, or Escape, closes it. */
import { avatarSvg } from '~/utils/avatar'
const view = useAvatarViewer()
const svg = computed(() => view.value?.avatar && !view.value.photo ? avatarSvg(view.value.avatar, 'viewer', 'full', { party: !!view.value.party }) : '')
const close = () => { view.value = null }
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
// the page behind stays where it is
watch(view, v => { if (import.meta.client) document.documentElement.style.overflow = v ? 'hidden' : '' })
</script>

<template>
  <Teleport to="body">
    <Transition name="av-zoom">
      <div v-if="view" class="viewer" role="dialog" :aria-label="view.name" @click="close">
        <img v-if="view.photo" :src="view.photo" :alt="view.name" class="pic">
        <div v-else-if="svg" class="art" v-html="svg" />
        <div class="nm">{{ view.name }}</div>
        <button class="x" aria-label="✕" @click.stop="close">✕</button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.viewer{position:fixed; inset:0; z-index:200; background:rgba(8,14,28,.92); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:calc(env(safe-area-inset-top) + 24px) 20px calc(env(safe-area-inset-bottom) + 24px); cursor:zoom-out}
.pic{max-width:100%; max-height:78dvh; object-fit:contain; border-radius:18px; box-shadow:0 20px 60px rgba(0,0,0,.5)}
.art{width:min(86vw, 70dvh, 520px); aspect-ratio:1; border-radius:50%; overflow:hidden; box-shadow:0 0 0 5px rgba(255,255,255,.9), 0 20px 60px rgba(0,0,0,.5)}
.art :deep(svg){width:100%; height:100%; display:block}
.nm{color:#fff; font-size:18px; font-weight:700; text-align:center}
.x{position:absolute; top:calc(env(safe-area-inset-top) + 12px); right:14px; width:40px; height:40px; border-radius:50%; border:0; background:rgba(255,255,255,.15); color:#fff; font-size:18px; cursor:pointer}
.av-zoom-enter-active,.av-zoom-leave-active{transition:opacity .2s}
.av-zoom-enter-active .pic,.av-zoom-enter-active .art{transition:transform .25s cubic-bezier(.2,.9,.3,1.2)}
.av-zoom-enter-from,.av-zoom-leave-to{opacity:0}
.av-zoom-enter-from .pic,.av-zoom-enter-from .art{transform:scale(.6)}
</style>
