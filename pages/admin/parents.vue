<script setup lang="ts">
const { t, locale } = useI18n()
const lx = useLx()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/parents')
const { data: posts, refresh: refreshPosts } = await useFetch<any>('/api/admin/parent-posts')
const tab = ref<'people' | 'posts'>('people')

// ----- parents -----
const editing = ref<any>(null)
const busy = ref(false)
const issued = ref<{ id: number, passcode: string } | null>(null)
function openEdit(p: any) { issued.value = null; editing.value = { ...p } }
async function saveParent() {
  const p = editing.value
  busy.value = true
  try {
    await $fetch(`/api/admin/parents/${p.id}`, { method: 'PATCH', body: p })
    editing.value = null
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
async function removeParent() {
  if (!confirm(t('confirmDeleteParent'))) return
  try {
    await $fetch(`/api/admin/parents/${editing.value.id}`, { method: 'DELETE' })
    editing.value = null
    await refresh(); show('🗑️ ' + t('deleted'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
/** Issue a code and optionally deliver it by SMS or email. */
async function sendCode(via: 'sms' | 'email' | 'none') {
  const p = editing.value
  try {
    const res = await $fetch<any>(`/api/admin/parents/${p.id}/code`, { method: 'POST', body: { via } })
    issued.value = { id: p.id, passcode: res.passcode }
    await refresh()
    show(via === 'none' ? '🔑 ' + t('codeIssued')
      : res.sent ? '✅ ' + t('codeSent') : t('codeNotSent'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
const sectionName = (id: number) => (data.value?.sections || []).find((x: any) => x.id === id)?.nameEl ?? ''
/* Under a sector's heading, a parent's row names only the children in that sector. */
const kidsIn = (p: any, sectionId: number) =>
  (p.children || []).filter((k: any) => k.sectionId === sectionId).map((k: any) => k.name).join(', ')

// ----- announcements for parents -----
const composing = ref(false)
/* One composer for new and existing notices: `id` set means editing. `file`
   is undefined to keep the PDF as is, null to drop it, an object to replace. */
const post = reactive<any>({ id: null, sectionId: null, titleEl: '', bodyEl: '', file: undefined as any, fileName: '' })
function openPost() {
  Object.assign(post, { id: null, sectionId: data.value?.sections?.[0]?.id ?? null, titleEl: '', bodyEl: '', file: undefined, fileName: '' })
  composing.value = true
}
function openEditPost(p: any) {
  Object.assign(post, { id: p.id, sectionId: p.sectionId ?? null, titleEl: p.titleEl, bodyEl: p.bodyEl || '', file: undefined, fileName: p.file?.name || '' })
  composing.value = true
}
function dropPdf() { post.file = null; post.fileName = '' }
async function pickFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  if (f.type !== 'application/pdf') { show(t('pdfOnly')); return }
  const buf = await f.arrayBuffer()
  post.file = { name: f.name, mime: f.type, dataBase64: btoa(String.fromCharCode(...new Uint8Array(buf))) }
  post.fileName = f.name
}
async function savePost() {
  busy.value = true
  try {
    const body: any = { sectionId: post.sectionId, titleEl: post.titleEl, bodyEl: post.bodyEl }
    if (post.file !== undefined) body.file = post.file
    if (post.id) {
      await $fetch(`/api/admin/parent-posts/${post.id}`, { method: 'PATCH', body })
      show('✅ ' + t('saved'))
    } else {
      const res = await $fetch<any>('/api/admin/parent-posts', { method: 'POST', body })
      show(res.pushed ? `✅ ${t('saved')} · 🔔 ${res.pushed}` : '✅ ' + t('saved'))
    }
    composing.value = false
    await refreshPosts()
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
async function deletePost(id: number) {
  if (!confirm(t('confirmDeletePost'))) return
  try {
    await $fetch(`/api/admin/parent-posts/${id}`, { method: 'DELETE' })
    await refreshPosts(); show('🗑️ ' + t('deleted'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="t('parents')" :sub="t('parentsSub')" back="/admin/more">
    <div class="seg">
      <button :class="{ on: tab === 'people' }" @click="tab = 'people'">{{ t('parentsTab') }}</button>
      <button :class="{ on: tab === 'posts' }" @click="tab = 'posts'">{{ t('parentPosts') }}</button>
    </div>

    <template v-if="tab === 'people'">
      <template v-for="sec in data?.sections" :key="sec.id">
        <div class="sec-title">{{ lx(sec, 'name') }}</div>
        <div class="adm">
          <button v-for="p in data.parents.filter((x: any) => (x.sectionIds || [x.sectionId]).includes(sec.id))" :key="p.id"
                  class="it" @click="openEdit(p)">
            <div style="flex:1;min-width:0">
              <b>{{ p.name }}</b>
              <span>{{ kidsIn(p, sec.id) ? `👦 ${kidsIn(p, sec.id)}` : t('parentNoChild') }} · {{ p.email || p.phone }}</span>
            </div>
            <span class="pill" :class="p.hasCode ? 'ok' : 'draft'">{{ p.hasCode ? t('hasCode') : t('noCode') }}</span>
            <span class="chev">›</span>
          </button>
          <div v-if="!data.parents.some((x: any) => (x.sectionIds || [x.sectionId]).includes(sec.id))" class="tiny muted" style="padding:12px 15px">
            {{ t('noParentsYet') }}
          </div>
        </div>
      </template>
      <div class="tiny muted">{{ t('parentsAddedOnScout') }}</div>
    </template>

    <template v-else>
      <div v-if="posts?.length" class="adm">
        <button v-for="p in posts" :key="p.id" class="it" style="align-items:flex-start" @click="openEditPost(p)">
          <div style="flex:1;min-width:0">
            <b>{{ p.titleEl }}</b>
            <span>{{ p.sectionEl || t('wholeTroop') }} · {{ fmtDate(p.createdAt, locale) }}
              <template v-if="p.file"> · 📎 {{ p.file.name }}</template>
            </span>
          </div>
          <span class="chip" style="flex:none;color:var(--danger)" @click.stop="deletePost(p.id)">✕</span>
        </button>
      </div>
      <div v-else class="empty">{{ t('noParentPosts') }}</div>
      <button class="fab" :aria-label="t('newParentPost')" @click="openPost">+</button>
    </template>

    <Teleport to="body">
      <!-- parent -->
      <div v-if="editing" class="sheet-backdrop" @click.self="editing = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:88dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('editParent') }}</h3>
          <div><label class="lab">{{ t('parentName') }}</label><input v-model="editing.name" class="in"></div>
          <div><label class="lab">Email</label><input v-model="editing.email" class="in" type="email"></div>
          <div><label class="lab">{{ t('phone') }}</label><PhoneInput v-model="editing.phone" /></div>
          <div v-if="editing.scoutName" class="tiny muted">
            👦 {{ editing.scoutName }} · {{ sectionName(editing.sectionId) }}
          </div>
          <button class="btn" :disabled="!editing.name || busy" @click="saveParent">{{ busy ? t('loading') : t('save') }}</button>

          <template v-if="editing.id">
            <div class="sec-title" style="margin:0">{{ t('accessCode') }}</div>
            <div v-if="issued" class="note" style="text-align:center">
              <b>{{ t('passcodeIs') }} <span style="font-variant-numeric:tabular-nums">{{ issued.passcode }}</span></b>
              {{ t('writeItDown') }}
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn ghost" style="flex:1" :disabled="!editing.email" @click="sendCode('email')">✉️ Email</button>
              <button class="btn ghost" style="flex:1" :disabled="!editing.phone" @click="sendCode('sms')">📱 SMS</button>
            </div>
            <button class="btn ghost" @click="sendCode('none')">🔑 {{ t('justShowCode') }}</button>
            <div class="tiny muted">{{ t('codeNote') }}</div>
            <button class="btn danger" @click="removeParent">🗑️ {{ t('deleteParent') }}</button>
          </template>
          <button class="btn ghost" @click="editing = null">{{ t('close') }}</button>
        </div>
      </div>

      <!-- parents' announcement -->
      <div v-if="composing" class="sheet-backdrop" @click.self="composing = false">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:88dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ post.id ? t('editParentPost') : t('newParentPost') }}</h3>
          <div>
            <label class="lab">{{ t('sectionWord') }}</label>
            <div class="chips">
              <button class="chip" :class="{ on: post.sectionId === null }" @click="post.sectionId = null">{{ t('wholeTroop') }}</button>
              <button v-for="sec in data?.sections" :key="sec.id" class="chip"
                      :class="{ on: post.sectionId === sec.id }" @click="post.sectionId = sec.id">{{ lx(sec, 'name') }}</button>
            </div>
          </div>
          <div><label class="lab">{{ t('titleEl') }}</label><input v-model="post.titleEl" class="in"></div>
          <div><label class="lab">{{ t('message') }}</label><textarea v-model="post.bodyEl" class="in" rows="4" /></div>
          <div>
            <label class="lab">{{ t('attachPdf') }}</label>
            <input type="file" accept="application/pdf" class="in" @change="pickFile">
            <div v-if="post.fileName" class="tiny muted" style="margin-top:5px;display:flex;align-items:center;gap:8px">
              📎 {{ post.fileName }}
              <button class="chip" style="color:var(--danger)" @click="dropPdf">{{ t('removePdf') }}</button>
            </div>
          </div>
          <button class="btn" :disabled="!post.titleEl || (!post.bodyEl && !post.file && !post.fileName) || busy" @click="savePost">
            {{ busy ? t('loading') : t('save') }}
          </button>
          <button class="btn ghost" @click="composing = false">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>
