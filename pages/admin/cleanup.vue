<script setup lang="ts">
/* Clearing the practice data before the app goes live. Its own screen rather
   than a corner of another one: everything here is irreversible, so it gets
   room for the list, the confirmation word and what was actually removed. */
const { t } = useI18n()
const me = useMe()
const { show } = useToast()

const PARTS = ['points', 'attendance', 'notifications', 'announcements', 'events', 'progress', 'logins'] as const
const picked = ref<Set<string>>(new Set())
const word = ref('')
const busy = ref(false)
const done = ref<Record<string, number> | null>(null)

function toggle(k: string) {
  const next = new Set(picked.value)
  next.has(k) ? next.delete(k) : next.add(k)
  picked.value = next
}
async function run() {
  if (!picked.value.size || busy.value) return
  if (!confirm(t('confirmReset', { n: picked.value.size }))) return
  busy.value = true
  try {
    const res = await $fetch<any>('/api/admin/reset', {
      method: 'POST', body: { confirm: word.value, what: [...picked.value] }
    })
    done.value = res.cleared
    picked.value = new Set(); word.value = ''
    show('🧹 ' + t('resetOk'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
</script>

<template>
  <AppShell :title="t('resetTitle')" :sub="t('resetNote')" back="/admin/more">
    <template v-if="me?.role === 'troop_leader'">
      <div class="sec-title">{{ t('resetPick') }}</div>
      <div class="adm">
        <button v-for="k in PARTS" :key="k" class="it" @click="toggle(k)">
          <span class="tick" :class="{ on: picked.has(k) }">{{ picked.has(k) ? '✓' : '' }}</span>
          <div style="flex:1;min-width:0"><b>{{ t('reset_' + k) }}</b><span>{{ t('resetWhat_' + k) }}</span></div>
        </button>
      </div>

      <div v-if="done" class="note">
        <b>{{ t('resetCleared') }}</b>
        {{ Object.entries(done).map(([k, n]) => `${t('reset_' + k)}: ${n}`).join(' · ') }}
      </div>

      <div class="card" style="display:flex;flex-direction:column;gap:11px">
        <div>
          <label class="lab">{{ t('resetConfirmLabel') }}</label>
          <input v-model="word" class="in" placeholder="ΚΑΘΑΡΙΣΜΟΣ">
        </div>
        <button class="btn danger" :disabled="!picked.size || !word.trim() || busy" @click="run">
          {{ busy ? t('loading') : t('resetRun') }}
        </button>
      </div>

      <div class="tiny muted">{{ t('resetKeeps') }}</div>
    </template>
    <div v-else class="empty">{{ t('troopLeaderOnly') }}</div>
  </AppShell>
</template>

<style scoped>
.tick{
  width:22px; height:22px; flex:none; border-radius:7px; border:1.5px solid var(--line);
  display:grid; place-items:center; font-size:12px; font-weight:700; color:#fff; background:var(--card);
}
.tick.on{background:var(--danger); border-color:var(--danger)}
</style>
