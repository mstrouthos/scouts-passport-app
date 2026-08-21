<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const name = useName()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/groups')
const { data: roster } = await useFetch<any>('/api/admin/scouts')

/** Everyone the leader can put in a group: members plus Βαθμοφόροι. */
const people = computed(() => {
  const secs = roster.value?.sections || []
  const members = secs.flatMap((sec: any) => [
    ...sec.patrols.flatMap((p: any) => p.scouts.map((r: any) => ({ ...r, where: `${p.emblem} ${lx(p, 'name')}` }))),
    ...sec.loose.map((r: any) => ({ ...r, where: lx(sec, 'name') }))
  ])
  const leaders = (roster.value?.leaders || []).map((r: any) => ({ ...r, where: t('vathmoforoi') }))
  return [...members, ...leaders]
})

const editing = ref<any>(null)     // { id?, nameEl, emoji, memberIds:Set }
const busy = ref(false)
function openNew() { editing.value = { nameEl: '', emoji: '🎺', memberIds: new Set<number>() } }
function openEdit(g: any) {
  editing.value = { id: g.id, nameEl: g.nameEl, emoji: g.emoji, memberIds: new Set(g.members.map((m: any) => m.id)) }
}
function toggle(id: number) {
  const next = new Set(editing.value.memberIds)
  next.has(id) ? next.delete(id) : next.add(id)
  editing.value.memberIds = next
}
async function save() {
  const g = editing.value
  busy.value = true
  try {
    let id = g.id
    if (!id) id = (await $fetch<any>('/api/admin/groups', { method: 'POST', body: { nameEl: g.nameEl, emoji: g.emoji } })).id
    await $fetch(`/api/admin/groups/${id}`, {
      method: 'PATCH', body: { nameEl: g.nameEl, emoji: g.emoji, memberIds: [...g.memberIds] }
    })
    editing.value = null
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
async function remove() {
  if (!confirm(t('confirmDeleteGroup'))) return
  try {
    await $fetch(`/api/admin/groups/${editing.value.id}`, { method: 'DELETE' })
    editing.value = null
    await refresh(); show('🗑️ ' + t('deleted'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="t('groups')" :sub="t('groupsSub')" back="/admin/more">
    <div v-if="data?.length" class="adm">
      <button v-for="g in data" :key="g.id" class="it" :disabled="!g.canManage" @click="openEdit(g)">
        <div style="font-size:20px;width:28px;text-align:center">{{ g.emoji }}</div>
        <div style="flex:1;min-width:0">
          <b>{{ g.nameEl }}</b>
          <span>{{ g.members.length }} {{ t('members') }}</span>
        </div>
        <span class="chev">›</span>
      </button>
    </div>
    <div v-else class="empty">{{ t('noGroups') }}</div>
    <div class="tiny muted">{{ t('groupsNote') }}</div>

    <button class="fab" :aria-label="t('newGroup')" @click="openNew">+</button>

    <Teleport to="body">
      <div v-if="editing" class="sheet-backdrop" @click.self="editing = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:88dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ editing.id ? t('editGroup') : t('newGroup') }}</h3>
          <div style="display:flex;gap:8px">
            <div style="width:74px"><label class="lab">{{ t('icon') }}</label><input v-model="editing.emoji" class="in" style="text-align:center"></div>
            <div style="flex:1"><label class="lab">{{ t('groupName') }}</label><input v-model="editing.nameEl" class="in" :placeholder="t('groupNamePh')"></div>
          </div>

          <div class="sec-title" style="margin:0">{{ t('groupMembers') }} · {{ editing.memberIds.size }}</div>
          <div class="adm">
            <button v-for="r in people" :key="r.id" class="it" @click="toggle(r.id)">
              <span class="tick" :class="{ on: editing.memberIds.has(r.id) }">{{ editing.memberIds.has(r.id) ? '✓' : '' }}</span>
              <div style="flex:1;min-width:0"><b>{{ name(r) }}</b><span>{{ r.where }}</span></div>
            </button>
            <div v-if="!people.length" class="tiny muted" style="padding:12px">{{ t('noMembersYet') }}</div>
          </div>

          <button class="btn" :disabled="!editing.nameEl.trim() || busy" @click="save">{{ busy ? t('loading') : t('save') }}</button>
          <button v-if="editing.id" class="btn danger" @click="remove">🗑️ {{ t('deleteGroup') }}</button>
          <button class="btn ghost" @click="editing = null">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.tick{
  width:22px;height:22px;flex:none;border-radius:7px;border:1.5px solid var(--line);
  display:grid;place-items:center;font-size:12px;font-weight:700;color:#fff;background:var(--card);
}
.tick.on{background:var(--accent);border-color:var(--accent)}
</style>
