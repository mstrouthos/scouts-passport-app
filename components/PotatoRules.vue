<script setup lang="ts">
/* How the hot potato is played: the video, and the written rules one tap
   away. Opened from ℹ️ on the potato card — and by itself, with the news of a
   new round, for a Βαθμοφόρος who has never seen it (then `news` says what is
   at stake). Seen to the end, or closed after opening by itself, it is not
   opened by itself again. */
const props = defineProps<{ news?: { startedBy: string | null, challenge: string } | null }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const video = ref<HTMLVideoElement | null>(null)
let marked = false
function seen() {
  if (marked) return
  marked = true
  $fetch('/api/admin/fun/potato-video-seen', { method: 'POST' }).catch(() => {})
}
function close() {
  if (props.news) seen()
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
      <div class="sheet prules">
        <div v-if="news" class="pnew">
          <b>{{ t('potatoNewTitle') }}</b>
          <span>{{ t('potatoNewBy', { name: news.startedBy || '—' }) }}</span>
          <span class="dare">«{{ news.challenge }}»</span>
        </div>
        <h3>🥔 {{ t('funPotatoRulesTitle') }}</h3>
        <video ref="video" class="rules-video" src="/videos/hot-potato.mp4" poster="/videos/hot-potato.jpg"
               controls playsinline preload="auto" @ended="seen" />
        <details class="rules-more">
          <summary>{{ t('funPotatoAllRules') }}</summary>
          <ol class="rules"><li v-for="n in 10" :key="n">{{ t('funPotatoRule' + n) }}</li></ol>
        </details>
        <button class="btn ghost" @click="close">{{ t('close') }}</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.prules{display:flex; flex-direction:column; gap:12px; max-height:90dvh; overflow:auto}
.prules h3{margin:0; font-size:17px; text-align:center}
.pnew{display:flex; flex-direction:column; gap:4px; text-align:center; padding:12px; border-radius:16px; background:linear-gradient(135deg,#FFE3B8,#FFC3A0); color:#5A2A0E}
.pnew b{font-size:16px}
.pnew span{font-size:13px}
.pnew .dare{font-size:15px; font-weight:800; line-height:1.35}
.rules-video{display:block; margin:0 auto; height:min(58vh, 540px); aspect-ratio:9/16; max-width:100%; border-radius:16px; background:#fde68a; object-fit:contain}
.rules-more summary{cursor:pointer; font-weight:700; font-size:14px; padding:4px 0}
.rules{margin:8px 0 0; padding-left:20px; display:flex; flex-direction:column; gap:7px; font-size:13.5px; line-height:1.5}
</style>
