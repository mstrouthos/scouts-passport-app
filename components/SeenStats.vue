<script setup lang="ts">
/* For the administrators alone: of the Βαθμοφόροι a poll or an event asks,
   who saw it and did not answer, and who never opened it — with 📲 for those
   a notification brought there. Opened on demand, so a long list of polls
   does not ask for every one. */
const props = defineProps<{ kind: 'poll' | 'event', id: number, startOpen?: boolean }>()
const { t, locale } = useI18n()
const open = ref(!!props.startOpen)
const data = ref<any>(null)
const busy = ref(false)
async function load() {
  busy.value = true
  try { data.value = await $fetch(`/api/admin/views/${props.kind}/${props.id}`) } catch {} finally { busy.value = false }
}
watch(open, v => { if (v && !data.value) load() }, { immediate: true })
const name = (p: any) => `${p.firstName} ${p.lastName}`.trim()
const when = (iso: string) => `${fmtDate(iso, locale.value)} · ${fmtTime(iso)}`
</script>

<template>
  <div class="seen">
    <button class="head" @click="open = !open">
      <span>👁 {{ t('seenTitle') }}</span>
      <span v-if="data" class="tiny muted">{{ t('seenSummary', { seen: data.seen, n: data.asked }) }}</span>
      <span class="chev" :style="open ? 'transform:rotate(90deg)' : ''">›</span>
    </button>
    <template v-if="open">
      <div v-if="busy && !data" class="tiny muted">{{ t('loading') }}</div>
      <template v-else-if="data">
        <div class="nums">
          <div><b>{{ data.answered.length }}</b><span>{{ t('seenAnswered') }}</span></div>
          <div class="warn"><b>{{ data.seenNoAnswer.length }}</b><span>{{ t('seenNoAnswer') }}</span></div>
          <div class="off"><b>{{ data.notSeen.length }}</b><span>{{ t('seenNever') }}</span></div>
        </div>
        <div v-if="data.seenNoAnswer.length" class="grp">
          <div class="lab">{{ t('seenNoAnswerList') }}</div>
          <div v-for="p in data.seenNoAnswer" :key="p.id" class="row">
            <span>{{ p.fromNotification ? '📲' : '👀' }} <b>{{ name(p) }}</b></span>
            <small>{{ when(p.lastAt || p.sawAt) }}</small>
          </div>
        </div>
        <div v-if="data.notSeen.length" class="grp">
          <div class="lab">{{ t('seenNeverList') }}</div>
          <div class="names">{{ data.notSeen.map((p: any) => name(p) + (p.notified ? '' : ' 🔕')).join(', ') }}</div>
        </div>
        <div class="tiny muted">📲 {{ t('seenLegendPush') }} · 👀 {{ t('seenLegendPage') }} · 🔕 {{ t('seenLegendNoNote') }}</div>
        <div class="tiny muted">🔒 {{ t('seenAdminsOnly') }}</div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.seen{display:flex; flex-direction:column; gap:10px; border-top:1px dashed var(--line); padding-top:10px}
.head{display:flex; align-items:center; gap:8px; background:none; border:0; padding:0; font:inherit; font-size:13px; font-weight:700; color:var(--ink); cursor:pointer; text-align:left}
.head > span:first-child{flex:1}
.nums{display:grid; grid-template-columns:repeat(3,1fr); gap:6px}
.nums > div{display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 4px; border-radius:12px; background:#E2F5EA; color:#1F7A47}
.nums > div.warn{background:#FFF3DC; color:#8E5B00}
.nums > div.off{background:#EEF2F6; color:#5B6B80}
.nums b{font-size:20px; line-height:1}
.nums span{font-size:10.5px; font-weight:700; text-align:center}
.grp{display:flex; flex-direction:column; gap:5px}
.lab{font-size:11px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; color:var(--muted)}
.row{display:flex; justify-content:space-between; gap:8px; font-size:13px}
.row small{color:var(--muted); flex:none}
.names{font-size:13px; line-height:1.5}
</style>
