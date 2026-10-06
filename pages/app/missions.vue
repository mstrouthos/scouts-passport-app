<script setup lang="ts">
import { phoenixArt } from '~/utils/art'
/* Photo missions: something to go and do, and a photo to show it. A
   Βαθμοφόρος checks each photo before its points are given; one not
   approved says why, and another may be sent. Only the member and their
   Βαθμοφόροι ever see the photos. */
const { t, locale } = useI18n()
const { show } = useToast()
const { data, refresh } = await useFetch<any[]>('/api/missions')
const open = computed(() => (data.value || []).filter(m => m.open && m.submission?.status !== 'approved'))
const done = computed(() => (data.value || []).filter(m => !open.value.includes(m)))

/* sending: the app's own camera (never the gallery), then the photo with a
   word, then send. The camera is opened with a ticket the photo must carry. */
const sending = ref<any>(null)
const camera = ref(false)
const ticket = ref('')
const shot = ref<Blob | null>(null)
const preview = ref('')
const note = ref('')
const busy = ref(false)
async function start(m: any) {
  try {
    ticket.value = (await $fetch<{ ticket: string }>(`/api/missions/${m.id}/camera`, { method: 'POST' })).ticket
  } catch (e: any) { show(errMsg(e)); return }
  sending.value = m; shot.value = null; note.value = ''
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = ''
  camera.value = true
}
function onShot(b: Blob) {
  shot.value = b
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = URL.createObjectURL(b)
  camera.value = false
}
async function retake() {
  if (!sending.value) return
  try { ticket.value = (await $fetch<{ ticket: string }>(`/api/missions/${sending.value.id}/camera`, { method: 'POST' })).ticket } catch {}
  camera.value = true
}
function cancel() { camera.value = false; sending.value = null }
async function send() {
  if (!shot.value || !sending.value || busy.value) return
  busy.value = true
  try {
    await $fetch(`/api/missions/${sending.value.id}/submit`, {
      method: 'POST', body: { mime: 'image/jpeg', dataBase64: await blobToBase64(shot.value), note: note.value, ticket: ticket.value }
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

    <!-- the banner: a scout's kit on a table -->
    <img src="/images/art/scenes/missions.webp" alt="" class="banner-art">
    <div v-if="!data?.length" class="empty pempty"><img :src="phoenixArt('camera')" alt=""><span>{{ t('missionsNone') }}</span></div>

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
      <button class="btn" @click="start(m)">📷 {{ m.submission ? t('missionSendNew') : t('missionSend') }}</button>
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
      <MissionCamera v-if="camera && sending" :title="`${sending.emoji} ${sending.titleEl}`" @shot="onShot" @close="cancel" />
      <div v-if="sending && !camera && shot" class="sheet-backdrop" @click.self="sending = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ sending.emoji }} {{ sending.titleEl }}</h3>
          <img :src="preview" alt="" class="prev">
          <button class="btn ghost" @click="retake">↺ {{ t('camRetake') }}</button>
          <textarea v-model="note" class="in" rows="2" maxlength="500" :placeholder="t('missionNotePh')" />
          <button class="btn" :disabled="!shot || busy" @click="send">{{ busy ? t('loading') : t('missionSendNow') }}</button>
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
.prev{width:100%; max-height:44dvh; object-fit:contain; border-radius:16px; background:#000}
.banner-art{width:100%; aspect-ratio:16/7; object-fit:cover; border-radius:20px; display:block; box-shadow:var(--shadow-sm, 0 2px 10px rgba(30,70,140,.08))}
.pempty{display:flex; flex-direction:column; align-items:center; gap:6px}
.pempty img{width:140px; height:140px; object-fit:contain}
</style>
