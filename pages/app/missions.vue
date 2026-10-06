<script setup lang="ts">
/* Photo missions: something to go and do, and a photo to show it. A
   Βαθμοφόρος checks each photo before its points are given; one not
   approved says why, and another may be sent. Only the member and their
   Βαθμοφόροι ever see the photos. */
const { t, locale } = useI18n()
const { show } = useToast()
const { data, refresh } = await useFetch<any[]>('/api/missions')
const open = computed(() => (data.value || []).filter(m => m.open && m.submission?.status !== 'approved'))
const done = computed(() => (data.value || []).filter(m => !open.value.includes(m)))

/* sending: pick or take a photo, see it, add a word, send */
const sending = ref<any>(null)
const file = ref<File | null>(null)
const preview = ref('')
const note = ref('')
const busy = ref(false)
const picker = ref<HTMLInputElement | null>(null)
function start(m: any) { sending.value = m; file.value = null; preview.value = ''; note.value = ''; nextTick(() => picker.value?.click()) }
function picked(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!f) return
  if (!f.type.startsWith('image/')) { show(t('missionOnlyPhoto')); return }
  file.value = f
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = URL.createObjectURL(f)
}
async function send() {
  if (!file.value || !sending.value || busy.value) return
  busy.value = true
  try {
    const jpeg = await photoToJpeg(file.value)
    await $fetch(`/api/missions/${sending.value.id}/submit`, {
      method: 'POST', body: { mime: 'image/jpeg', dataBase64: await blobToBase64(jpeg), note: note.value }
    })
    show('📸 ' + t('missionSent'))
    sending.value = null
    await refresh()
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}
const STATUS: Record<string, { icon: string, key: string }> = {
  pending: { icon: '⏳', key: 'missionPending' },
  approved: { icon: '✅', key: 'missionApproved' },
  rejected: { icon: '↩️', key: 'missionRejected' }
}
</script>

<template>
  <AppShell :title="t('missions')" :sub="t('missionsSub')" back="/app">
    <input ref="picker" type="file" accept="image/*" hidden @change="picked">

    <div v-if="!data?.length" class="empty">{{ t('missionsNone') }}</div>

    <div v-for="m in open" :key="m.id" class="mcard">
      <div class="mtop">
        <div class="memoji">{{ m.emoji }}</div>
        <div class="mtxt">
          <b>{{ m.titleEl }}</b>
          <span>+{{ m.points }} {{ t('pts') }}<template v-if="m.closesAt"> · {{ t('missionUntil', { d: fmtDate(m.closesAt, locale) }) }}</template></span>
        </div>
      </div>
      <p v-if="m.descriptionEl" class="mdesc">{{ m.descriptionEl }}</p>
      <div v-if="m.submission" class="mstate" :class="m.submission.status">
        <img :src="m.submission.photo" alt="">
        <div>
          <b>{{ STATUS[m.submission.status].icon }} {{ t(STATUS[m.submission.status].key) }}</b>
          <span v-if="m.submission.reviewNote">«{{ m.submission.reviewNote }}»</span>
        </div>
      </div>
      <button class="btn" @click="start(m)">📸 {{ m.submission ? t('missionSendNew') : t('missionSend') }}</button>
    </div>

    <template v-if="done.length">
      <div class="sec-title">{{ t('missionsDone') }}</div>
      <div v-for="m in done" :key="m.id" class="mcard small">
        <div class="mtop">
          <div class="memoji">{{ m.emoji }}</div>
          <div class="mtxt"><b>{{ m.titleEl }}</b>
            <span v-if="m.submission">{{ STATUS[m.submission.status].icon }} {{ t(STATUS[m.submission.status].key) }}<template v-if="m.submission.status === 'approved'"> · +{{ m.points }} {{ t('pts') }}</template></span>
          </div>
          <img v-if="m.submission" :src="m.submission.photo" alt="" class="thumb">
        </div>
      </div>
    </template>
    <div class="tiny muted" style="text-align:center">🔒 {{ t('missionPrivacy') }}</div>

    <Teleport to="body">
      <div v-if="sending" class="sheet-backdrop" @click.self="sending = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ sending.emoji }} {{ sending.titleEl }}</h3>
          <button v-if="!preview" class="pickbox" @click="picker?.click()">📷 <span>{{ t('missionPick') }}</span></button>
          <img v-else :src="preview" alt="" class="prev" @click="picker?.click()">
          <textarea v-model="note" class="in" rows="2" maxlength="500" :placeholder="t('missionNotePh')" />
          <button class="btn" :disabled="!file || busy" @click="send">{{ busy ? t('loading') : t('missionSendNow') }}</button>
          <button class="btn ghost" @click="sending = null">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.mcard{background:#fff; border-radius:20px; padding:14px; box-shadow:var(--shadow-sm, 0 2px 10px rgba(30,70,140,.08)); display:flex; flex-direction:column; gap:10px}
.mcard.small{padding:10px 12px}
.mtop{display:flex; align-items:center; gap:12px}
.memoji{width:46px; height:46px; border-radius:14px; background:#FFF1E0; display:grid; place-items:center; font-size:26px; flex:none}
.mtxt{flex:1; min-width:0; display:flex; flex-direction:column}
.mtxt b{font-size:15px}
.mtxt span{font-size:12.5px; color:var(--muted); font-weight:600}
.mdesc{margin:0; font-size:14px; line-height:1.55; color:#3D4B60; white-space:pre-line}
.mstate{display:flex; gap:10px; align-items:center; padding:8px; border-radius:14px; background:#F4F7FB}
.mstate.pending{background:#FFF7E3}
.mstate.rejected{background:#FCEBE7}
.mstate img{width:54px; height:54px; border-radius:10px; object-fit:cover; flex:none}
.mstate div{display:flex; flex-direction:column; font-size:13px}
.mstate span{color:#6F7F93; font-style:italic}
.thumb{width:44px; height:44px; border-radius:10px; object-fit:cover; flex:none}
.pickbox{border:2px dashed var(--line); border-radius:18px; background:#F7FAFD; padding:30px 10px; font-size:30px; display:flex; flex-direction:column; align-items:center; gap:6px; font-family:inherit}
.pickbox span{font-size:14px; font-weight:700; color:var(--accent-deep)}
.prev{width:100%; max-height:44dvh; object-fit:contain; border-radius:16px; background:#000}
</style>
