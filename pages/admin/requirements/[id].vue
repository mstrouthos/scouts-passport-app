<script setup lang="ts">
/* The Αρχηγός's side of the passport: tick a requirement off and set the date,
   exactly as it would be signed and dated on paper. */
const { t, locale } = useI18n()
const { show } = useToast()
const route = useRoute()
const id = route.params.id
const { data, refresh } = await useFetch<any>(`/api/admin/scouts/${id}/requirements`)
const openStage = ref<string | null>(null)
const detail = ref<any>(null)
const when = ref(new Date().toISOString().slice(0, 10))
const busy = ref(false)

const stages = computed<any[]>(() => data.value?.stages || [])
const pct = (st: any) => st.total ? Math.round((st.earned / st.total) * 100) : 0

function openDetail(it: any, st: any) {
  when.value = it.completedOn || new Date().toISOString().slice(0, 10)
  detail.value = { ...it, stage: st }
}
async function setDone(done: boolean) {
  if (busy.value) return
  busy.value = true
  try {
    await $fetch(`/api/admin/scouts/${id}/requirements`, {
      method: 'POST',
      body: { requirementId: detail.value.id, completedOn: when.value, done }
    })
    await refresh()
    const st = stages.value.find(x => x.slug === detail.value.stage.slug)
    const fresh = st?.items.find((x: any) => x.id === detail.value.id)
    detail.value = fresh ? { ...fresh, stage: st } : null
    show(done ? '✅ ' + t('saved') : '↩️ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
</script>

<template>
  <AppShell v-if="data" :title="t('scoutRequirements')"
            :sub="`${data.scout.firstName} ${data.scout.lastName} · ${data.earned}/${data.total}`"
            :back="`/admin/scouts/${id}`">
    <div v-if="!data.canAward" class="note">{{ t('onlyArchigosAwards') }}</div>

    <div class="hero-card">
      <div class="big">{{ data.earned }}<span>/{{ data.total }}</span></div>
      <div class="lbl">{{ t('requirementsDone') }}</div>
      <div class="bar"><i :style="{ width: (data.total ? (data.earned / data.total) * 100 : 0) + '%' }" /></div>
    </div>

    <div v-for="st in stages" :key="st.slug" class="stage">
      <button class="tile" :class="{ done: st.complete }" :style="{ '--tone': st.colour }"
              @click="openStage = openStage === st.slug ? null : st.slug">
        <span class="badge">{{ st.emoji }}</span>
        <span class="txt"><b>{{ st.titleEl }}</b><span>{{ st.earned }}/{{ st.total }} · {{ pct(st) }}%</span></span>
        <span class="ring" :style="{ '--p': pct(st) }"><i>{{ st.complete ? '★' : pct(st) + '%' }}</i></span>
      </button>
      <div v-if="openStage === st.slug" class="items">
        <button v-for="it in st.items" :key="it.id" class="item" :class="{ got: it.completedOn }"
                @click="openDetail(it, st)">
          <span class="n">{{ it.n }}</span>
          <span class="body">
            <b>{{ it.themeEl }}</b>
            <span>{{ it.textEl }}</span>
            <em v-if="it.completedOn">✓ {{ fmtDate(it.completedOn, locale) }}</em>
          </span>
        </button>
      </div>
    </div>


    <div v-if="data?.honours?.length" class="sec-title">{{ t('honours') }}</div>
    <div v-for="h in data?.honours || []" :key="h.slug" class="honour" :class="{ done: h.complete }"
         :style="{ '--tone': h.colour }">
      <div class="hhead">
        <span class="hem">{{ h.emoji }}</span>
        <span class="hlbl"><b>{{ h.titleEl }}</b><span>{{ h.have }}/{{ h.need }}</span></span>
        <span v-if="h.complete" class="pill ok">✓</span>
      </div>
      <div class="hparts">
        <span v-for="(p, i) in h.parts" :key="i" class="hpart" :class="{ met: p.have >= p.need }">
          {{ p.labelEl }} <b>{{ Math.min(p.have, p.need) }}/{{ p.need }}</b>
        </span>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="detail" class="sheet-backdrop" @click.self="detail = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:88dvh;overflow:auto">
          <div class="tiny muted" style="text-align:center">
            {{ detail.stage.titleEl }} · {{ t('requirementNo') }} {{ detail.n }}
          </div>
          <h3 style="margin:0;font-size:16px;text-align:center">{{ detail.themeEl }}</h3>
          <p style="font-size:13.5px;line-height:1.6;margin:0">{{ detail.textEl }}</p>
          <div v-if="detail.meansEl" class="note"><b>🎯 {{ t('howToAchieve') }}</b>{{ detail.meansEl }}</div>
          <div v-if="detail.level" class="tiny muted">{{ t('requirementLevel') }}: {{ detail.level }}</div>

          <template v-if="data.canAward">
            <div><label class="lab">{{ t('completedOn') }}</label><input v-model="when" type="date" class="in"></div>
            <button class="btn" :disabled="busy" @click="setDone(true)">
              ✅ {{ detail.completedOn ? t('save') : t('markDone') }}
            </button>
            <button v-if="detail.completedOn" class="btn ghost" :disabled="busy" @click="confirm(t('confirmUndoAward')) && setDone(false)">
              ↩️ {{ t('undoAward') }}
            </button>
          </template>
          <div v-else-if="detail.completedOn" class="verdict good">
            <b>{{ t('completedOn') }}</b><span> {{ fmtDate(detail.completedOn, locale) }}</span>
          </div>

          <button class="btn ghost" @click="detail = null">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.honour{background:var(--card); border-radius:16px; padding:12px 14px; box-shadow:var(--shadow);
  border-left:4px solid var(--tone); display:flex; flex-direction:column; gap:9px}
.honour.done{background:linear-gradient(180deg,#F2FBF5,#fff)}
.hhead{display:flex; align-items:center; gap:11px}
.hem{font-size:22px}
.hlbl{flex:1; min-width:0; display:flex; flex-direction:column}
.hlbl b{font-size:14px}
.hlbl span{font-size:11.5px; color:var(--muted)}
.hparts{display:flex; flex-wrap:wrap; gap:6px}
.hpart{font-size:11px; background:#EEF2F6; color:var(--muted); border-radius:999px; padding:3px 9px}
.hpart b{font-variant-numeric:tabular-nums}
.hpart.met{background:var(--accent-soft); color:var(--accent-deep)}

.stage{display:flex; flex-direction:column; gap:9px}
.tile{
  display:flex; align-items:center; gap:13px; text-align:left; width:100%;
  background:var(--card); border-radius:18px; padding:13px 15px;
  box-shadow:0 5px 0 rgba(0,0,0,.1); border:3px solid var(--tone);
}
.tile .badge{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:23px;background:var(--tone);flex:none}
.tile .txt{flex:1;min-width:0;display:flex;flex-direction:column}
.tile .txt b{font-size:14.5px}
.tile .txt span{font-size:11.5px;color:var(--muted)}
.tile .ring{
  flex:none; width:44px; height:44px; border-radius:50%;
  background:conic-gradient(var(--tone) calc(var(--p) * 1%), #EEF2F6 0);
  display:grid; place-items:center;
}
.tile .ring i{
  width:34px; height:34px; border-radius:50%; background:var(--card);
  display:grid; place-items:center; font-style:normal; font-size:10.5px; font-weight:800;
}
.hero-card{
  background:var(--card); border-radius:var(--r-card); box-shadow:var(--shadow);
  padding:16px; text-align:center;
}
.hero-card .big{font-size:30px; font-weight:800; line-height:1}
.hero-card .big span{font-size:16px; color:var(--muted); font-weight:600}
.hero-card .lbl{font-size:12px; color:var(--muted); margin-top:2px}
.hero-card .bar{height:9px; border-radius:5px; background:#EEF2F6; margin-top:11px; overflow:hidden}
.hero-card .bar i{display:block; height:100%; border-radius:5px; background:var(--accent); transition:width .4s}
.tile.done{background:linear-gradient(180deg,#F2FBF5,#fff)}
.items{display:flex;flex-direction:column;gap:7px;padding-left:6px}
.item{display:flex;gap:10px;text-align:left;background:var(--card);border-radius:13px;padding:10px 12px;box-shadow:var(--shadow)}
.item .n{flex:none;width:24px;height:24px;border-radius:8px;background:#EEF2F6;display:grid;place-items:center;font-size:11px;font-weight:800;color:var(--muted)}
.item .body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.item .body b{font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}
.item .body > span{font-size:13px;line-height:1.45}
.item .body em{font-style:normal;font-size:11.5px;font-weight:700;color:var(--green)}
.item.got{background:linear-gradient(180deg,#F2FBF5,#fff)}
.item.got .n{background:var(--green);color:#fff}
</style>
