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

    <div v-for="st in stages" :key="st.slug" class="stage">
      <button class="tile" :class="{ done: st.complete }" :style="{ '--tone': st.colour }"
              @click="openStage = openStage === st.slug ? null : st.slug">
        <span class="badge">{{ st.emoji }}</span>
        <span class="txt"><b>{{ st.titleEl }}</b><span>{{ st.earned }}/{{ st.total }} · {{ pct(st) }}%</span></span>
        <span class="chev">{{ openStage === st.slug ? '⌄' : '›' }}</span>
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
            <button v-if="detail.completedOn" class="btn ghost" :disabled="busy" @click="setDone(false)">
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
.tile .chev{color:var(--muted)}
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
