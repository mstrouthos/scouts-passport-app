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

const adding = ref(false)
const form = reactive({ firstName: '', lastName: '', sectionId: 0, patrolId: 0 })
const created = ref<{ passcode: string } | null>(null)
const patrolsOf = computed(() =>
  (data.value?.sections || []).find((sec: any) => sec.id === form.sectionId)?.patrols || [])

async function createScout() {
  try {
    const res = await $fetch<any>('/api/admin/scouts', {
      method: 'POST',
      body: { firstName: form.firstName, lastName: form.lastName, sectionId: form.sectionId, patrolId: form.patrolId || null }
    })
    created.value = res
    form.firstName = ''; form.lastName = ''
    await refresh()
  } catch (e: any) { show(e?.data?.message || t('error')) }
}

const rankLabel = (l: any) => l.role === 'troop_leader' ? t('troopLeader')
  : (l.rank === 'yparchigos' ? t('yparchigos') : t('archigos'))

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
    <div class="cols-2">
      <div style="display:flex;flex-direction:column;gap:15px">
        <template v-for="sec in data?.sections" :key="sec.id">
          <div class="sec-title">{{ lx(sec, 'name') }}</div>
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
              <div style="flex:1"><b>{{ name(r) }}</b><span>{{ r.points }} {{ t('pts') }} · {{ r.badges }} {{ t('badges').toLowerCase() }}</span></div>
              <span class="pill" :class="r.isActive ? 'ok' : 'draft'">{{ r.isActive ? t('active') : t('inactive') }}</span>
            </NuxtLink>
            <div v-if="!p.scouts.length" class="tiny muted" style="padding:10px 15px">{{ t('noMembersYet') }}</div>
          </div>
          <button v-if="sec.canManage" class="btn ghost" style="padding:9px" @click="newPatrol(sec.id)">+ {{ t('newTeam') }}</button>
          <div v-if="sec.loose.length" class="adm">
            <div class="hdr">{{ lx(sec, 'name') }}</div>
            <NuxtLink v-for="r in sec.loose" :key="r.id" :to="`/admin/scouts/${r.id}`" class="it">
              <div style="flex:1"><b>{{ name(r) }}</b><span>{{ r.points }} {{ t('pts') }}</span></div>
              <span class="pill" :class="r.isActive ? 'ok' : 'draft'">{{ r.isActive ? t('active') : t('inactive') }}</span>
            </NuxtLink>
          </div>
          <div v-if="!sec.patrols.length && !sec.loose.length" class="empty">{{ t('noMembersYet') }}</div>
        </template>
      </div>
      <div style="display:flex;flex-direction:column;gap:15px">
        <div v-if="data?.leaders" class="adm">
          <div class="hdr">{{ t('vathmoforoi') }}</div>
          <div v-for="r in data.leaders" :key="r.id" class="it">
            <div style="flex:1"><b>{{ name(r) }}</b></div>
            <span class="pill" :class="r.role === 'troop_leader' ? 'sched' : 'live'">{{ rankLabel(r) }}</span>
          </div>
        </div>
        <NuxtLink to="/admin/cards" class="btn ghost">{{ t('printCards') }}</NuxtLink>
      </div>
    </div>

    <button class="fab" :aria-label="t('newScout')" @click="adding = true; form.sectionId = data?.sections?.find(s => s.canManage)?.id || 0">+</button>

    <Teleport to="body">
      <div v-if="adding" class="sheet-backdrop" @click.self="adding = false; created = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('newScout') }}</h3>
          <template v-if="created">
            <div class="note" style="text-align:center">
              <b>{{ t('passcodeIs') }} <span style="font-variant-numeric:tabular-nums">{{ created.passcode }}</span></b>
              {{ t('writeItDown') }}
            </div>
            <button class="btn" @click="adding = false; created = null">{{ t('close') }}</button>
          </template>
          <template v-else>
            <div><label class="lab">{{ t('firstName') }}</label><input v-model="form.firstName" class="in"></div>
            <div><label class="lab">{{ t('lastName') }}</label><input v-model="form.lastName" class="in"></div>
            <div>
              <label class="lab">{{ t('sectionWord') }}</label>
              <div class="chips">
                <button v-for="sec in data?.sections.filter(s => s.canManage)" :key="sec.id" class="chip" :class="{ on: form.sectionId === sec.id }"
                        @click="form.sectionId = sec.id; form.patrolId = 0">{{ lx(sec, 'name') }}</button>
              </div>
            </div>
            <div v-if="patrolsOf.length">
              <label class="lab">{{ t('patrol') }}</label>
              <div class="chips">
                <button v-for="p in patrolsOf" :key="p.id" class="chip" :class="{ on: form.patrolId === p.id }"
                        @click="form.patrolId = form.patrolId === p.id ? 0 : p.id">{{ p.emblem }} {{ lx(p, 'name') }}</button>
              </div>
            </div>
            <button class="btn" :disabled="!form.firstName || !form.lastName || !form.sectionId" @click="createScout">{{ t('create') }}</button>
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
