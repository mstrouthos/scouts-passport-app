<script setup lang="ts">
const { t } = useI18n()
const me = useMe()
const lx = useLx()
const name = useName()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/roles')
const isTroopLeader = computed(() => data.value?.isTroopLeader)

const editing = ref<any>(null)
const appointing = ref(false)
const pick = reactive({ scope: 'section' as 'troop' | 'section', sectionId: 0, rank: 'archigos' as 'archigos' | 'yparchigos' })
const rotated = ref<string | null>(null)

// ----- troop leader: appoint/edit section-level Βαθμοφόροι -----
function open(l: any) {
  editing.value = l; rotated.value = null
  const sc = l.scopes?.[0]
  pick.scope = sc?.scope === 'troop' || l.role === 'troop_leader' ? 'troop' : 'section'
  pick.sectionId = sc?.sectionId ?? data.value?.sections?.[0]?.id ?? 0
  pick.rank = sc?.rank === 'yparchigos' ? 'yparchigos' : 'archigos'
}
async function save() {
  try {
    await $fetch('/api/admin/roles', {
      method: 'POST',
      body: { scoutId: editing.value.id, role: 'leader', scope: pick.scope, sectionId: pick.sectionId, rank: pick.rank }
    })
    await refresh(); await loadMe(); editing.value = null; show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
async function demote(scoutId: number) {
  await $fetch('/api/admin/roles', { method: 'POST', body: { scoutId, role: 'scout' } })
  await refresh(); editing.value = null; show('✅ ' + t('saved'))
}
async function rotate(scoutId: number) {
  const res = await $fetch<any>(`/api/admin/scouts/${scoutId}/passcode`, { method: 'POST' })
  rotated.value = res.passcode
}
function scopeLabel(l: any) {
  if (l.role === 'troop_leader') return t('troopLeader')
  const sc = l.scopes?.[0]
  const rank = sc?.rank === 'yparchigos' ? t('yparchigos') : t('archigos')
  if (!sc || sc.scope === 'troop') return `${rank} · ${t('wholeTroop')}`
  const sec = data.value?.sections?.find((x: any) => x.id === sc.sectionId)
  return `${rank} · ${sec ? lx(sec, 'name') : t('wholeTroop')}`
}
function appoint(r: any) { appointing.value = false; open({ ...r, role: 'leader', scopes: [] }) }

// ----- section leader: appoint/edit patrol-level leaders (max 2 per team) -----
const editingPL = ref<any>(null)   // { patrolId, scoutId?, rank }
function openPatrolLeader(patrolId: number, existing?: any) {
  editingPL.value = { patrolId, scoutId: existing?.id ?? null, rank: existing?.rank ?? 'archigos', isNew: !existing }
}
async function savePatrolLeader() {
  try {
    await $fetch('/api/admin/roles', {
      method: 'POST',
      body: { scoutId: editingPL.value.scoutId, role: 'leader', patrolId: editingPL.value.patrolId, rank: editingPL.value.rank }
    })
    editingPL.value = null
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
async function removePatrolLeader(scoutId: number) {
  await $fetch('/api/admin/roles', { method: 'POST', body: { scoutId, role: 'scout' } })
  editingPL.value = null
  await refresh(); show('✅ ' + t('saved'))
}
const eligibleForPatrol = computed(() => {
  if (!editingPL.value) return []
  return (data.value?.scouts || []).filter((r: any) => r.patrolId === editingPL.value.patrolId)
})
</script>

<template>
  <AppShell :title="t('roles')" :sub="t('rolesSub')" back="/admin/more">
    <template v-if="isTroopLeader">
      <div class="note"><b>👑 {{ t('troopLeader') }}</b>{{ t('rolesNote') }}</div>
      <div class="adm">
        <div class="hdr">{{ t('vathmoforoi') }} · {{ data?.leaders?.length || 0 }}</div>
        <button v-for="l in data?.leaders" :key="l.id" class="it" :disabled="l.id === me?.id" @click="open(l)">
          <div style="flex:1"><b>{{ name(l) }}</b><span>{{ scopeLabel(l) }}</span></div>
          <span class="pill" :class="l.role === 'troop_leader' ? 'sched' : 'live'">
            {{ l.role === 'troop_leader' ? t('troopLeader') : t('leader') }}
          </span>
        </button>
      </div>
      <button class="srow" @click="appointing = true">
        <div class="ico">➕</div><div class="txt"><b>{{ t('makeLeader') }}</b><span>{{ t('pickFromList') }}</span></div><span class="chev">›</span>
      </button>
    </template>

    <template v-else>
      <div class="note"><b>👥 {{ t('patrolLeadersTitle') }}</b>{{ t('patrolLeadersNote') }}</div>
      <div v-for="p in data?.patrols" :key="p.id" class="adm">
        <div class="hdr">{{ p.emblem }} {{ lx(p, 'name') }}</div>
        <button v-for="l in p.leaders" :key="l.id" class="it" @click="openPatrolLeader(p.id, l)">
          <div style="flex:1"><b>{{ name(l) }}</b><span>{{ l.rank === 'yparchigos' ? t('yparchigosEnomotias') : t('archigosEnomotias') }}</span></div>
          <span class="chev">›</span>
        </button>
        <button v-if="(p.leaders?.length || 0) < 2" class="it" @click="openPatrolLeader(p.id)">
          <div class="ico" style="font-size:16px;width:26px;text-align:center">➕</div>
          <div style="flex:1"><b>{{ t('addPatrolLeader') }}</b></div>
        </button>
      </div>
    </template>

    <Teleport to="body">
      <!-- troop leader sheet -->
      <div v-if="editing" class="sheet-backdrop" @click.self="editing = null; rotated = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:85dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ name(editing) }}</h3>
          <div>
            <label class="lab">{{ t('assignScope') }}</label>
            <div class="chips">
              <button class="chip" :class="{ on: pick.scope === 'troop' }" @click="pick.scope = 'troop'">{{ t('wholeTroop') }}</button>
              <button v-for="sec in data?.sections" :key="sec.id" class="chip"
                      :class="{ on: pick.scope === 'section' && pick.sectionId === sec.id }"
                      @click="pick.scope = 'section'; pick.sectionId = sec.id">{{ lx(sec, 'name') }}</button>
            </div>
          </div>
          <div>
            <label class="lab">{{ t('rank') }}</label>
            <div class="seg">
              <button :class="{ on: pick.rank === 'archigos' }" @click="pick.rank = 'archigos'">{{ t('archigos') }}</button>
              <button :class="{ on: pick.rank === 'yparchigos' }" @click="pick.rank = 'yparchigos'">{{ t('yparchigos') }}</button>
            </div>
            <div class="tiny muted" style="margin-top:5px">{{ t('yparchNote') }}</div>
          </div>
          <button class="btn" @click="save">{{ t('save') }}</button>
          <div v-if="rotated" class="note" style="text-align:center">
            <b>{{ t('passcodeIs') }} <span style="font-variant-numeric:tabular-nums">{{ rotated }}</span></b>
            {{ t('writeItDown') }}
          </div>
          <button v-else class="btn ghost" @click="rotate(editing.id)">🔑 {{ t('newPasscode') }}</button>
          <button v-if="editing.role !== 'troop_leader' && editing.scopes?.length" class="btn danger" @click="demote(editing.id)">{{ t('demote') }}</button>
        </div>
      </div>
      <div v-if="appointing" class="sheet-backdrop" @click.self="appointing = false">
        <div class="sheet" style="display:flex;flex-direction:column;gap:10px;max-height:75dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('makeLeader') }}</h3>
          <div class="adm">
            <button v-for="r in data?.scouts" :key="r.id" class="it" @click="appoint(r)">
              <div style="flex:1"><b>{{ name(r) }}</b></div><span class="chev">›</span>
            </button>
          </div>
        </div>
      </div>

      <!-- section leader: patrol-leader sheet -->
      <div v-if="editingPL" class="sheet-backdrop" @click.self="editingPL = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:80dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">
            {{ editingPL.isNew ? t('addPatrolLeader') : name(data.patrols.flatMap(p => p.leaders).find(l => l.id === editingPL.scoutId)) }}
          </h3>
          <template v-if="editingPL.isNew">
            <label class="lab">{{ t('pickScouts') }}</label>
            <div class="adm">
              <button v-for="r in eligibleForPatrol" :key="r.id" class="it"
                      :class="{ 'is-active': editingPL.scoutId === r.id }" @click="editingPL.scoutId = r.id">
                <div style="flex:1"><b>{{ name(r) }}</b></div>
                <span v-if="editingPL.scoutId === r.id" style="color:var(--accent);font-weight:700">✓</span>
              </button>
              <div v-if="!eligibleForPatrol.length" class="tiny muted" style="padding:12px">{{ t('noMembersYet') }}</div>
            </div>
          </template>
          <div>
            <label class="lab">{{ t('rank') }}</label>
            <div class="seg">
              <button :class="{ on: editingPL.rank === 'archigos' }" @click="editingPL.rank = 'archigos'">{{ t('archigosEnomotias') }}</button>
              <button :class="{ on: editingPL.rank === 'yparchigos' }" @click="editingPL.rank = 'yparchigos'">{{ t('yparchigosEnomotias') }}</button>
            </div>
          </div>
          <button class="btn" :disabled="!editingPL.scoutId" @click="savePatrolLeader">{{ t('save') }}</button>
          <button v-if="!editingPL.isNew" class="btn danger" @click="removePatrolLeader(editingPL.scoutId)">{{ t('demote') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.it.is-active{background:var(--accent-soft)}
</style>
