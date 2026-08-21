<script setup lang="ts">
import { IMPORT_PROMPT_EL, IMPORT_PROMPT_EN } from '~/utils/importPrompt'
const { t } = useI18n()
const me = useMe()
const lx = useLx()
const { data, refresh } = await useFetch('/api/admin/challenges')
const { show } = useToast()

// ----- bulk import -----
const importing = ref(false)
const showPrompt = ref(false)
const raw = ref('')
const busy = ref(false)
const result = ref<{ imported: number, skipped: number, errors: string[] } | null>(null)

function openImport() {
  importing.value = true; showPrompt.value = false
  raw.value = ''; result.value = null
}
async function copyPrompt(which: 'el' | 'en') {
  try {
    await navigator.clipboard.writeText(which === 'el' ? IMPORT_PROMPT_EL : IMPORT_PROMPT_EN)
    show('✅ ' + t('copied'))
  } catch { /* clipboard blocked — the text is on screen to copy by hand */ }
}
async function runImport() {
  let parsed: any
  try { parsed = JSON.parse(raw.value) }
  catch { show(t('importBadJson')); return }
  busy.value = true
  try {
    result.value = await $fetch('/api/admin/challenges/import', { method: 'POST', body: parsed })
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
    <div v-for="g in groups" :key="g.label" class="adm">
      <div class="hdr">{{ g.label }}</div>
      <NuxtLink v-for="c in g.list" :key="c.id" :to="`/admin/challenges/${c.id}`" class="it">
        <div style="flex:1"><b>#{{ c.id }} {{ lx(c) }}</b><span>{{ sub(c) }}</span></div>
        <span v-if="pill(c.state)" class="pill" :class="pill(c.state)![0]">{{ pill(c.state)![1] }}</span>
        <span v-else class="chev">›</span>
      </NuxtLink>
    </div>
    <div v-if="!groups.length" class="empty">{{ t('noChallenges') }}</div>

    <button class="srow" @click="openImport">
      <div class="ico">📥</div>
      <div class="txt"><b>{{ t('importQuestions') }}</b><span>{{ t('importSub') }}</span></div>
      <span class="chev">›</span>
    </button>

    <NuxtLink to="/admin/challenges/new" class="fab" aria-label="new">+</NuxtLink>

    <Teleport to="body">
      <div v-if="importing" class="sheet-backdrop" @click.self="importing = false">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:88dvh;overflow:auto">
          <div style="display:flex;align-items:center;gap:8px">
            <h3 style="margin:0;font-size:17px;flex:1">{{ t('importQuestions') }}</h3>
            <button class="chip" :aria-label="t('importHowTo')" @click="showPrompt = !showPrompt">
              {{ showPrompt ? '✕' : 'ℹ️' }}
            </button>
          </div>

          <template v-if="showPrompt">
            <div class="note"><b>{{ t('importPromptTitle') }}</b>{{ t('importPromptHelp') }}</div>
            <div style="display:flex;gap:8px">
              <button class="btn ghost" style="flex:1" @click="copyPrompt('el')">🇬🇷 {{ t('copyPrompt') }}</button>
              <button class="btn ghost" style="flex:1" @click="copyPrompt('en')">🇬🇧 {{ t('copyPrompt') }}</button>
            </div>
            <pre class="prompt">{{ IMPORT_PROMPT_EL }}</pre>
            <pre class="prompt">{{ IMPORT_PROMPT_EN }}</pre>
          </template>

          <template v-else>
            <textarea v-model="raw" class="in" rows="10" :placeholder="t('importPaste')" style="font-family:ui-monospace,monospace;font-size:11.5px" />
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
          </template>

          <button class="btn ghost" @click="importing = false">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.prompt{
  background:var(--card); border:1px solid var(--line); border-radius:14px;
  padding:12px; font-size:10.5px; line-height:1.5; white-space:pre-wrap;
  word-break:break-word; max-height:280px; overflow:auto; margin:0;
}
</style>
