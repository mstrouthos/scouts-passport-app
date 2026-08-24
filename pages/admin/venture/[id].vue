<script setup lang="ts">
/* The Α.Κ.Α.'s side of the Η.Κ.Α.Δ.Ε.: sign a requirement off with the date,
   the theme the Ανιχνευτής took and their own account of it, record the
   booklet's milestone dates, and keep the three logbooks. */
const { t, locale } = useI18n()
const { show } = useToast()
const route = useRoute()
const id = route.params.id
const { data, refresh } = await useFetch<any>(`/api/admin/scouts/${id}/venture`)
const openAward = ref<string | null>(null)
const openLog = ref<string | null>(null)
const detail = ref<any>(null)
const busy = ref(false)
const form = reactive({ when: '', chosen: '', note: '' })
const logForm = reactive({ kind: '', datesEl: '', formEl: '', placeEl: '', oeEl: '' })

const awards = computed<any[]>(() => data.value?.awards || [])
const pct = (a: any) => a.total ? Math.round((a.earned / a.total) * 100) : 0

function openDetail(it: any, a: any) {
  form.when = it.completedOn || new Date().toISOString().slice(0, 10)
  form.chosen = it.chosenEl || ''
  form.note = it.noteEl || ''
  detail.value = { ...it, award: a }
}
async function post(body: any, after?: () => void) {
  if (busy.value) return
  busy.value = true
  try {
    await $fetch(`/api/admin/scouts/${id}/venture`, { method: 'POST', body })
    await refresh(); after?.(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
async function sign(done: boolean) {
  await post({ requirementId: detail.value.id, completedOn: form.when, chosenEl: form.chosen, noteEl: form.note, done }, () => {
    const a = awards.value.find(x => x.slug === detail.value.award.slug)
    const fresh = a?.items.find((x: any) => x.id === detail.value.id)
    detail.value = fresh ? { ...fresh, award: a } : null
  })
}
const setMilestone = (key: string, onDate: string) => post({ action: 'milestone', key, onDate })
const clearMilestone = (key: string) => post({ action: 'milestone', key, clear: true })
async function addLog() {
  if (!logForm.formEl.trim()) return
  await post({ action: 'log', ...logForm }, () => {
    Object.assign(logForm, { datesEl: '', formEl: '', placeEl: '', oeEl: '' })
  })
}
const removeLog = (logId: number) => post({ action: 'log', remove: true, logId })
</script>

<template>
  <AppShell v-if="data" :title="t('ventureBook')"
            :sub="`${data.scout.firstName} ${data.scout.lastName} · ${data.earned}/${data.total}`"
            :back="`/admin/scouts/${id}`">
    <div v-if="!data.canSign" class="note">{{ t('onlyArchigosAwards') }}</div>

    <div class="hero-card">
      <div class="big">{{ data.earned }}<span>/{{ data.total }}</span></div>
      <div class="lbl">{{ t('requirementsDone') }}</div>
      <div class="bar"><i :style="{ width: (data.total ? (data.earned / data.total) * 100 : 0) + '%' }" /></div>
    </div>

    <div v-for="a in awards" :key="a.slug" class="stage">
      <button class="tile" :class="{ done: a.complete }" :style="{ '--tone': a.colour }"
              @click="openAward = openAward === a.slug ? null : a.slug">
        <span class="badge">{{ a.emoji }}</span>
        <span class="txt"><b>{{ a.titleEl }}</b><span>{{ a.earned }}/{{ a.total }} · {{ pct(a) }}%</span></span>
        <span class="ring" :style="{ '--p': pct(a) }"><i>{{ a.complete ? '★' : pct(a) + '%' }}</i></span>
      </button>

      <div v-if="openAward === a.slug" class="items">
        <div v-for="g in a.groups" :key="g.key" class="note tiny">
          {{ t('chooseAtLeast', { n: g.min, total: g.total }) }} — {{ g.done }}/{{ g.min }}
        </div>
        <button v-for="it in a.items" :key="it.id" class="item" :class="{ got: it.completedOn }"
                @click="openDetail(it, a)">
          <span class="n">{{ it.code }}</span>
          <span class="body">
            <b>{{ it.areaEl }}</b>
            <span>{{ it.textEl }}</span>
            <em v-if="it.completedOn">✓ {{ fmtDate(it.completedOn, locale) }}</em>
          </span>
        </button>

        <div v-for="m in a.milestones" :key="m.key" class="mrow">
          <div style="flex:1;min-width:0">
            <div class="tiny muted">{{ m.labelEl }}</div>
            <b v-if="m.onDate" style="font-size:13px">{{ fmtDate(m.onDate, locale) }}</b>
          </div>
          <template v-if="data.canSign">
            <input :value="m.onDate || ''" type="date" class="in" style="width:150px"
                   @change="setMilestone(m.key, ($event.target as HTMLInputElement).value)">
            <button v-if="m.onDate" class="chip" @click="clearMilestone(m.key)">✕</button>
          </template>
        </div>
      </div>
    </div>

    <div class="sec-title">{{ t('ventureLogs') }}</div>
    <div v-for="l in data.logs" :key="l.kind" class="catgroup">
      <button class="cathead" @click="openLog = openLog === l.kind ? null : l.kind; logForm.kind = l.kind">
        <span class="cemoji">{{ l.emoji }}</span>
        <span class="clbl">{{ l.titleEl }}</span>
        <span class="cn">{{ l.entries.length }}</span>
        <span class="chev">{{ openLog === l.kind ? '⌄' : '›' }}</span>
      </button>
      <div v-if="openLog === l.kind" style="margin-top:8px;display:flex;flex-direction:column;gap:9px">
        <div v-if="l.entries.length" class="adm">
          <div v-for="(e, n) in l.entries" :key="e.id" class="it">
            <div class="ln">{{ n + 1 }}</div>
            <div style="flex:1;min-width:0">
              <b>{{ e.formEl || '—' }}</b>
              <span>{{ [e.datesEl, e.placeEl, e.oeEl].filter(Boolean).join(' · ') }}</span>
            </div>
            <button v-if="data.canSign" class="chip" @click="removeLog(e.id)">🗑️</button>
          </div>
        </div>
        <div v-else class="empty">{{ l.hintEl }}</div>

        <template v-if="data.canSign">
          <div style="display:flex;gap:8px">
            <div style="flex:1"><label class="lab">{{ t('logDates') }}</label><input v-model="logForm.datesEl" class="in"></div>
            <div style="flex:1"><label class="lab">{{ t('logPlace') }}</label><input v-model="logForm.placeEl" class="in"></div>
          </div>
          <div><label class="lab">{{ t('logForm') }}</label><input v-model="logForm.formEl" class="in"></div>
          <div><label class="lab">{{ t('logOe') }}</label><input v-model="logForm.oeEl" class="in"></div>
          <button class="btn" :disabled="!logForm.formEl.trim() || busy" @click="logForm.kind = l.kind; addLog()">
            + {{ t('addLogEntry') }}
          </button>
        </template>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="detail" class="sheet-backdrop" @click.self="detail = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:88dvh;overflow:auto">
          <div class="tiny muted" style="text-align:center">{{ detail.award.titleEl }} · {{ detail.code }}</div>
          <h3 style="margin:0;font-size:16px;text-align:center">{{ detail.areaEl }}</h3>
          <p style="font-size:13.5px;line-height:1.6;margin:0">{{ detail.textEl }}</p>
          <ul v-if="detail.bulletsEl?.length" class="blist">
            <li v-for="(b, i) in detail.bulletsEl" :key="i">{{ b }}</li>
          </ul>

          <template v-if="data.canSign">
            <div v-if="detail.optionsEl?.length">
              <label class="lab">{{ t('chooseOne') }}</label>
              <div class="chips">
                <button v-for="(o, i) in detail.optionsEl" :key="i" class="chip"
                        :class="{ on: form.chosen === o }" @click="form.chosen = form.chosen === o ? '' : o">{{ o }}</button>
              </div>
            </div>
            <div v-if="detail.needsNote">
              <label class="lab">{{ t('myAccount') }}</label>
              <textarea v-model="form.note" class="in" rows="4" />
            </div>
            <div><label class="lab">{{ t('completedOn') }}</label><input v-model="form.when" type="date" class="in"></div>
            <button class="btn" :disabled="busy" @click="sign(true)">
              ✅ {{ detail.completedOn ? t('save') : t('markDone') }}
            </button>
            <button v-if="detail.completedOn" class="btn ghost" :disabled="busy" @click="sign(false)">
              ↩️ {{ t('undoAward') }}
            </button>
          </template>
          <template v-else>
            <div v-if="detail.chosenEl" class="note"><b>🎯</b>{{ detail.chosenEl }}</div>
            <div v-if="detail.noteEl" class="note"><b>✍️ {{ t('myAccount') }}</b>{{ detail.noteEl }}</div>
            <div v-if="detail.completedOn" class="verdict good">
              <b>{{ t('completedOn') }}</b><span> {{ fmtDate(detail.completedOn, locale) }}</span>
            </div>
          </template>

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
.tile{display:flex; align-items:center; gap:13px; text-align:left; width:100%; background:var(--card);
  border-radius:18px; padding:13px 15px; box-shadow:0 5px 0 rgba(0,0,0,.1); border:3px solid var(--tone)}
.tile .badge{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:23px;background:var(--tone);flex:none}
.tile .txt{flex:1;min-width:0;display:flex;flex-direction:column}
.tile .txt b{font-size:14.5px}
.tile .txt span{font-size:11.5px;color:var(--muted)}
.tile.done{background:linear-gradient(180deg,#F2FBF5,#fff)}
.tile .ring{flex:none;width:44px;height:44px;border-radius:50%;background:conic-gradient(var(--tone) calc(var(--p) * 1%), #EEF2F6 0);display:grid;place-items:center}
.tile .ring i{width:34px;height:34px;border-radius:50%;background:var(--card);display:grid;place-items:center;font-style:normal;font-size:10.5px;font-weight:800}

.items{display:flex;flex-direction:column;gap:7px;padding-left:6px}
.item{display:flex;gap:10px;text-align:left;background:var(--card);border-radius:13px;padding:10px 12px;box-shadow:var(--shadow)}
.item .n{flex:none;min-width:28px;height:24px;padding:0 6px;border-radius:8px;background:#EEF2F6;display:grid;place-items:center;font-size:11px;font-weight:800;color:var(--muted)}
.item .body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.item .body b{font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}
.item .body > span{font-size:13px;line-height:1.45}
.item .body em{font-style:normal;font-size:11.5px;font-weight:700;color:var(--green)}
.item.got{background:linear-gradient(180deg,#F2FBF5,#fff)}
.item.got .n{background:var(--green);color:#fff}

.mrow{display:flex;align-items:center;gap:9px;background:#EEF2F6;border-radius:12px;padding:9px 12px}
.catgroup{display:flex;flex-direction:column}
.cathead{display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:var(--card);border-radius:14px;padding:12px 14px;box-shadow:var(--shadow)}
.cathead .cemoji{font-size:19px}
.cathead .clbl{flex:1;min-width:0;font-size:13.5px;font-weight:650}
.cathead .cn{font-size:11px;font-weight:800;color:var(--muted);background:#EEF2F6;border-radius:999px;padding:2px 8px}
.cathead .chev{color:var(--muted)}
.ln{flex:none;width:24px;height:24px;border-radius:8px;background:#EEF2F6;display:grid;place-items:center;font-size:11px;font-weight:800;color:var(--muted)}
.blist{margin:0;padding-left:19px;display:flex;flex-direction:column;gap:6px}
.blist li{font-size:12.5px;line-height:1.5;color:#44536B}
</style>
