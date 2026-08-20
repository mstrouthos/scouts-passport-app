<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const name = useName()
const route = useRoute()
const id = route.params.id
const { data } = await useFetch<any>(`/api/admin/scouts/${id}`)
const canvasEl = ref<HTMLCanvasElement | null>(null)

const GRAD: Record<string, [string, string]> = {
  omada: ['#5FAE87', '#1B3B2E'], koinotita: ['#A97FCB', '#4E2E6B'],
  ageli: ['#E8BB3E', '#8F6C0E'], 'mikri-ageli': ['#7FD1EE', '#2E86AC']
}

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img); img.onerror = reject
    img.src = src
  })
}

async function draw() {
  if (!data.value || !canvasEl.value) return
  const c = canvasEl.value, W = 720, H = 440
  c.width = W; c.height = H
  const ctx = c.getContext('2d')!
  const slug = data.value.patrol ? 'omada' : (data.value.section?.nameEl === 'Κοινότητα Ανιχνευτών' ? 'koinotita' : 'omada')
  const [c1, c2] = GRAD[slug] || GRAD.omada

  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, c1); grad.addColorStop(1, c2)
  ctx.fillStyle = grad
  roundRect(ctx, 0, 0, W, H, 28); ctx.fill()

  try {
    const logo = await loadImg('/images/logo-256.png')
    ctx.save()
    ctx.beginPath(); ctx.arc(W - 96, 96, 58, 0, Math.PI * 2); ctx.clip()
    ctx.drawImage(logo, W - 154, 38, 116, 116)
    ctx.restore()
  } catch {}

  ctx.fillStyle = '#fff'
  ctx.font = '600 15px Commissioner, sans-serif'
  ctx.fillText(t('troopName').split(' ').slice(0, 3).join(' '), 44, 56)
  ctx.font = '700 40px Commissioner, sans-serif'
  ctx.fillText(name(data.value), 44, 190)
  ctx.font = '500 20px Commissioner, sans-serif'
  ctx.globalAlpha = .88
  const roleLine = data.value.patrol ? `${lx(data.value.patrol, 'name')}` : lx(data.value.section, 'name')
  ctx.fillText(roleLine, 44, 224)
  ctx.globalAlpha = 1

  ctx.font = '600 13px Commissioner, sans-serif'
  ctx.globalAlpha = .7
  ctx.fillText(t('idNumber').toUpperCase(), 44, 340)
  ctx.globalAlpha = 1
  ctx.font = '700 30px "Courier New", monospace'
  ctx.fillText(data.value.idNumber || '—', 44, 378)

  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(44, 400); ctx.lineTo(W - 44, 400); ctx.stroke()
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
function download() {
  if (!canvasEl.value) return
  const a = document.createElement('a')
  a.href = canvasEl.value.toDataURL('image/png')
  a.download = `${name(data.value).replace(/\s+/g, '-')}-id-card.png`
  a.click()
}
onMounted(() => setTimeout(draw, 60))
watch(() => data.value, () => setTimeout(draw, 60))
</script>

<template>
  <AppShell v-if="data" :title="t('idCard')" :sub="name(data)" :back="`/admin/scouts/${id}`">
    <canvas ref="canvasEl" style="width:100%;border-radius:22px;box-shadow:var(--shadow)" />
    <button class="btn" @click="download">{{ t('downloadIdCard') }}</button>
    <div class="note"><b>💳 Apple / Google Wallet</b>{{ t('walletNote') }}</div>
  </AppShell>
</template>
