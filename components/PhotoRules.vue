<script setup lang="ts">
/* How the photo game is played: the video, and the written rules one tap
   away. Opened from ℹ️ in the game — and by itself (`auto`) for whoever has
   never seen it, as when the news of the new game is tapped. Seen to the
   end, or closed after opening by itself, it does not open by itself again. */
const props = defineProps<{ auto?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const video = ref<HTMLVideoElement | null>(null)
let marked = false
function seen() {
  if (marked) return
  marked = true
  $fetch('/api/admin/photo/video-seen', { method: 'POST' }).catch(() => {})
}
function close() {
  if (props.auto) seen()
  emit('close')
}
/* with sound when the phone allows it; muted (the controls are there) when not */
onMounted(async () => {
  await nextTick()
  const v = video.value
  if (!v) return
  try { await v.play() } catch { v.muted = true; v.play().catch(() => {}) }
})
</script>

<template>
  <Teleport to="body">
    <div class="sheet-backdrop" @click.self="close">
      <div class="sheet phrules">
        <div v-if="auto" class="pnew"><b>{{ t('photoNewGame') }}</b></div>
        <h3>📸 {{ t('photoHowTitle') }}</h3>
        <video ref="video" class="rules-video" src="/videos/photo-hunt.mp4?v=2" poster="/videos/photo-hunt.jpg"
               controls playsinline preload="auto" @ended="seen" />
        <details class="rules-more">
          <summary>{{ t('photoAllRules') }}</summary>
          <ol class="rules"><li v-for="n in 6" :key="n">{{ t('photoRule' + n) }}</li></ol>
        </details>
        <button class="btn ghost" @click="close">{{ t('close') }}</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.phrules{display:flex; flex-direction:column; gap:12px; max-height:90dvh; overflow:auto}
.phrules h3{margin:0; font-size:17px; text-align:center}
.pnew{text-align:center; padding:12px; border-radius:16px; background:linear-gradient(135deg,#FDE68A,#F7C8D4); color:#5A2A0E}
.pnew b{font-size:16px}
.rules-video{display:block; margin:0 auto; height:min(58vh, 540px); aspect-ratio:9/16; max-width:100%; border-radius:16px; background:#fde68a; object-fit:contain}
.rules-more summary{cursor:pointer; font-weight:700; font-size:14px; padding:4px 0}
.rules{margin:8px 0 0; padding-left:20px; display:flex; flex-direction:column; gap:7px; font-size:13.5px; line-height:1.5}
</style>
