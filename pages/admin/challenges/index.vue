<script setup lang="ts">
import { buildImportPrompt } from '~/utils/importPrompt'
const { t } = useI18n()
const me = useMe()
const lx = useLx()
const { data, refresh } = await useFetch('/api/admin/challenges')
const { data: secs } = await useFetch<any>('/api/admin/contacts')   // sections in my scope
const { show } = useToast()

// ----- multi-select + bulk delete -----
const selecting = ref(false)
const picked = ref(new Set<number>())
function toggleSelect() {
  selecting.value = !selecting.value
  picked.value = new Set()
}
function togglePick(id: number) {
  const next = new Set(picked.value)
  next.has(id) ? next.delete(id) : next.add(id)
  picked.value = next
}
async function deletePicked() {
  const ids = [...picked.value]
  if (!ids.length) return
  if (!confirm(t('confirmDeleteSelected', { n: ids.length }))) return
  try {
    const res = await $fetch<any>('/api/admin/challenges/bulk-delete', { method: 'POST', body: { ids } })
    selecting.value = false; picked.value = new Set()
    await refresh(); show(`🗑️ ${res.deleted} ${t('deletedN')}`)
  } catch (e: any) { show(e?.data?.message || t('error')) }
}

// ----- bulk import -----
const importing = ref(false)
const showPrompt = ref(false)
const raw = ref('')
const busy = ref(false)
const result = ref<{ imported: number, skipped: number, errors: string[] } | null>(null)

// the leader fills these in, and the prompt is built from them live
const fields = reactive({ topics: '', count: 10, ageGroup: '', opensAt: '', spacing: '', sectionId: null as number | null, forLeaders: false })
const sectorLabel = computed(() => {
  if (fields.forLeaders) return t('vathmoforoi')
  const sec = (secs.value || []).find((x: any) => x.id === fields.sectionId)
  return sec ? lx(sec, 'name') : t('wholeTroop')
})
const prompt = computed(() => buildImportPrompt({ ...fields, sector: sectorLabel.value }))

function openImport() {
  importing.value = true; showPrompt.value = false
  raw.value = ''; result.value = null
}
async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(prompt.value)
    show('✅ ' + t('copied'))
  } catch { showPrompt.value = true }   // clipboard blocked — reveal it to copy by hand
}
async function runImport() {
  let parsed: any
  try { parsed = JSON.parse(raw.value) }
  catch { show(t('importBadJson')); return }
  busy.value = true
  try {
    const questions = Array.isArray(parsed) ? parsed : parsed?.questions
    result.value = await $fetch('/api/admin/challenges/import', {
      method: 'POST',
      body: { questions, sectionId: fields.forLeaders ? null : fields.sectionId, forLeaders: fields.forLeaders }
    })
    await refresh()
    show(`✅ ${result.value!.imported} ${t('importedN')}`)
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
const isTroop = computed(() => me.value?.role === 'troop_leader')
const groups = computed(() => {
  const rows = data.value || []
  return [
    { label: t('scheduled'), list: rows.filter((c: any) => c.state === 'scheduled' || c.state === 'draft') },
    { label: t('activeC'), list: rows.filter((c: any) => c.state === 'live') },
    { label: t('done'), list: rows.filter((c: any) => c.state === 'done') }
  ].filter(g => g.list.length)
})
const pill = (s: string) => s === 'live' ? ['live', t('live')] : s === 'scheduled' ? ['sched', t('scheduled')] : s === 'draft' ? ['draft', t('draft')] : null
function sub(c: any) {
  const label = c.forLeaders ? t('vathmoforoi') : (c.sectionEl ? lx(c, 'section') : t('wholeTroop'))
  const sector = isTroop.value ? label + ' · ' : ''
  if (c.state === 'scheduled') return sector + `${t('unlocks')} ${new Date(c.unlocksAt).toLocaleString('el-GR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
  if (c.state === 'draft') return sector + t('noDate')
  return sector + `${c.answered} ${t('answeredN')} · ${c.correct} ${t('correctN')}`
}
</script>

<template>
  <AppShell :title="isTroop ? t('challenges') : t('myChallenges')">
    <div v-if="(data?.length || 0) > 1" style="display:flex;justify-content:flex-end;gap:8px;align-items:center">
      <template v-if="selecting">
        <span class="tiny muted" style="flex:1">{{ picked.size }} {{ t('selectedN') }}</span>
        <button class="chip" :disabled="!picked.size" style="color:var(--danger)" @click="deletePicked">
          🗑️ {{ t('deleteSelected') }}
        </button>
        <button class="chip" @click="toggleSelect">{{ t('cancelSelect') }}</button>
      </template>
      <button v-else class="chip" @click="toggleSelect">☑︎ {{ t('selectMode') }}</button>
    </div>

    <div v-for="g in groups" :key="g.label" class="adm">
      <div class="hdr">{{ g.label }}</div>
      <template v-for="c in g.list" :key="c.id">
        <button v-if="selecting" class="it" @click="togglePick(c.id)">
          <span class="tick" :class="{ on: picked.has(c.id) }">{{ picked.has(c.id) ? '✓' : '' }}</span>
          <div style="flex:1"><b>#{{ c.id }} {{ lx(c) }}</b><span>{{ sub(c) }}</span></div>
        </button>
        <NuxtLink v-else :to="`/admin/challenges/${c.id}`" class="it">
          <div style="flex:1"><b>#{{ c.id }} {{ lx(c) }}</b><span>{{ sub(c) }}</span></div>
          <span v-if="pill(c.state)" class="pill" :class="pill(c.state)![0]">{{ pill(c.state)![1] }}</span>
          <span v-else class="chev">›</span>
        </NuxtLink>
      </template>
    </div>
    <div v-if="!groups.length" class="empty">{{ t('noChallenges') }}</div>

    <button class="import-link" @click="openImport">{{ t('importQuestions') }}</button>

    <NuxtLink to="/admin/challenges/new" class="fab" aria-label="new">+</NuxtLink>

    <Teleport to="body">
      <div v-if="importing" class="sheet-backdrop" @click.self="importing = false">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:88dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px">{{ t('importQuestions') }}</h3>

          <div class="sec-title" style="margin:0">{{ t('importStep1') }}</div>
          <div><label class="lab">{{ t('promptTopics') }}</label>
            <input v-model="fields.topics" class="in" :placeholder="t('promptTopicsPh')"></div>
          <div style="display:flex;gap:8px">
            <div style="flex:1"><label class="lab">{{ t('promptCount') }}</label>
              <input v-model.number="fields.count" type="number" min="1" max="200" class="in"></div>
            <div style="flex:2"><label class="lab">{{ t('promptOpens') }}</label>
              <input v-model="fields.opensAt" type="datetime-local" class="in"></div>
          </div>
          <div><label class="lab">{{ t('promptAge') }}</label>
            <input v-model="fields.ageGroup" class="in" :placeholder="t('promptAgePh')"></div>
          <div><label class="lab">{{ t('promptSpacing') }}</label>
            <input v-model="fields.spacing" class="in" :placeholder="t('promptSpacingPh')"></div>
          <div>
            <label class="lab">{{ t('promptSector') }}</label>
            <div class="chips">
              <button v-if="isTroop" class="chip" :class="{ on: fields.sectionId === null && !fields.forLeaders }"
                      @click="fields.sectionId = null; fields.forLeaders = false">{{ t('wholeTroop') }}</button>
              <button v-for="sec in secs" :key="sec.id" class="chip"
                      :class="{ on: fields.sectionId === sec.id && !fields.forLeaders }"
                      @click="fields.sectionId = sec.id; fields.forLeaders = false">{{ lx(sec, 'name') }}</button>
              <button v-if="isTroop" class="chip" :class="{ on: fields.forLeaders }"
                      @click="fields.forLeaders = true">{{ t('vathmoforoi') }}</button>
            </div>
          </div>

          <div style="display:flex;gap:8px">
            <button class="btn" style="flex:2" @click="copyPrompt">📋 {{ t('copyPrompt') }}</button>
            <button class="btn ghost" style="flex:1" @click="showPrompt = !showPrompt">
              {{ showPrompt ? t('hidePrompt') : t('showPrompt') }}
            </button>
          </div>
          <pre v-if="showPrompt" class="prompt">{{ prompt }}</pre>

          <div class="sec-title" style="margin:0">{{ t('importStep2') }}</div>
          <textarea v-model="raw" class="in" rows="7" :placeholder="t('importPaste')"
                    style="font-family:ui-monospace,monospace;font-size:11.5px" />
          <div v-if="result" class="note">
            <b>✅ {{ result.imported }} {{ t('importedN') }}</b>
            <template v-if="result.skipped">
              <span style="color:var(--danger)">{{ result.skipped }} {{ t('skippedN') }}</span>
              <ul style="margin:6px 0 0;padding-left:18px">
                <li v-for="(e, i) in result.errors" :key="i" class="tiny">{{ e }}</li>
              </ul>
            </template>
          </div>
          <button class="btn" :disabled="!raw.trim() || busy" @click="runImport">
            {{ busy ? t('loading') : t('importRun') }}
          </button>

          <button class="btn ghost" @click="importing = false">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.tick{
  width:22px;height:22px;flex:none;border-radius:7px;border:1.5px solid var(--line);
  display:grid;place-items:center;font-size:12px;font-weight:700;color:#fff;background:var(--card);
}
.tick.on{background:var(--accent);border-color:var(--accent)}
.import-link{
  align-self:center; background:none; border:0; padding:6px 10px;
  font-size:11.5px; color:var(--muted); text-decoration:underline;
}
.prompt{
  background:var(--card); border:1px solid var(--line); border-radius:14px;
  padding:12px; font-size:10.5px; line-height:1.5; white-space:pre-wrap;
  word-break:break-word; max-height:280px; overflow:auto; margin:0;
}
</style>
