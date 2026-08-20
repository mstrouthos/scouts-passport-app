<script setup lang="ts">
const { t } = useI18n()
const me = useMe()
const lx = useLx()
const name = useName()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/scouts')
const activeCount = computed(() => (data.value?.sections || [])
  .flatMap((sec: any) => [...sec.patrols.flatMap((p: any) => p.scouts), ...sec.loose])
  .filter((r: any) => r.isActive).length)

const SECTOR_ICON: Record<string, string> = { omada: '🏕️', koinotita: '🧭', ageli: '🐾', 'mikri-ageli': '🌱' }
function sectorCount(sec: any) {
  return sec.patrols.reduce((n: number, p: any) => n + p.scouts.length, 0) + sec.loose.length
}

// ----- accordion: which sectors are expanded. Few sectors -> open by default; many -> collapsed. -----
const openSectors = ref(new Set<any>())
function toggleSector(key: any) {
  const s = new Set(openSectors.value)
  s.has(key) ? s.delete(key) : s.add(key)
  openSectors.value = s
}
watch(data, (v) => {
  if (!v || openSectors.value.size) return
  const many = (v.sections?.length || 0) + (v.leaders ? 1 : 0) > 2
  openSectors.value = new Set(many ? [] : [...(v.sections || []).map((sec: any) => sec.id), 'leaders'])
}, { immediate: true })

// ----- new member / new leader sheet -----
const adding = ref(false)
const form = reactive({
  firstName: '', lastName: '', phone: null as string | null,
  sectionId: 0 as number | 'leaders', patrolId: 0,
  leaderScope: 'troop', leaderSectionId: 0, rank: 'archigos'
})
const created = ref<{ id: number, passcode: string, phone: string | null } | null>(null)
const smsAsked = ref(false)
const smsOutcome = ref<'sent' | 'failed' | null>(null)
const patrolsOf = computed(() =>
  (data.value?.sections || []).find((sec: any) => sec.id === form.sectionId)?.patrols || [])

function openAdd(sectionId: number | 'leaders' = 0) {
  created.value = null
  smsAsked.value = false; smsOutcome.value = null
  form.firstName = ''; form.lastName = ''; form.phone = null; form.patrolId = 0
  form.leaderScope = 'troop'; form.leaderSectionId = 0; form.rank = 'archigos'
  form.sectionId = sectionId || data.value?.sections?.find((sec: any) => sec.canManage)?.id || 0
  adding.value = true
}

async function createScout() {
  try {
    const body = form.sectionId === 'leaders'
      ? {
          firstName: form.firstName, lastName: form.lastName, phone: form.phone,
          kind: 'leader', scope: form.leaderScope, rank: form.rank,
          sectionId: form.leaderScope === 'section' ? form.leaderSectionId : null
        }
      : {
          firstName: form.firstName, lastName: form.lastName, phone: form.phone,
          sectionId: form.sectionId, patrolId: form.patrolId || null
        }
    const res = await $fetch<any>('/api/admin/scouts', { method: 'POST', body })
    created.value = { ...res, phone: form.phone }
    form.firstName = ''; form.lastName = ''; form.phone = null
    await refresh()
  } catch (e: any) { show(e?.data?.message || t('error')) }
}

async function sendInviteSms() {
  if (!created.value) return
  try {
    const res = await $fetch<any>(`/api/admin/scouts/${created.value.id}/invite`, {
      method: 'POST', body: { passcode: created.value.passcode }
    })
    smsOutcome.value = res.sent ? 'sent' : 'failed'
  } catch { smsOutcome.value = 'failed' }
  smsAsked.value = true
}
function skipSms() { smsAsked.value = true }
const phoneValid = computed(() => !form.phone || /^\+357\d{8}$/.test(form.phone))
const canCreate = computed(() => {
  if (!form.firstName || !form.lastName || !phoneValid.value) return false
  if (form.sectionId === 'leaders') return form.leaderScope !== 'section' || !!form.leaderSectionId
  return !!form.sectionId
})

// The API returns a leader's rank inside scopes[], not as a flat `rank` — a
// leader can hold several. Show the first, and the sector it applies to.
function scopeRank(sc: any) {
  if (!sc) return t('archigos')
  if (sc.scope === 'patrol') return sc.rank === 'yparchigos' ? t('yparchigosEnomotias') : t('archigosEnomotias')
  return sc.rank === 'yparchigos' ? t('yparchigos') : t('archigos')
}
function rankLabel(l: any) {
  return l.role === 'troop_leader' ? t('troopLeader') : scopeRank(l.scopes?.[0])
}
function scopeWhere(sc: any) {
  if (!sc || sc.scope === 'troop') return t('wholeTroop')
  if (sc.scope === 'patrol') {
    const p = (data.value?.sections || []).flatMap((s: any) => s.patrols).find((x: any) => x.id === sc.patrolId)
    return p ? `${p.emblem} ${lx(p, 'name')}` : t('wholeTroop')
  }
  const sec = (data.value?.sections || []).find((x: any) => x.id === sc.sectionId)
  return sec ? lx(sec, 'name') : t('wholeTroop')
}
function leaderSub(l: any) {
  if (l.role === 'troop_leader') return t('allSectors')
  if (!l.scopes?.length) return t('noRoles')
  return l.scopes.map((sc: any) => `${scopeRank(sc)} · ${scopeWhere(sc)}`).join(' · ')
}

// ----- patrol (team) management, for section-admin leaders only -----
const editingPatrol = ref<any>(null)   // { id?, sectionId, nameEl, nameEn, emblem }
function newPatrol(sectionId: number) { editingPatrol.value = { sectionId, nameEl: '', nameEn: '', emblem: '' } }
function editPatrol(p: any, sectionId: number) { editingPatrol.value = { id: p.id, sectionId, nameEl: p.nameEl, nameEn: p.nameEn || '', emblem: p.emblem } }
async function savePatrol() {
  const p = editingPatrol.value
  try {
    if (p.id) await $fetch(`/api/admin/patrols/${p.id}`, { method: 'PATCH', body: { nameEl: p.nameEl, nameEn: p.nameEn || null, emblem: p.emblem } })
    else await $fetch('/api/admin/patrols', { method: 'POST', body: { sectionId: p.sectionId, nameEl: p.nameEl, nameEn: p.nameEn || null } })
    editingPatrol.value = null
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
async function deletePatrol() {
  try {
    await $fetch(`/api/admin/patrols/${editingPatrol.value.id}`, { method: 'DELETE' })
    editingPatrol.value = null
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="me?.role === 'troop_leader' ? t('scouts') : t('myScouts')"
            :sub="`${activeCount} ${t('activeN')}`">
    <div style="display:flex;flex-direction:column;gap:10px">
      <template v-for="sec in data?.sections" :key="sec.id">
        <div class="srow sector-hdr" role="button" tabindex="0"
             @click="toggleSector(sec.id)" @keydown.enter="toggleSector(sec.id)">
          <div class="ico">{{ SECTOR_ICON[sec.slug] || '👥' }}</div>
          <div class="txt"><b>{{ lx(sec, 'name') }}</b><span>{{ sectorCount(sec) }} {{ t('members') }}</span></div>
          <button v-if="sec.canManage" class="chip" style="flex:none" @click.stop="openAdd(sec.id)">+ {{ t('newScout') }}</button>
          <span class="chev" :class="{ open: openSectors.has(sec.id) }">›</span>
        </div>

        <div v-if="openSectors.has(sec.id)" style="display:flex;flex-direction:column;gap:12px;padding:0 2px">
          <div v-for="p in sec.patrols" :key="p.id" class="adm">
            <div class="hdr" style="display:flex;align-items:center;gap:8px">
              <span style="flex:1">{{ p.emblem }} {{ lx(p, 'name') }} · {{ p.scouts.length }}</span>
              <button v-if="sec.canManage" class="chip" style="flex:none;font-size:9.5px;padding:5px 9px"
                      @click="editPatrol(p, sec.id)">✎ {{ t('edit') }}</button>
            </div>
            <div v-if="p.leaders?.length" style="padding:8px 15px 2px;display:flex;flex-wrap:wrap;gap:6px">
              <span v-for="l in p.leaders" :key="l.id" class="pill live">
                {{ l.rank === 'yparchigos' ? t('yparchigosEnomotias') : t('archigosEnomotias') }}: {{ name(l) }}
              </span>
            </div>
            <NuxtLink v-for="r in p.scouts" :key="r.id" :to="`/admin/scouts/${r.id}`" class="it">
              <Avatar :name="name(r)" :tone="r.isActive ? 'accent' : 'blue'" />
              <div style="flex:1;min-width:0"><b>{{ name(r) }}</b><span>{{ r.points }} {{ t('pts') }} · {{ r.badges }} {{ t('badges').toLowerCase() }}</span></div>
              <span class="pill" :class="r.isActive ? 'ok' : 'draft'">{{ r.isActive ? t('active') : t('inactive') }}</span>
            </NuxtLink>
            <div v-if="!p.scouts.length" class="tiny muted" style="padding:10px 15px">{{ t('noMembersYet') }}</div>
          </div>
          <button v-if="sec.canManage" class="btn ghost" style="padding:9px" @click="newPatrol(sec.id)">+ {{ t('newTeam') }}</button>
          <div v-if="sec.loose.length" class="adm">
            <div class="hdr">{{ t('members') }}</div>
            <NuxtLink v-for="r in sec.loose" :key="r.id" :to="`/admin/scouts/${r.id}`" class="it">
              <Avatar :name="name(r)" :tone="r.isActive ? 'accent' : 'blue'" />
              <div style="flex:1;min-width:0"><b>{{ name(r) }}</b><span>{{ r.points }} {{ t('pts') }}</span></div>
              <span class="pill" :class="r.isActive ? 'ok' : 'draft'">{{ r.isActive ? t('active') : t('inactive') }}</span>
            </NuxtLink>
          </div>
          <div v-if="!sec.patrols.length && !sec.loose.length" class="empty">{{ t('noMembersYet') }}</div>
        </div>
      </template>

      <template v-if="data?.leaders">
        <div class="srow sector-hdr" role="button" tabindex="0"
             @click="toggleSector('leaders')" @keydown.enter="toggleSector('leaders')">
          <div class="ico">🎖️</div>
          <div class="txt"><b>{{ t('vathmoforoi') }}</b><span>{{ data.leaders.length }} {{ t('members') }}</span></div>
          <button class="chip" style="flex:none" @click.stop="openAdd('leaders')">+ {{ t('newScout') }}</button>
          <span class="chev" :class="{ open: openSectors.has('leaders') }">›</span>
        </div>
        <div v-if="openSectors.has('leaders')" class="adm">
          <NuxtLink v-for="r in data.leaders" :key="r.id" :to="`/admin/roles?open=${r.id}`" class="it">
            <Avatar :name="name(r)" :tone="r.role === 'troop_leader' ? 'gold' : 'green'" />
            <div style="flex:1;min-width:0"><b>{{ name(r) }}</b><span>{{ leaderSub(r) }}</span></div>
            <span class="pill" :class="r.role === 'troop_leader' ? 'sched' : 'live'">{{ rankLabel(r) }}</span>
            <span class="chev">›</span>
          </NuxtLink>
        </div>
      </template>

      <NuxtLink to="/admin/cards" class="btn ghost">{{ t('printCards') }}</NuxtLink>
    </div>

    <button class="fab" :aria-label="t('newScout')" @click="openAdd()">+</button>

    <Teleport to="body">
      <div v-if="adding" class="sheet-backdrop" @click.self="adding = false; created = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:86dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('newScout') }}</h3>
          <template v-if="created">
            <div class="note" style="text-align:center">
              <b>{{ t('passcodeIs') }} <span style="font-variant-numeric:tabular-nums">{{ created.passcode }}</span></b>
              {{ t('writeItDown') }}
            </div>
            <template v-if="created.phone && !smsAsked">
              <p class="tiny muted" style="text-align:center;margin:0">{{ t('askSendSms', { phone: created.phone }) }}</p>
              <div style="display:flex;gap:8px">
                <button class="btn ghost" style="flex:1" @click="skipSms">{{ t('cancel') }}</button>
                <button class="btn" style="flex:1" @click="sendInviteSms">{{ t('yesSendSms') }}</button>
              </div>
            </template>
            <div v-else-if="smsOutcome === 'sent'" class="tiny" style="text-align:center;color:var(--green)">📱 {{ t('smsSent') }}</div>
            <div v-else-if="smsOutcome === 'failed'" class="tiny muted" style="text-align:center">{{ t('smsNotConfigured') }}</div>
            <button class="btn" @click="adding = false; created = null">{{ t('close') }}</button>
          </template>
          <template v-else>
            <div><label class="lab">{{ t('firstName') }}</label><input v-model="form.firstName" class="in"></div>
            <div><label class="lab">{{ t('lastName') }}</label><input v-model="form.lastName" class="in"></div>
            <div><label class="lab">{{ t('phone') }} <span class="tiny muted">({{ t('optional') }})</span></label><PhoneInput v-model="form.phone" /></div>
            <div>
              <label class="lab">{{ t('sectionWord') }}</label>
              <div class="chips">
                <button v-for="sec in data?.sections.filter((s: any) => s.canManage)" :key="sec.id" class="chip" :class="{ on: form.sectionId === sec.id }"
                        @click="form.sectionId = sec.id; form.patrolId = 0">{{ lx(sec, 'name') }}</button>
                <button v-if="me?.role === 'troop_leader'" class="chip" :class="{ on: form.sectionId === 'leaders' }"
                        @click="form.sectionId = 'leaders'">🎖️ {{ t('vathmoforoi') }}</button>
              </div>
            </div>

            <template v-if="form.sectionId === 'leaders'">
              <div>
                <label class="lab">{{ t('rankWord') }}</label>
                <div class="chips">
                  <button class="chip" :class="{ on: form.rank === 'archigos' }" @click="form.rank = 'archigos'">{{ t('archigos') }}</button>
                  <button class="chip" :class="{ on: form.rank === 'yparchigos' }" @click="form.rank = 'yparchigos'">{{ t('yparchigos') }}</button>
                </div>
              </div>
              <div>
                <label class="lab">{{ t('scopeWord') }}</label>
                <div class="chips">
                  <button class="chip" :class="{ on: form.leaderScope === 'troop' }" @click="form.leaderScope = 'troop'; form.leaderSectionId = 0">{{ t('wholeTroop') }}</button>
                  <button v-for="sec in data?.sections" :key="sec.id" class="chip"
                          :class="{ on: form.leaderScope === 'section' && form.leaderSectionId === sec.id }"
                          @click="form.leaderScope = 'section'; form.leaderSectionId = sec.id">{{ lx(sec, 'name') }}</button>
                </div>
              </div>
            </template>
            <div v-else-if="patrolsOf.length">
              <label class="lab">{{ t('patrol') }}</label>
              <div class="chips">
                <button v-for="p in patrolsOf" :key="p.id" class="chip" :class="{ on: form.patrolId === p.id }"
                        @click="form.patrolId = form.patrolId === p.id ? 0 : p.id">{{ p.emblem }} {{ lx(p, 'name') }}</button>
              </div>
            </div>

            <button class="btn" :disabled="!canCreate" @click="createScout">{{ t('create') }}</button>
          </template>
        </div>
      </div>

      <div v-if="editingPatrol" class="sheet-backdrop" @click.self="editingPatrol = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ editingPatrol.id ? t('editTeam') : t('newTeam') }}</h3>
          <div><label class="lab">{{ t('titleEl') }}</label><input v-model="editingPatrol.nameEl" class="in"></div>
          <div><label class="lab">{{ t('titleEn') }}</label><input v-model="editingPatrol.nameEn" class="in" :placeholder="t('enOptional')"></div>
          <div v-if="editingPatrol.id"><label class="lab">{{ t('icon') }}</label><input v-model="editingPatrol.emblem" class="in"></div>
          <button class="btn" :disabled="!editingPatrol.nameEl" @click="savePatrol">{{ t('save') }}</button>
          <button v-if="editingPatrol.id" class="btn danger" @click="deletePatrol">{{ t('deleteTeam') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.sector-hdr{ cursor:pointer }
.sector-hdr .chev{ transition:transform .2s }
.sector-hdr .chev.open{ transform:rotate(90deg) }
</style>
