<script setup lang="ts">
/* Photo missions, the Βαθμοφόροι's side: the photos waiting to be checked —
   approve and the points are given, or say why not and the member may send
   another — and the missions themselves, to set, change or take away. */
const { t, locale } = useI18n()
const { show } = useToast()
const route = useRoute()
const { data, refresh } = await useFetch<any>('/api/admin/missions')
const tab = ref<'queue' | 'missions'>(route.query.tab === 'missions' ? 'missions' : 'queue')
watchEffect(() => { if (data.value && !data.value.queue.length && route.query.tab !== 'queue') tab.value = 'missions' })

/* checking a photo */
const rejecting = ref<number | null>(null)
const reason = ref('')
const busy = ref(false)
async function review(sub: any, approve: boolean) {
  if (busy.value) return
  if (!approve && !reason.value.trim()) { show(t('missionWhyNot')); return }
  busy.value = true
  try {
    await $fetch(`/api/admin/missions/submissions/${sub.id}`, { method: 'POST', body: { approve, note: approve ? '' : reason.value } })
    show(approve ? `✅ +${sub.points} ${t('pts')} · ${sub.name}` : '↩️ ' + t('missionReturned'))
    rejecting.value = null; reason.value = ''
    await refresh()
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}
const zoom = ref('')

/* setting a mission */
const EMOJIS = ['📸', '🪢', '🌳', '🧭', '🔥', '⛺', '🌿', '🦉', '🍳', '🧹', '🤝', '🗺️']
const editing = ref<any>(null)
const toLocal = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function newMission() {
  editing.value = { id: null, emoji: '📸', titleEl: '', descriptionEl: '', points: 10, sectionId: data.value?.allSections ? '' : (data.value?.sections?.[0]?.id ?? ''), closesAt: '', isPublished: true }
}
function edit(m: any) { editing.value = { ...m, sectionId: m.sectionId ?? '', closesAt: toLocal(m.closesAt) } }
async function saveMission() {
  const m = editing.value
  if (!m.titleEl.trim() || busy.value) return
  busy.value = true
  try {
    const body = { ...m, sectionId: m.sectionId || null, closesAt: m.closesAt ? new Date(m.closesAt).toISOString() : null }
    if (m.id) await $fetch(`/api/admin/missions/${m.id}`, { method: 'PATCH', body })
    else await $fetch('/api/admin/missions', { method: 'POST', body })
    show('✅ ' + t('saved'))
    editing.value = null
    await refresh()
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}
async function removeMission() {
  const m = editing.value
  if (!m?.id || !confirm(t('missionDeleteQ'))) return
  try {
    await $fetch(`/api/admin/missions/${m.id}`, { method: 'DELETE' })
    editing.value = null
    await refresh()
  } catch (e: any) { show(errMsg(e)) }
}
</script>

<template>
  <AppShell :title="t('missions')" :sub="t('missionsAdminSub')" back="/admin/more">
    <div class="seg">
      <button :class="{ on: tab === 'queue' }" @click="tab = 'queue'">{{ t('missionQueue') }}<template v-if="data?.queue?.length"> ({{ data.queue.length }})</template></button>
      <button :class="{ on: tab === 'missions' }" @click="tab = 'missions'">{{ t('missions') }}</button>
    </div>

    <template v-if="tab === 'queue'">
      <div v-if="!data?.queue?.length" class="empty">✨ {{ t('missionQueueEmpty') }}</div>
      <div v-for="q in data?.queue" :key="q.id" class="card qcard">
        <div class="qhead">
          <div class="memoji">{{ q.emoji }}</div>
          <div class="qtxt"><b>{{ q.name }}</b><span>{{ q.mission }} · +{{ q.points }} {{ t('pts') }}</span></div>
          <span class="tiny muted">{{ fmtDate(q.createdAt, locale) }}</span>
        </div>
        <img :src="q.photo" alt="" class="qphoto" @click="zoom = q.photo">
        <div v-if="q.note" class="qnote">💬 {{ q.note }}</div>
        <template v-if="rejecting === q.id">
          <textarea v-model="reason" class="in" rows="2" maxlength="500" :placeholder="t('missionWhyNotPh')" />
          <div class="qbtns">
            <button class="btn ghost" @click="rejecting = null">{{ t('cancelSelect') }}</button>
            <button class="btn danger" :disabled="busy || !reason.trim()" @click="review(q, false)">↩️ {{ t('missionReturn') }}</button>
          </div>
        </template>
        <div v-else class="qbtns">
          <button class="btn ghost" @click="rejecting = q.id; reason = ''">↩️ {{ t('missionNotYet') }}</button>
          <button class="btn" :disabled="busy" @click="review(q, true)">✅ {{ t('missionApprove') }}</button>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="!data?.missions?.length" class="empty">{{ t('missionsNoneAdmin') }}</div>
      <div v-else class="adm">
        <button v-for="m in data.missions" :key="m.id" class="it" @click="edit(m)">
          <span style="font-size:22px">{{ m.emoji }}</span>
          <div style="flex:1;min-width:0">
            <b>{{ m.titleEl }}</b>
            <span>+{{ m.points }} · {{ m.section || t('allSectors') }} · ✅ {{ m.approved }}<template v-if="m.pending"> · ⏳ {{ m.pending }}</template></span>
          </div>
          <span class="pill" :class="m.open ? 'ok' : 'draft'">{{ m.open ? t('formOpen') : t('formClosedShort') }}</span>
          <span class="chev">›</span>
        </button>
      </div>
      <button class="fab" :aria-label="t('missionNew')" @click="newMission">+</button>
    </template>

    <Teleport to="body">
      <div v-if="zoom" class="sheet-backdrop" style="display:grid;place-items:center;padding:16px" @click="zoom = ''">
        <img :src="zoom" alt="" style="max-width:100%;max-height:90dvh;border-radius:16px">
      </div>
      <div v-if="editing" class="sheet-backdrop" @click.self="editing = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:90dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ editing.id ? t('missionEdit') : t('missionNew') }}</h3>
          <div class="emojis">
            <button v-for="e in EMOJIS" :key="e" type="button" :class="{ on: editing.emoji === e }" @click="editing.emoji = e">{{ e }}</button>
          </div>
          <div><label class="lab">{{ t('missionTitle') }}</label><input v-model="editing.titleEl" class="in" maxlength="200" :placeholder="t('missionTitlePh')"></div>
          <div><label class="lab">{{ t('missionDesc') }}</label><textarea v-model="editing.descriptionEl" class="in" rows="4" :placeholder="t('missionDescPh')" /></div>
          <div style="display:flex;gap:8px">
            <div style="flex:1"><label class="lab">{{ t('pts') }}</label><input v-model.number="editing.points" class="in" type="number" min="0" max="500"></div>
            <div style="flex:2"><label class="lab">{{ t('missionFor') }}</label>
              <select v-model="editing.sectionId" class="in">
                <option v-if="data?.allSections" value="">{{ t('allSectors') }}</option>
                <option v-for="s in data?.sections" :key="s.id" :value="s.id">{{ s.nameEl }}</option>
              </select>
            </div>
          </div>
          <div><label class="lab">{{ t('missionCloses') }}</label><input v-model="editing.closesAt" class="in" type="datetime-local"></div>
          <label class="tog"><input v-model="editing.isPublished" type="checkbox"> {{ t('missionPublished') }}</label>
          <button class="btn" :disabled="busy || !editing.titleEl.trim()" @click="saveMission">{{ t('save') }}</button>
          <button v-if="editing.id" class="btn danger" @click="removeMission">🗑 {{ t('delete') }}</button>
          <button class="btn ghost" @click="editing = null">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.qcard{display:flex; flex-direction:column; gap:10px; padding:14px}
.qhead{display:flex; align-items:center; gap:10px}
.memoji{width:40px; height:40px; border-radius:12px; background:#FFF1E0; display:grid; place-items:center; font-size:22px; flex:none}
.qtxt{flex:1; min-width:0; display:flex; flex-direction:column}
.qtxt b{font-size:14.5px}
.qtxt span{font-size:12px; color:var(--muted)}
.qphoto{width:100%; max-height:52dvh; object-fit:contain; background:#0F1626; border-radius:14px; cursor:zoom-in}
.qnote{font-size:13.5px; background:#F4F7FB; border-radius:12px; padding:8px 10px}
.qbtns{display:flex; gap:8px}
.qbtns .btn{flex:1}
.emojis{display:flex; flex-wrap:wrap; gap:6px; justify-content:center}
.emojis button{width:40px; height:40px; border-radius:12px; border:2px solid var(--line); background:#fff; font-size:20px}
.emojis button.on{border-color:var(--accent); background:var(--accent-soft)}
.tog{display:flex; align-items:center; gap:8px; font-size:14px}
.tog input{width:18px; height:18px; accent-color:var(--accent)}
</style>
