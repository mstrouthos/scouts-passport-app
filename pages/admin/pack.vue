<script setup lang="ts">
/* The pack screen for its Βαθμοφόροι: set the week's challenges and tick them
   off at the συγκέντρωση, and read the standings — which stay here and are
   never shown to families. Serves the Αγέλη and the Μικρή Αγέλη; whoever leads
   both switches between them, and each keeps its own week. */
const { t, locale } = useI18n()
const lx = useLx()
const name = useName()
const { show } = useToast()
const sectionId = ref<number | null>(null)
const { data, refresh } = await useFetch<any>('/api/admin/pack', {
  query: computed(() => (sectionId.value ? { section: sectionId.value } : {}))
})
watchEffect(() => { if (sectionId.value == null && data.value?.sectionId) sectionId.value = data.value.sectionId })
const busy = ref(false)
const openChallenge = ref<number | null>(null)
const draft = reactive({ textEl: '', emoji: '🌟' })

async function post(body: any) {
  if (busy.value) return
  busy.value = true
  try {
    await $fetch('/api/admin/pack/challenges', { method: 'POST', body: { sectionId: data.value?.sectionId, ...body } })
    await refresh()
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
async function addChallenge() {
  if (!draft.textEl.trim()) return
  await post({ textEl: draft.textEl, emoji: draft.emoji, weekStart: data.value?.weekStart })
  draft.textEl = ''
}
async function removeChallenge(id: number) {
  if (!confirm(t('confirmDeleteChallenge'))) return
  await post({ action: 'remove', challengeId: id })
}
const toggleDone = (challengeId: number, scoutId: number) => post({ action: 'mark', challengeId, scoutId })

const membersOf = (patrolId: number) => (data.value?.members || []).filter((m: any) => m.patrolId === patrolId)
const patrolName = (id: number) => (data.value?.patrols || []).find((p: any) => p.id === id)
</script>

<template>
  <AppShell v-if="data" :title="t('packScreen')" :sub="t('packScreenSub')" back="/admin/more">
    <div v-if="(data.sections || []).length > 1" class="chips">
      <button v-for="sec in data.sections" :key="sec.id" class="chip"
              :class="{ on: data.sectionId === sec.id }" @click="sectionId = sec.id">{{ lx(sec, 'name') }}</button>
    </div>

    <NuxtLink v-if="data.nextMeeting" :to="`/admin/events/${data.nextMeeting.id}`" class="banner">
      <div class="ico">📅</div>
      <div>
        <b>{{ data.nextMeeting.themeEl || data.nextMeeting.titleEl }}</b>
        <span>{{ t('nextMeeting') }} · {{ fmtDate(data.nextMeeting.startsAt, locale) }}</span>
      </div>
      <div class="go">›</div>
    </NuxtLink>

    <div class="sec-title">{{ t('weekChallenges') }} · {{ t('thisWeek2') }}</div>
    <div v-if="data.challenges.length" style="display:flex;flex-direction:column;gap:9px">
      <div v-for="c in data.challenges" :key="c.id" class="chal">
        <button class="head" @click="openChallenge = openChallenge === c.id ? null : c.id">
          <span class="em">{{ c.emoji }}</span>
          <span class="txt">{{ c.textEl }}</span>
          <span class="cn">{{ c.doneBy.length }}</span>
          <span class="chev">{{ openChallenge === c.id ? '⌄' : '›' }}</span>
        </button>
        <div v-if="openChallenge === c.id" class="who">
          <div class="tiny muted">{{ t('whoDidIt') }}</div>
          <template v-for="p in data.patrols" :key="p.id">
            <div v-if="membersOf(p.id).length" class="grp">
              <div class="tiny muted">{{ p.emblem }} {{ p.nameEl }}</div>
              <div class="chips">
                <button v-for="m in membersOf(p.id)" :key="m.id" class="chip"
                        :class="{ on: c.doneBy.includes(m.id) }" :disabled="busy"
                        @click="toggleDone(c.id, m.id)">{{ name(m) }}</button>
              </div>
            </div>
          </template>
          <button class="chip" style="align-self:flex-start;color:var(--danger)" @click="removeChallenge(c.id)">
            🗑️
          </button>
        </div>
      </div>
    </div>
    <div v-else class="empty">{{ t('noWeekChallenges') }}</div>

    <div class="card" style="display:flex;flex-direction:column;gap:9px">
      <div style="display:flex;gap:8px">
        <input v-model="draft.emoji" class="in" style="width:64px;text-align:center" maxlength="4">
        <input v-model="draft.textEl" class="in" style="flex:1" :placeholder="t('addWeekChallenge')">
      </div>
      <button class="btn" :disabled="!draft.textEl.trim() || busy" @click="addChallenge">
        + {{ t('addWeekChallenge') }}
      </button>
    </div>

    <div class="sec-title">{{ t('packStandings') }}</div>
    <div class="tiny muted">{{ t('packStandingsNote') }}</div>

    <div class="sec-title" style="font-size:11px">{{ t('sixesTable') }}</div>
    <div class="adm">
      <div v-for="(p, i) in data.patrols" :key="p.id" class="it" style="cursor:default">
        <div class="rank">{{ i + 1 }}</div>
        <div style="flex:1;min-width:0"><b>{{ p.emblem }} {{ p.nameEl }}</b><span>{{ p.size }} {{ t('members') }}</span></div>
        <span class="amt">{{ p.points }}</span>
      </div>
    </div>

    <div class="sec-title" style="font-size:11px">{{ t('cubsTable') }}</div>
    <div class="adm">
      <div v-for="(m, i) in data.members" :key="m.id" class="it" style="cursor:default">
        <div class="rank">{{ i + 1 }}</div>
        <div style="flex:1;min-width:0">
          <b>{{ name(m) }}</b>
          <span>{{ patrolName(m.patrolId)?.nameEl || '—' }}</span>
        </div>
        <span class="amt">{{ m.points }}</span>
      </div>
    </div>

  </AppShell>
</template>

<style scoped>
.chal{background:var(--card); border-radius:14px; box-shadow:var(--shadow); overflow:hidden}
.chal .head{display:flex; align-items:center; gap:10px; width:100%; text-align:left; padding:12px 14px}
.chal .em{font-size:18px}
.chal .txt{flex:1; min-width:0; font-size:13.5px; line-height:1.4}
.chal .cn{font-size:11px; font-weight:800; color:var(--muted); background:#EEF2F6; border-radius:999px; padding:2px 8px}
.chal .chev{color:var(--muted)}
.who{display:flex; flex-direction:column; gap:9px; padding:0 14px 13px}
.grp{display:flex; flex-direction:column; gap:5px}
.rank{
  flex:none; width:24px; height:24px; border-radius:8px; background:#EEF2F6;
  display:grid; place-items:center; font-size:11px; font-weight:800; color:var(--muted);
}
.amt{flex:none; font-weight:800; font-size:14px; color:var(--accent-deep)}
</style>
