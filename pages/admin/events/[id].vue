<script setup lang="ts">
const { t, locale } = useI18n()
const lx = useLx()
const name = useName()
const { show } = useToast()
const route = useRoute()
const id = route.params.id
const { data, refresh } = await useFetch<any>(`/api/admin/events/${id}/review`)
const tab = ref<'att' | 'uni' | 'pts'>('att')
const game = reactive({ patrolId: 0, points: 20, reason: '' })

const byPatrol = computed(() => (data.value?.patrols || [])
  .map((p: any) => ({ p, list: (data.value?.scouts || []).filter((r: any) => r.patrolId === p.id) }))
  .filter((g: any) => g.list.length))
const tally = computed(() => {
  const c = { present: 0, absent: 0, excused: 0 }
  for (const r of data.value?.scouts || []) if (r.attendance) (c as any)[r.attendance]++
  return c
})
const presentList = computed(() => (data.value?.scouts || []).filter((r: any) => r.attendance === 'present'))
const fullCount = computed(() => presentList.value.filter((r: any) => r.uniform === 'full').length)

async function setReview(scoutId: number, patch: any) {
  const r = (data.value?.scouts || []).find((x: any) => x.id === scoutId)
  const body = { scoutId, attendance: r.attendance, uniform: r.uniform, ...patch }
  Object.assign(r, patch)
  await $fetch(`/api/admin/events/${id}/review`, { method: 'POST', body })
}
async function allPresent() {
  for (const r of data.value?.scouts || []) if (!r.attendance) await setReview(r.id, { attendance: 'present' })
  await refresh()
}
async function awardGame() {
  if (!game.patrolId || !game.points) return
  await $fetch(`/api/admin/events/${id}/game`, {
    method: 'POST', body: { patrolId: game.patrolId, points: game.points, reasonEl: game.reason || 'Παιχνίδι' }
  })
  game.patrolId = 0; game.reason = ''
  await refresh(); show('🏆 +' + game.points)
}
const attDefs = [
  { v: 'present', k: '✓', cls: 'g' }, { v: 'absent', k: '✕', cls: 'r' }, { v: 'excused', k: '~', cls: 'a' }
]
const uniDefs = [
  { v: 'full', k: '●', cls: 'g' }, { v: 'partial', k: '◐', cls: 'a' }, { v: 'none', k: '○', cls: 'r' }
]
</script>

<template>
  <AppShell v-if="data" :title="lx(data.event)"
            :sub="`${fmtDate(data.event.startsAt, locale)} · ${t('review')}`" back="/admin/events">
    <div class="seg">
      <button :class="{ on: tab === 'att' }" @click="tab = 'att'">{{ t('attendance') }}</button>
      <button :class="{ on: tab === 'uni' }" @click="tab = 'uni'">{{ t('uniform') }}</button>
      <button :class="{ on: tab === 'pts' }" @click="tab = 'pts'">{{ t('gamePts') }}</button>
    </div>

    <template v-if="tab === 'att'">
      <div style="display:flex;gap:8px">
        <div v-for="(v, k) in tally" :key="k" class="card" style="flex:1;text-align:center;padding:9px 6px">
          <b style="font-size:21px;font-weight:400;font-variant-numeric:tabular-nums">{{ v }}</b>
          <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.05em;font-size:8.5px">{{ t(k + 'N') }}</div>
        </div>
      </div>
      <button class="btn ghost" @click="allPresent">{{ t('allPresent') }}</button>
      <div class="adm">
        <template v-for="g in byPatrol" :key="g.p.id">
          <div class="hdr">{{ g.p.emblem }} {{ lx(g.p, 'name') }}</div>
          <div v-for="r in g.list" :key="r.id" class="it">
            <div style="flex:1"><b>{{ name(r) }}</b></div>
            <div class="st">
              <button v-for="d in attDefs" :key="d.v" :class="[r.attendance === d.v ? 'on ' + d.cls : '']"
                      @click="setReview(r.id, { attendance: d.v })">{{ d.k }}</button>
            </div>
          </div>
        </template>
      </div>
      <div class="tiny muted" style="text-align:center">{{ t('ptsPresent') }}</div>
    </template>

    <template v-else-if="tab === 'uni'">
      <div v-if="!presentList.length" class="empty">{{ t('markAttFirst') }}</div>
      <template v-else>
        <div class="card" style="text-align:center;padding:11px">
          <b style="font-size:20px;color:var(--blue-deep)">{{ fullCount }}/{{ presentList.length }}</b>
          <div class="tiny muted">{{ t('uniFull') }}</div>
        </div>
        <div class="tiny muted" style="text-align:center">{{ t('uniLegend') }}</div>
        <div class="adm">
          <template v-for="g in byPatrol" :key="g.p.id">
            <template v-if="g.list.some(r => r.attendance === 'present')">
              <div class="hdr">{{ g.p.emblem }} {{ lx(g.p, 'name') }}</div>
              <div v-for="r in g.list.filter(x => x.attendance === 'present')" :key="r.id" class="it">
                <div style="flex:1"><b>{{ name(r) }}</b></div>
                <div class="st">
                  <button v-for="d in uniDefs" :key="d.v" :class="[r.uniform === d.v ? 'on ' + d.cls : '']"
                          @click="setReview(r.id, { uniform: d.v })">{{ d.k }}</button>
                </div>
              </div>
            </template>
          </template>
        </div>
        <div class="tiny muted" style="text-align:center">{{ t('onlyPresent') }} {{ t('ptsUniform') }}</div>
      </template>
    </template>

    <template v-else>
      <div><label class="lab">{{ t('winner') }}</label>
        <div class="chips">
          <button v-for="p in data.patrols" :key="p.id" class="chip" :class="{ on: game.patrolId === p.id }"
                  @click="game.patrolId = p.id">{{ p.emblem }} {{ lx(p, 'name') }}</button>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <div style="flex:1"><label class="lab">{{ t('points') }}</label><input v-model.number="game.points" type="number" class="in"></div>
        <div style="flex:2"><label class="lab">{{ t('reason') }}</label><input v-model="game.reason" class="in" :placeholder="t('reasonPh')"></div>
      </div>
      <button class="btn" :disabled="!game.patrolId" @click="awardGame">{{ t('awardPatrol') }}</button>
      <div class="sec-title">{{ t('awardsMade') }}</div>
      <div v-if="data.gameAwards.length" class="adm">
        <div v-for="(a, i) in data.gameAwards" :key="i" class="it">
          <div style="font-size:17px;width:24px;text-align:center">{{ data.patrols.find(p => p.id === a.patrolId)?.emblem }}</div>
          <div style="flex:1"><b>{{ lx(data.patrols.find(p => p.id === a.patrolId), 'name') }}</b><span>{{ lx(a, 'reason') }}</span></div>
          <span style="font-weight:700;color:var(--green)">+{{ a.points }}</span>
        </div>
      </div>
      <div v-else class="empty">{{ t('noAwards') }}</div>
    </template>
  </AppShell>
</template>

<style scoped>
.st{display:flex;gap:5px;flex:none}
.st button{
  width:30px;height:30px;border-radius:9px;border:1.5px solid var(--line);background:#fff;
  font-size:12.5px;font-weight:700;color:#B4BFCC;display:grid;place-items:center;padding:0;transition:.12s;
}
.st button:active{transform:scale(.9)}
.st button.on.g{background:var(--green);border-color:var(--green);color:#fff}
.st button.on.r{background:var(--danger);border-color:var(--danger);color:#fff}
.st button.on.a{background:var(--gold);border-color:var(--gold);color:#4A3505}
</style>
