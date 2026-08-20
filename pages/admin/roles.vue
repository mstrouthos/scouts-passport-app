<script setup lang="ts">
const { t } = useI18n()
const me = useMe()
const lx = useLx()
const name = useName()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/roles')
const editing = ref<any>(null)
const appointing = ref(false)

async function setScope(scoutId: number, scope: string, patrolId?: number) {
  await $fetch('/api/admin/roles', { method: 'POST', body: { scoutId, role: 'leader', scope, patrolId } })
  await refresh(); await loadMe(); editing.value = null; show('✅ ' + t('saved'))
}
async function demote(scoutId: number) {
  await $fetch('/api/admin/roles', { method: 'POST', body: { scoutId, role: 'scout' } })
  await refresh(); editing.value = null; show('✅ ' + t('saved'))
}
function scopeLabel(l: any) {
  if (l.role === 'troop_leader') return t('troopLeader')
  const sc = l.scopes?.[0]
  if (!sc || sc.scope !== 'patrol') return t('wholeTroop')
  const p = data.value?.patrols.find((x: any) => x.id === sc.patrolId)
  return p ? `${p.emblem} ${lx(p, 'name')}` : t('wholeTroop')
}
</script>

<template>
  <AppShell :title="t('roles')" :sub="t('rolesSub')" back="/admin/more">
    <div class="note"><b>👑 {{ t('troopLeader') }}</b>{{ t('rolesNote') }}</div>
    <div class="adm">
      <div class="hdr">{{ t('leaders') }} · {{ data?.leaders?.length || 0 }}</div>
      <button v-for="l in data?.leaders" :key="l.id" class="it" :disabled="l.id === me?.id" @click="editing = l">
        <div style="flex:1"><b>{{ name(l) }}</b><span>{{ scopeLabel(l) }}</span></div>
        <span class="pill" :class="l.role === 'troop_leader' ? 'sched' : 'live'">
          {{ l.role === 'troop_leader' ? t('troopLeader') : t('leader') }}
        </span>
      </button>
    </div>
    <button class="srow" @click="appointing = true">
      <div class="ico">➕</div><div class="txt"><b>{{ t('makeLeader') }}</b><span>{{ t('pickFromList') }}</span></div><span class="chev">›</span>
    </button>

    <Teleport to="body">
      <div v-if="editing" class="sheet-backdrop" @click.self="editing = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ name(editing) }}</h3>
          <label class="lab">{{ t('assignScope') }}</label>
          <div class="chips">
            <button class="chip" @click="setScope(editing.id, 'troop')">{{ t('wholeTroop') }}</button>
            <button v-for="p in data?.patrols" :key="p.id" class="chip" @click="setScope(editing.id, 'patrol', p.id)">
              {{ p.emblem }} {{ lx(p, 'name') }}
            </button>
          </div>
          <button v-if="editing.role !== 'troop_leader'" class="btn danger" @click="demote(editing.id)">{{ t('demote') }}</button>
        </div>
      </div>
      <div v-if="appointing" class="sheet-backdrop" @click.self="appointing = false">
        <div class="sheet" style="display:flex;flex-direction:column;gap:10px;max-height:75dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('makeLeader') }}</h3>
          <div class="adm">
            <button v-for="r in data?.scouts" :key="r.id" class="it"
                    @click="appointing = false; editing = { ...r, role: 'leader', scopes: [] }; setScope(r.id, 'troop')">
              <div style="flex:1"><b>{{ name(r) }}</b></div><span class="chev">›</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>
