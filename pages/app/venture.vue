<script setup lang="ts">
/* Η.Κ.Α.Δ.Ε. — the Κοινότητα's own booklet. Read-only for the Ανιχνευτής:
   what each award asks, what they chose, what they wrote, and when the
   Α.Κ.Α. signed it off. */
const { t, locale } = useI18n()
const { data, refresh } = await useFetch<any>('/api/venture')
const { show } = useToast()
const openAward = ref<string | null>(null)
const detail = ref<any>(null)
const openLog = ref<string | null>(null)

const awards = computed<any[]>(() => data.value?.awards || [])
const pct = (a: any) => a.total ? Math.round((a.earned / a.total) * 100) : 0
/* Δημοκρατίας follows Τελειοποιήσεως, which follows admission. */
function locked(i: number) { return i > 0 && !awards.value[i - 1]?.complete }

/* The logbooks are the Ανιχνευτής's own pages to fill in — the Α.Κ.Α. signs
   requirements, but the record of what you did is yours. */
const busy = ref(false)
const logForm = reactive({ datesEl: '', formEl: '', placeEl: '', oeEl: '' })
async function addLog(kind: string) {
  if (!logForm.formEl.trim() || busy.value) return
  busy.value = true
  try {
    await $fetch('/api/venture/log', { method: 'POST', body: { kind, ...logForm } })
    Object.assign(logForm, { datesEl: '', formEl: '', placeEl: '', oeEl: '' })
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
async function removeLog(logId: number) {
  if (!confirm(t('confirmDeleteLog'))) return
  try {
    await $fetch('/api/venture/log', { method: 'POST', body: { remove: true, logId } })
    await refresh()
  } catch (e: any) { show(e?.data?.message || t('error')) }
}

const route = useRoute(); const router = useRouter()
const party = ref<any>(null)
watch(() => route.query.req, (raw) => {
  const id = Number(raw)
  if (!Number.isInteger(id)) return
  for (const a of awards.value) {
    const it = a.items.find((x: any) => x.id === id)
    if (!it) continue
    openAward.value = a.slug; detail.value = { ...it, award: a }; party.value = { ...it, award: a }
    break
  }
  router.replace({ query: {} })
}, { immediate: true })
</script>

<template>
  <AppShell :title="t('ventureBook')" :sub="t('ventureBookSub')" back="/app">
    <div v-if="data" class="hero-card">
      <div class="big">{{ data.earned }}<span>/{{ data.total }}</span></div>
      <div class="lbl">{{ t('requirementsDone') }}</div>
      <div class="bar"><i :style="{ width: (data.total ? (data.earned / data.total) * 100 : 0) + '%' }" /></div>
    </div>

    <div v-for="(a, i) in awards" :key="a.slug" class="stage">
      <button class="tile" :class="{ done: a.complete, locked: locked(i) }" :style="{ '--tone': a.colour }"
              @click="locked(i) ? null : (openAward = openAward === a.slug ? null : a.slug)">
        <span class="badge">{{ locked(i) ? '🔒' : a.emoji }}</span>
        <span class="txt">
          <b>{{ a.titleEl }}</b>
          <span>{{ a.earned }}/{{ a.total }} · {{ a.subEl }}</span>
        </span>
        <span class="ring" :style="{ '--p': pct(a) }"><i>{{ a.complete ? '★' : pct(a) + '%' }}</i></span>
      </button>

      <div v-if="openAward === a.slug" class="items">
        <div v-for="g in a.groups" :key="g.key" class="note tiny">
          {{ t('chooseAtLeast', { n: g.min, total: g.total }) }} — {{ g.done }}/{{ g.min }}
        </div>
        <button v-for="it in a.items" :key="it.id" class="item" :class="{ got: it.completedOn }"
                @click="detail = { ...it, award: a }">
          <span class="n">{{ it.code }}</span>
          <span class="body">
            <b>{{ it.areaEl }}</b>
            <span>{{ it.textEl }}</span>
            <em v-if="it.completedOn">✓ {{ fmtDate(it.completedOn, locale) }}</em>
          </span>
        </button>
        <div v-for="m in a.milestones" :key="m.key" class="milestone" :class="{ set: m.onDate }">
          <span>{{ m.labelEl }}</span>
          <b>{{ m.onDate ? fmtDate(m.onDate, locale) : '—' }}</b>
        </div>
      </div>
    </div>

    <div class="sec-title">{{ t('ventureLogs') }}</div>
    <div v-for="l in data?.logs || []" :key="l.kind" class="catgroup">
      <button class="cathead" @click="openLog = openLog === l.kind ? null : l.kind">
        <span class="cemoji">{{ l.emoji }}</span>
        <span class="clbl">{{ l.titleEl }}</span>
        <span class="cn">{{ l.entries.length }}</span>
        <span class="chev">{{ openLog === l.kind ? '⌄' : '›' }}</span>
      </button>
      <div v-if="openLog === l.kind" class="logwrap">
        <div v-if="l.entries.length" class="adm">
          <div v-for="(e, n) in l.entries" :key="e.id" class="it">
            <div class="n">{{ n + 1 }}</div>
            <div style="flex:1;min-width:0">
              <b>{{ e.formEl || '—' }}</b>
              <span>{{ [e.datesEl, e.placeEl, e.oeEl].filter(Boolean).join(' · ') }}</span>
            </div>
            <button class="chip" @click="removeLog(e.id)">🗑️</button>
          </div>
        </div>
        <div v-else class="empty">{{ l.hintEl }}</div>

        <div class="logform">
          <div style="display:flex;gap:8px">
            <div style="flex:1"><label class="lab">{{ t('logDates') }}</label><input v-model="logForm.datesEl" class="in"></div>
            <div style="flex:1"><label class="lab">{{ t('logPlace') }}</label><input v-model="logForm.placeEl" class="in"></div>
          </div>
          <div><label class="lab">{{ t('logForm') }}</label><input v-model="logForm.formEl" class="in"></div>
          <div><label class="lab">{{ t('logOe') }}</label><input v-model="logForm.oeEl" class="in"></div>
          <button class="btn" :disabled="!logForm.formEl.trim() || busy" @click="addLog(l.kind)">
            + {{ t('addLogEntry') }}
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Celebration v-if="party" :emoji="party.award.emoji" :title="party.areaEl"
                   :subtitle="t('requirementDone')" @close="party = null" />
      <div v-if="detail" class="sheet-backdrop" @click.self="detail = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:88dvh;overflow:auto">
          <div style="text-align:center;font-size:34px">{{ detail.award.emoji }}</div>
          <div class="tiny muted" style="text-align:center">{{ detail.award.titleEl }} · {{ detail.code }}</div>
          <h3 style="margin:0;font-size:16px;text-align:center">{{ detail.areaEl }}</h3>
          <p style="font-size:13.5px;line-height:1.6;margin:0">{{ detail.textEl }}</p>
          <ul v-if="detail.bulletsEl?.length" class="blist">
            <li v-for="(b, i) in detail.bulletsEl" :key="i">{{ b }}</li>
          </ul>
          <template v-if="detail.optionsEl?.length">
            <div class="tiny muted">{{ t('chooseOne') }}</div>
            <ul class="blist">
              <li v-for="(o, i) in detail.optionsEl" :key="i" :class="{ picked: detail.chosenEl === o }">{{ o }}</li>
            </ul>
          </template>
          <div v-if="detail.noteEl" class="note"><b>✍️ {{ t('myAccount') }}</b>{{ detail.noteEl }}</div>
          <div v-if="detail.completedOn" class="verdict good">
            <b>{{ t('completedOn') }}</b><span> {{ fmtDate(detail.completedOn, locale) }}</span>
          </div>
          <div v-else class="tiny muted" style="text-align:center">{{ t('awardedByArchigos') }}</div>
          <button class="btn ghost" @click="detail = null">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.hero-card{background:var(--card); border-radius:var(--r-card); box-shadow:var(--shadow); padding:16px; text-align:center}
.hero-card .big{font-size:30px; font-weight:800; line-height:1}
.hero-card .big span{font-size:16px; color:var(--muted); font-weight:600}
.hero-card .lbl{font-size:12px; color:var(--muted); margin-top:2px}
.hero-card .bar{height:9px; border-radius:5px; background:#EEF2F6; margin-top:11px; overflow:hidden}
.hero-card .bar i{display:block; height:100%; border-radius:5px; background:var(--accent); transition:width .4s}

.stage{display:flex; flex-direction:column; gap:9px}
.tile{
  display:flex; align-items:center; gap:13px; text-align:left; width:100%;
  background:var(--card); border-radius:18px; padding:13px 15px;
  box-shadow:0 5px 0 rgba(0,0,0,.12); border:3px solid var(--tone);
}
.tile .badge{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-size:24px;background:var(--tone);flex:none}
.tile .txt{flex:1;min-width:0;display:flex;flex-direction:column}
.tile .txt b{font-size:14.5px}
.tile .txt span{font-size:11.5px;color:var(--muted)}
.tile.done{background:linear-gradient(180deg,#F2FBF5,#fff)}
.tile.locked{opacity:.55}
.tile .ring{
  flex:none; width:44px; height:44px; border-radius:50%;
  background:conic-gradient(var(--tone) calc(var(--p) * 1%), #EEF2F6 0); display:grid; place-items:center;
}
.tile .ring i{width:34px;height:34px;border-radius:50%;background:var(--card);display:grid;place-items:center;font-style:normal;font-size:10.5px;font-weight:800}

.items{display:flex; flex-direction:column; gap:7px; padding-left:6px}
.item{display:flex; gap:10px; text-align:left; background:var(--card); border-radius:13px; padding:10px 12px; box-shadow:var(--shadow)}
.item .n{flex:none;min-width:28px;height:24px;padding:0 6px;border-radius:8px;background:#EEF2F6;display:grid;place-items:center;font-size:11px;font-weight:800;color:var(--muted)}
.item .body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.item .body b{font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}
.item .body > span{font-size:13px;line-height:1.45}
.item .body em{font-style:normal;font-size:11.5px;font-weight:700;color:var(--green)}
.item.got{background:linear-gradient(180deg,#F2FBF5,#fff)}
.item.got .n{background:var(--green); color:#fff}

.milestone{
  display:flex; justify-content:space-between; gap:10px; align-items:center;
  background:#EEF2F6; border-radius:11px; padding:9px 12px; font-size:12px; color:var(--muted);
}
.milestone.set{background:var(--accent-soft); color:var(--accent-deep)}
.milestone b{font-variant-numeric:tabular-nums}

.catgroup{display:flex; flex-direction:column}
.cathead{display:flex; align-items:center; gap:11px; width:100%; text-align:left; background:var(--card); border-radius:14px; padding:12px 14px; box-shadow:var(--shadow)}
.cathead .cemoji{font-size:19px}
.cathead .clbl{flex:1;min-width:0;font-size:13.5px;font-weight:650}
.cathead .cn{font-size:11px;font-weight:800;color:var(--muted);background:#EEF2F6;border-radius:999px;padding:2px 8px}
.cathead .chev{color:var(--muted)}
.logwrap{margin-top:8px;display:flex;flex-direction:column;gap:9px}
.logform{display:flex;flex-direction:column;gap:9px}
.logwrap .n{flex:none;width:24px;height:24px;border-radius:8px;background:#EEF2F6;display:grid;place-items:center;font-size:11px;font-weight:800;color:var(--muted)}

.blist{margin:0; padding-left:19px; display:flex; flex-direction:column; gap:6px}
.blist li{font-size:12.5px; line-height:1.5; color:#44536B}
.blist li.picked{font-weight:800; color:var(--accent-deep)}
</style>
