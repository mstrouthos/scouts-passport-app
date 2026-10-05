<script setup lang="ts">
/* The upload box of a form question: photos and PDFs, a few at a time. Each
   goes up the moment it is chosen — a photo first made smaller and turned
   into a JPEG on the phone, whatever the camera took — and comes back as a
   token the form's answer holds. */
import { FILE_MAX_COUNT, FILE_MAX_BYTES } from '~/utils/formSpec'
type Up = { token: string, name: string, mime: string, size: number }
const props = defineProps<{ slug: string, questionId: string, modelValue: Up[], invalid?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [Up[]] }>()
const { t } = useI18n()
const input = ref<HTMLInputElement | null>(null)
const busy = ref(0)
const err = ref('')

async function toJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const k = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * k)
    c.height = Math.round(img.naturalHeight * k)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return await new Promise<Blob>((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('jpeg')), 'image/jpeg', 0.85))
  } finally { URL.revokeObjectURL(url) }
}
const base64 = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(String(r.result).split(',')[1] || '')
  r.onerror = rej
  r.readAsDataURL(b)
})

async function pick(e: Event) {
  const files = [...((e.target as HTMLInputElement).files || [])]
  ;(e.target as HTMLInputElement).value = ''
  err.value = ''
  const room = FILE_MAX_COUNT - props.modelValue.length - busy.value
  if (files.length > room) err.value = t('formFileTooMany', { n: FILE_MAX_COUNT })
  for (const file of files.slice(0, Math.max(0, room))) {
    busy.value++
    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      let blob: Blob = file
      if (!isPdf) {
        try { blob = await toJpeg(file) } catch { throw friendlyError(t('formFileNotImage', { name: file.name })) }
      }
      if (blob.size > FILE_MAX_BYTES) throw friendlyError(t('formFileTooBig', { name: file.name }))
      const up = await $fetch<Up>(`/api/forms/public/${encodeURIComponent(props.slug)}/upload`, {
        method: 'POST',
        body: { questionId: props.questionId, name: file.name, mime: isPdf ? 'application/pdf' : 'image/jpeg', dataBase64: await base64(blob) }
      })
      emit('update:modelValue', [...props.modelValue, up])
    } catch (e: any) {
      err.value = errMsg(e)
    } finally { busy.value-- }
  }
}
function remove(i: number) {
  const list = [...props.modelValue]
  list.splice(i, 1)
  emit('update:modelValue', list)
}
const kb = (n: number) => n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'
</script>

<template>
  <div class="fup" :class="{ invalid }">
    <div v-for="(f, i) in modelValue" :key="f.token" class="file">
      <span class="ic">{{ f.mime === 'application/pdf' ? '📄' : '🖼️' }}</span>
      <span class="nm">{{ f.name }}<small>{{ kb(f.size) }}</small></span>
      <button type="button" class="x" :aria-label="t('delete')" @click="remove(i)">✕</button>
    </div>
    <div v-for="n in busy" :key="'b' + n" class="file busy"><span class="spin" /> {{ t('formFileUploading') }}</div>
    <button v-if="modelValue.length + busy < FILE_MAX_COUNT" type="button" class="add" @click="input?.click()">
      📎 {{ modelValue.length ? t('formFileAddMore') : t('formFileAdd') }}
    </button>
    <input ref="input" type="file" accept="image/*,application/pdf" multiple hidden @change="pick">
    <div class="hint">{{ t('formFileHint', { n: FILE_MAX_COUNT }) }}</div>
    <div v-if="err" class="err">{{ err }}</div>
  </div>
</template>

<style scoped>
.fup{display:flex; flex-direction:column; gap:7px}
.file{display:flex; align-items:center; gap:10px; border:1.5px solid var(--line); border-radius:12px; padding:9px 11px; background:#fff; font-size:13.5px}
.file .nm{flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600}
.file small{margin-left:8px; color:var(--muted); font-weight:400; font-size:11.5px}
.file .x{flex:none; border:0; background:var(--hair); border-radius:999px; width:28px; height:28px; color:var(--muted)}
.file.busy{color:var(--muted); font-size:13px}
.spin{width:16px; height:16px; border:2px solid var(--line); border-top-color:var(--accent); border-radius:50%; animation:sp .8s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.add{border:1.5px dashed #C6D4E4; background:#fff; border-radius:12px; padding:13px; font:inherit; font-size:14px; font-weight:650; color:var(--accent-deep)}
.invalid .add{border-color:var(--danger)}
.hint{font-size:11.5px; color:var(--muted)}
.err{font-size:12px; color:var(--danger); font-weight:600}
</style>
