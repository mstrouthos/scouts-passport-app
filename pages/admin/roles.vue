<script setup lang="ts">
const { t } = useI18n()
const me = useMe()
const lx = useLx()
const name = useName()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/roles')
const isTroopLeader = computed(() => data.value?.isTroopLeader)
const route = useRoute()

const editing = ref<any>(null)
const appointing = ref(false)
const pick = reactive({ scope: 'section' as 'troop' | 'section', sectionId: 0, rank: 'archigos' as 'archigos' | 'yparchigos' })
const rotated = ref<string | null>(null)
const smsOnRotate = ref(false)
const rotateSmsOutcome = ref<'sent' | 'failed' | null>(null)
const editingContact = ref(false)
const contact = reactive({ firstName: '', lastName: '', firstNameEn: '', lastNameEn: '', phone: '', idNumber: '' })
const addingScope = ref(false)
const newScope = reactive({ sectionId: 0, patrolId: 0, rank: 'archigos' as 'archigos' | 'yparchigos' })
const notifyText = ref('')

async function refreshAndResync() {
  await refresh()
  if (editing.value) editing.value = data.value?.leaders?.find((l: any) => l.id === editing.value.id) ?? null
}

// ----- troop leader: appoint/edit section-level Βαθμοφόροι -----
function open(l: any) {
  editing.value = l; rotated.value = null; editingContact.value = false; addingScope.value = false; notifyText.value = ''
  smsOnRotate.value = false; rotateSmsOutcome.value = null
  contact.firstName = l.firstName || ''; contact.lastName = l.lastName || ''
  contact.firstNameEn = l.firstNameEn || ''; contact.lastNameEn = l.lastNameEn || ''
  contact.phone = l.phone || ''; contact.idNumber = l.idNumber || ''
  const sc = l.scopes?.[0]
  pick.scope = sc?.scope === 'troop' || l.role === 'troop_leader' ? 'troop' : 'section'
  pick.sectionId = sc?.sectionId ?? 0   // force an explicit choice — no silent default
  pick.rank = sc?.rank === 'yparchigos' ? 'yparchigos' : 'archigos'
  newScope.sectionId = 0; newScope.patrolId = 0; newScope.rank = 'archigos'
}
onMounted(() => {
  const openId = Number(route.query.open)
  if (isTroopLeader.value && Number.isInteger(openId)) {
    const l = data.value?.leaders?.find((x: any) => x.id === openId)
    if (l && l.id !== me.value?.id) open(l)
  }
})
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
  rotateSmsOutcome.value = null
  if (smsOnRotate.value && editing.value?.phone) {
    const res = await $fetch<any>(`/api/admin/scouts/${scoutId}/invite`, { method: 'POST' })
    rotated.value = res.passcode
    rotateSmsOutcome.value = res.sent ? 'sent' : 'failed'
  } else {
    const res = await $fetch<any>(`/api/admin/scouts/${scoutId}/passcode`, { method: 'POST' })
    rotated.value = res.passcode
  }
}
async function saveContact() {
  await $fetch(`/api/admin/scouts/${editing.value.id}`, {
    method: 'PATCH',
    body: {
      firstName: contact.firstName, lastName: contact.lastName,
      firstNameEn: contact.firstNameEn, lastNameEn: contact.lastNameEn,
      phone: contact.phone, idNumber: contact.idNumber
    }
  })
  editingContact.value = false
  await refreshAndResync(); show('✅ ' + t('saved'))
}
async function submitAddScope() {
  try {
    await $fetch('/api/admin/roles', {
      method: 'POST',
      body: {
        action: 'addScope', scoutId: editing.value.id, rank: newScope.rank,
        scope: isTroopLeader.value ? (newScope.sectionId ? 'section' : 'troop') : 'patrol',
        sectionId: newScope.sectionId || undefined, patrolId: newScope.patrolId || undefined
      }
    })
    addingScope.value = false
    await refreshAndResync(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
async function removeScope(scopeId: number) {
  if (!confirm(t('confirmRemoveScope'))) return
  try {
    await $fetch('/api/admin/roles', { method: 'POST', body: { action: 'removeScope', scopeId } })
    await refreshAndResync(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
async function deleteLeader() {
  if (!confirm(t('confirmDeleteLeader'))) return
  try {
    await $fetch('/api/admin/roles', { method: 'POST', body: { action: 'delete', scoutId: editing.value.id } })
    editing.value = null
    await refresh(); show('🗑️ ' + t('deleted'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
async function sendNotify() {
  const text = notifyText.value.trim()
  if (!text) return
  try {
    const res = await $fetch<any>(`/api/admin/scouts/${editing.value.id}/notify`, { method: 'POST', body: { text } })
    show(res.sent ? '📩 ' + t('notifSentOk') : t('smsNotConfigured'))
    notifyText.value = ''
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
function scopeChipLabel(sc: any) {
  if (sc.scope === 'troop') return t('wholeTroop')
  if (sc.scope === 'patrol') {
    const p = data.value?.patrols?.find((x: any) => x.id === sc.patrolId)
    return p ? `${p.emblem} ${lx(p, 'name')}` : t('wholeTroop')
  }
  const sec = data.value?.sections?.find((x: any) => x.id === sc.sectionId)
  return sec ? lx(sec, 'name') : t('wholeTroop')
}
function scopeRankLabel(sc: any) {
  if (sc.scope === 'patrol') return sc.rank === 'yparchigos' ? t('yparchigosEnomotias') : t('archigosEnomotias')
  return sc.rank === 'yparchigos' ? t('yparchigos') : t('archigos')
}
function avatarTone(l: any) {
  if (l.role === 'troop_leader') return 'gold'
  return l.scopes?.[0]?.rank === 'yparchigos' ? 'blue' : 'green'
}
function summaryLabel(l: any) {
  if (l.role === 'troop_leader') return t('troopLeader')
  if (!l.scopes?.length) return t('noRoles')
  return l.scopes.map((sc: any) => `${scopeRankLabel(sc)} · ${scopeChipLabel(sc)}`).join(' · ')
}
function appoint(r: any) { appointing.value = false; open({ ...r, role: 'leader', scopes: [], phone: null, idNumber: null }) }

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
          <Avatar :name="name(l)" :tone="avatarTone(l)" />
          <div style="flex:1;min-width:0"><b>{{ name(l) }}</b><span>{{ summaryLabel(l) }}</span></div>
          <span v-if="l.scopes?.length > 1" class="pill live">{{ l.scopes.length }}×</span>
          <span class="chev">›</span>
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
          <Avatar :name="name(l)" :tone="l.rank === 'yparchigos' ? 'blue' : 'green'" />
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
      <!-- troop leader: full leader profile sheet -->
      <div v-if="editing" class="sheet-backdrop" @click.self="editing = null; rotated = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:88dvh;overflow:auto">
          <div style="display:flex;align-items:center;gap:12px">
            <Avatar :name="name(editing)" :tone="avatarTone(editing)" />
            <h3 style="margin:0;font-size:17px;flex:1">{{ name(editing) }}</h3>
          </div>

          <div class="sec-title" style="margin:0">{{ t('rolesTitle') }}</div>
          <div v-if="editing.scopes?.length" class="adm">
            <div v-for="sc in editing.scopes" :key="sc.id" class="it" style="cursor:default">
              <div style="flex:1"><b>{{ scopeRankLabel(sc) }}</b><span>{{ scopeChipLabel(sc) }}</span></div>
              <button class="chip" style="flex:none;color:var(--danger)" @click="removeScope(sc.id)">✕</button>
            </div>
          </div>
          <div v-else class="tiny muted">{{ t('noRoles') }}</div>

          <template v-if="addingScope">
            <div>
              <label class="lab">{{ isTroopLeader ? t('assignScope') : t('rankWord') }}</label>
              <div v-if="isTroopLeader" class="chips">
                <button class="chip" :class="{ on: !newScope.sectionId }" @click="newScope.sectionId = 0">{{ t('wholeTroop') }}</button>
                <button v-for="sec in data?.sections" :key="sec.id" class="chip" :class="{ on: newScope.sectionId === sec.id }"
                        @click="newScope.sectionId = sec.id">{{ lx(sec, 'name') }}</button>
              </div>
              <div v-else class="chips">
                <button v-for="p in data?.patrols" :key="p.id" class="chip" :class="{ on: newScope.patrolId === p.id }"
                        @click="newScope.patrolId = p.id">{{ p.emblem }} {{ lx(p, 'name') }}</button>
              </div>
            </div>
            <div class="seg">
              <button :class="{ on: newScope.rank === 'archigos' }" @click="newScope.rank = 'archigos'">{{ t('archigos') }}</button>
              <button :class="{ on: newScope.rank === 'yparchigos' }" @click="newScope.rank = 'yparchigos'">{{ t('yparchigos') }}</button>
            </div>
            <button class="btn" :disabled="!isTroopLeader && !newScope.patrolId" @click="submitAddScope">{{ t('save') }}</button>
          </template>
          <button v-else class="btn ghost" @click="addingScope = true">➕ {{ t('addRole') }}</button>

          <div class="sec-title" style="margin:0">{{ t('contactDetails') }}</div>
          <div class="card" style="display:flex;flex-direction:column;gap:10px">
            <template v-if="editingContact">
              <div><label class="lab">{{ t('firstName') }}</label><input v-model="contact.firstName" class="in"></div>
              <div><label class="lab">{{ t('lastName') }}</label><input v-model="contact.lastName" class="in"></div>
              <div><label class="lab">{{ t('firstName') }} (EN) <span class="tiny muted">({{ t('optional') }})</span></label><input v-model="contact.firstNameEn" class="in"></div>
              <div><label class="lab">{{ t('lastName') }} (EN) <span class="tiny muted">({{ t('optional') }})</span></label><input v-model="contact.lastNameEn" class="in"></div>
              <div><label class="lab">{{ t('phone') }}</label><input v-model="contact.phone" class="in" placeholder="+357 99 123456"></div>
              <div><label class="lab">{{ t('idNumber') }}</label><input v-model="contact.idNumber" class="in"></div>
              <button class="btn" style="margin-top:2px" :disabled="!contact.firstName || !contact.lastName" @click="saveContact">{{ t('save') }}</button>
            </template>
            <template v-else>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div><div class="tiny muted">{{ t('phone') }}</div><b style="font-size:13.5px">{{ editing.phone || '—' }}</b></div>
                <button class="chip" @click="editingContact = true">✎ {{ t('edit') }}</button>
              </div>
            </template>
          </div>

          <div class="sec-title" style="margin:0">{{ t('sendNotification') }}</div>
          <div style="display:flex;gap:8px">
            <input v-model="notifyText" class="in" style="flex:1" :placeholder="t('messagePlaceholder')" @keyup.enter="sendNotify">
            <button class="chip" style="flex:none" :disabled="!notifyText.trim()" @click="sendNotify">{{ t('send') }}</button>
          </div>

          <div v-if="rotated" class="note" style="text-align:center">
            <b>{{ t('passcodeIs') }} <span style="font-variant-numeric:tabular-nums">{{ rotated }}</span></b>
            {{ t('writeItDown') }}
          </div>
          <template v-else>
            <label v-if="editing.phone" class="tiny muted" style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input v-model="smsOnRotate" type="checkbox">
              {{ t('sendSmsOnRegen') }} {{ editing.phone }}
            </label>
            <button class="btn ghost" @click="rotate(editing.id)">🔑 {{ t('newPasscode') }}</button>
          </template>
          <div v-if="rotateSmsOutcome === 'sent'" class="tiny" style="color:var(--green)">📱 {{ t('smsSent') }}</div>
          <div v-else-if="rotateSmsOutcome === 'failed'" class="tiny muted">{{ t('smsNotConfigured') }}</div>
          <button v-if="editing.role !== 'troop_leader' && editing.scopes?.length" class="btn danger" @click="demote(editing.id)">{{ t('demote') }}</button>
          <button v-if="editing.role !== 'troop_leader'" class="btn danger" @click="deleteLeader">🗑️ {{ t('deletePermanently') }}</button>
        </div>
      </div>
      <div v-if="appointing" class="sheet-backdrop" @click.self="appointing = false">
        <div class="sheet" style="display:flex;flex-direction:column;gap:10px;max-height:75dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('makeLeader') }}</h3>
          <div class="adm">
            <button v-for="r in data?.scouts" :key="r.id" class="it" @click="appoint(r)">
              <Avatar :name="name(r)" tone="accent" />
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
                <Avatar :name="name(r)" tone="accent" />
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
