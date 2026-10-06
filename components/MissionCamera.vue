<script setup lang="ts">
/* The app's own camera, for mission photos: the phone's camera live and full
   screen, a shutter, then the photo to keep or take again. Nothing can be
   picked from the gallery — a mission photo is taken there and then. The
   photo comes out as a JPEG no larger than 1600px, without the camera's
   hidden details (place, device). */
const props = defineProps<{ title: string }>()
const emit = defineEmits<{ (e: 'close'): void, (e: 'shot', b: Blob): void }>()
const { t } = useI18n()

const video = ref<HTMLVideoElement | null>(null)
const state = ref<'starting' | 'live' | 'denied' | 'none' | 'shot'>('starting')
const facing = ref<'environment' | 'user'>('environment')
const shot = ref<Blob | null>(null)
const shotUrl = ref('')
const flash = ref(false)
let stream: MediaStream | null = null

function stop() { stream?.getTracks().forEach(tr => tr.stop()); stream = null }
async function start() {
  stop()
  state.value = 'starting'
  if (!navigator.mediaDevices?.getUserMedia) { state.value = 'none'; return }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing.value }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false
    })
    await nextTick()
    if (video.value) { video.value.srcObject = stream; await video.value.play().catch(() => {}) }
    state.value = 'live'
  } catch (e: any) {
    state.value = e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'denied' : 'none'
  }
}
function flip() { facing.value = facing.value === 'environment' ? 'user' : 'environment'; start() }

async function snap() {
  const v = video.value
  if (!v || !v.videoWidth) return
  const k = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k)
  const ctx = c.getContext('2d')!
  // the front camera shows a mirror; the photo is the right way round
  if (facing.value === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1) }
  ctx.drawImage(v, 0, 0, c.width, c.height)
  flash.value = true; setTimeout(() => { flash.value = false }, 180)
  shot.value = await new Promise<Blob | null>(res => c.toBlob(res, 'image/jpeg', 0.85))
  if (!shot.value) return
  if (shotUrl.value) URL.revokeObjectURL(shotUrl.value)
  shotUrl.value = URL.createObjectURL(shot.value)
  state.value = 'shot'
  stop()
}
function retake() { shot.value = null; start() }
function use() { if (shot.value) emit('shot', shot.value) }

onMounted(start)
onBeforeUnmount(() => { stop(); if (shotUrl.value) URL.revokeObjectURL(shotUrl.value) })
</script>

<template>
  <Teleport to="body">
    <div class="cam" role="dialog" :aria-label="props.title">
      <div class="top">
        <button class="x" :aria-label="t('close')" @click="emit('close')">✕</button>
        <b>{{ props.title }}</b>
        <span style="width:40px" />
      </div>

      <div class="view">
        <video v-show="state === 'live' || state === 'starting'" ref="video" playsinline muted autoplay :class="{ mirror: facing === 'user' }" />
        <img v-if="state === 'shot'" :src="shotUrl" alt="">
        <div v-if="state === 'starting'" class="msg">📷 {{ t('camStarting') }}</div>
        <div v-else-if="state === 'denied'" class="msg">🚫 <b>{{ t('camDenied') }}</b><span>{{ t('camDeniedHow') }}</span>
          <button class="again" @click="start">{{ t('camTryAgain') }}</button></div>
        <div v-else-if="state === 'none'" class="msg">📵 <b>{{ t('camNone') }}</b><span>{{ t('camNoneHow') }}</span></div>
        <div v-if="flash" class="flash" />
      </div>

      <div class="controls">
        <template v-if="state === 'shot'">
          <button class="pill" @click="retake">↺ {{ t('camRetake') }}</button>
          <button class="pill main" @click="use">✓ {{ t('camUse') }}</button>
        </template>
        <template v-else>
          <span style="width:52px" />
          <button class="shutter" :disabled="state !== 'live'" :aria-label="t('camShoot')" @click="snap"><i /></button>
          <button class="flip" :disabled="state !== 'live'" :aria-label="t('camFlip')" @click="flip">⟲</button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cam{position:fixed; inset:0; z-index:2000; background:#000; color:#fff; display:flex; flex-direction:column}
.top{flex:none; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:calc(10px + env(safe-area-inset-top)) 14px 10px}
.top b{font-size:15px; text-align:center; flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.x{width:40px; height:40px; border-radius:50%; border:0; background:rgba(255,255,255,.14); color:#fff; font-size:18px}
.view{position:relative; flex:1; min-height:0; display:grid; place-items:center; overflow:hidden}
.view video, .view img{width:100%; height:100%; object-fit:contain}
.view video.mirror{transform:scaleX(-1)}
.msg{position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:24px; text-align:center; font-size:30px}
.msg b{font-size:16px}
.msg span{font-size:13.5px; opacity:.8; max-width:300px; line-height:1.5}
.again{margin-top:6px; border:0; border-radius:999px; padding:10px 18px; font:inherit; font-size:14px; font-weight:700; background:#fff; color:#111}
.flash{position:absolute; inset:0; background:#fff; animation:fl .18s ease-out both}
@keyframes fl{from{opacity:.9}to{opacity:0}}
.controls{flex:none; display:flex; align-items:center; justify-content:space-around; gap:12px; padding:18px 20px calc(22px + env(safe-area-inset-bottom))}
.shutter{width:76px; height:76px; border-radius:50%; border:5px solid #fff; background:transparent; padding:5px}
.shutter i{display:block; width:100%; height:100%; border-radius:50%; background:#fff}
.shutter:active i{transform:scale(.88)}
.shutter:disabled{opacity:.4}
.flip{width:52px; height:52px; border-radius:50%; border:0; background:rgba(255,255,255,.14); color:#fff; font-size:24px}
.pill{flex:1; max-width:170px; border:0; border-radius:999px; padding:15px; font:inherit; font-size:15px; font-weight:800; background:rgba(255,255,255,.16); color:#fff}
.pill.main{background:#F2C230; color:#3A2A00}
</style>
