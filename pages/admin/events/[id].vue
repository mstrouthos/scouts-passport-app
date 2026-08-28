<script setup lang="ts">
const { t, locale } = useI18n()
const lx = useLx()
const name = useName()
const { show } = useToast()
const route = useRoute()
const router = useRouter()
const me = useMe()
const id = route.params.id
const { data, refresh } = await useFetch<any>(`/api/admin/events/${id}/review`)
const tab = ref<'att' | 'uni' | 'pts'>('att')
const game = reactive({ patrolId: 0, scoutId: 0, points: 20, reason: '' })
/* Points go to a whole ενωμοτία or to one scout — never both at once. */
const gameTarget = ref<'patrol' | 'scout'>('patrol')
const gameName = (a: any) => a.scoutId
  ? name((data.value?.scouts || []).find((r: any) => r.id === a.scoutId) || {})
  : lx((data.value?.patrols || []).find((p: any) => p.id === a.patrolId), 'name')
const gameIcon = (a: any) => a.scoutId
  ? '🎖️'
  : (data.value?.patrols || []).find((p: any) => p.id === a.patrolId)?.emblem || '🏆'

// ----- edit / delete -----
const { data: secs } = await useFetch<any>('/api/admin/contacts')
const { data: groups } = await useFetch<any[]>('/api/admin/groups')
const isTroop = computed(() => me.value?.role === 'troop_leader')
const editing = ref(false)
const busy = ref(false)
const meta = ref<any>(null)
const form = reactive<any>({
  titleEl: '', location: '', startsAt: '', endsAt: '', isAllDay: false,
  tracksAttendance: true, scope: 'section', sectionId: null as number | null, groupId: null as number | null
})
function toLocal(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
async function loadMeta() {
  meta.value = await $fetch<any>(`/api/admin/events/${id}`)
  return meta.value
}
onMounted(loadMeta)
async function openEdit() {
  const e = await loadMeta()
  form.titleEl = e.titleEl || ''
  form.location = e.location || ''
  form.startsAt = toLocal(e.startsAt)
  form.endsAt = toLocal(e.endsAt)
  form.isAllDay = !!e.isAllDay
  form.tracksAttendance = !!e.tracksAttendance
  form.scope = e.scope
  form.sectionId = e.sectionId ?? null
  form.groupId = e.groupId ?? null
  editing.value = true
}
async function saveEvent() {
  busy.value = true
  try {
    await $fetch(`/api/admin/events/${id}`, {
      method: 'PATCH',
      body: {
        titleEl: form.titleEl, location: form.location,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        isAllDay: form.isAllDay, tracksAttendance: form.tracksAttendance,
        scope: form.scope, sectionId: form.sectionId, groupId: form.groupId
      }
    })
    editing.value = false
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
async function deleteEvent() {
  if (!confirm(t('confirmDeleteEvent'))) return
  try {
    await $fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
    show('🗑️ ' + t('deleted'))
    router.push('/admin/events')
  } catch (e: any) { show(e?.data?.message || t('error')) }
}

const byPatrol = computed(() => (data.value?.patrols || [])
  .map((p: any) => ({ p, list: (data.value?.scouts || []).filter((r: any) => r.patrolId === p.id) }))
  .filter((g: any) => g.list.length))
const tally = computed(() => {
  const c = { present: 0, excused: 0, absent: 0 }
  for (const r of data.value?.scouts || []) if (r.attendance) (c as any)[r.attendance]++
  return c
})
const presentList = computed(() => (data.value?.scouts || []).filter((r: any) => r.attendance === 'present'))
const fullCount = computed(() => presentList.value.filter((r: any) => r.uniform === 'full').length)

/* Whether the Βαθμοφόροι are coming — their own answer, set before the event
   and quite separate from the attendance they record for the scouts. */
const RSVPS = [
  { v: 'yes', k: '✅', labelKey: 'rsvpYes', cls: 'g' },
  { v: 'maybe', k: '🤔', labelKey: 'rsvpMaybe', cls: 'a' },
  { v: 'no', k: '❌', labelKey: 'rsvpNo', cls: 'r' }
]
const rsvpBusy = ref(false)
async function setRsvp(answer: string) {
  if (rsvpBusy.value) return
  rsvpBusy.value = true
  try {
    await $fetch(`/api/admin/events/${id}/rsvp`, { method: 'POST', body: { answer } })
    await refresh()
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { rsvpBusy.value = false }
}
const rsvpGroups = computed(() => RSVPS.map(r => ({
  ...r, people: (data.value?.rsvps || []).filter((x: any) => x.answer === r.v)
})).concat([{ v: 'none', k: '⏳', labelKey: 'rsvpPending', cls: '',
  people: (data.value?.rsvps || []).filter((x: any) => !x.answer) } as any]))

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
  const toScout = gameTarget.value === 'scout'
  if (!game.points || (toScout ? !game.scoutId : !game.patrolId)) return
  await $fetch(`/api/admin/events/${id}/game`, {
    method: 'POST',
    body: toScout
      ? { scoutId: game.scoutId, points: game.points, reasonEl: game.reason || 'Παιχνίδι' }
      : { patrolId: game.patrolId, points: game.points, reasonEl: game.reason || 'Παιχνίδι' }
  })
  game.patrolId = 0; game.scoutId = 0; game.reason = ''
  await refresh(); show('🏆 +' + game.points)
}
/* These toggles fill with colour and show the glyph in white, so an emoji
   cannot work here. Greek initials read instantly to a leader and keep one
   weight across the three — the old set mixed ✓ and ✕ with a tilde, which is
   punctuation rather than an icon. */
const attDefs = [
  { v: 'present', k: 'Π', cls: 'g', labelKey: 'attPresent' },
  { v: 'excused', k: 'Δ', cls: 'a', labelKey: 'attExcused' },
  { v: 'absent', k: 'Α', cls: 'r', labelKey: 'attAbsent' }
]
// the uniform set stays a filled/half/empty progression, which says "how much"
const uniDefs = [
  { v: 'full', k: '●', cls: 'g', labelKey: 'ptsUniformL' },
  { v: 'partial', k: '◐', cls: 'a', labelKey: 'ptsUniformPartialL' },
  { v: 'none', k: '○', cls: 'r', labelKey: 'ptsUniformNoneL' }
]
</script>

<template>
  <AppShell v-if="data" :title="lx(data.event)"
            :sub="`${fmtDate(data.event.startsAt, locale)} · ${t('review')}`" back="/admin/events">
    <template #actions>
      <button v-if="me?.can?.events !== false" class="iconbtn" :aria-label="t('editEvent')" @click="openEdit">✎</button>
      <button v-if="meta?.canDelete && me?.can?.events !== false" class="iconbtn" :aria-label="t('deleteEvent')" @click="deleteEvent">
        <NavIcon name="trash" />
      </button>
    </template>

    <!-- who among the Βαθμοφόροι is coming -->
    <template v-if="data.canRsvp || data.rsvps?.length">
      <div class="sec-title">{{ t('leadersAttending') }}</div>
      <div class="card" style="display:flex;flex-direction:column;gap:11px">
        <div v-if="data.canRsvp" style="display:flex;flex-direction:column;gap:7px">
          <div class="tiny muted">{{ t('willYouAttend') }}</div>
          <div class="chips">
            <button v-for="r in RSVPS" :key="r.v" class="chip" :class="{ on: data.myRsvp === r.v }"
                    :disabled="rsvpBusy" @click="setRsvp(r.v)">
              <span class="rk">{{ r.k }}</span> {{ t(r.labelKey) }}
            </button>
          </div>
        </div>
        <div v-if="!data.seesRoll && data.canRsvp" class="tiny muted">{{ t('rsvpPrivate') }}</div>
        <div v-for="g in rsvpGroups" :key="g.v">
          <div v-if="g.people.length" class="rgroup">
            <span class="rlbl" :class="g.cls"><span class="rk">{{ g.k }}</span> {{ t(g.labelKey) }} · {{ g.people.length }}</span>
            <span class="rnames">{{ g.people.map((p: any) => name(p)).join(', ') }}</span>
          </div>
        </div>
      </div>
    </template>

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
                      :aria-label="t(d.labelKey)" :title="t(d.labelKey)"
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
                          :aria-label="t(d.labelKey)" :title="t(d.labelKey)"
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
      <div class="seg">
        <button :class="{ on: gameTarget === 'patrol' }" @click="gameTarget = 'patrol'">{{ t('toPatrol') }}</button>
        <button :class="{ on: gameTarget === 'scout' }" @click="gameTarget = 'scout'">{{ t('toScout') }}</button>
      </div>
      <div v-if="gameTarget === 'patrol'"><label class="lab">{{ t('winner') }}</label>
        <div class="chips">
          <button v-for="p in data.patrols" :key="p.id" class="chip" :class="{ on: game.patrolId === p.id }"
                  @click="game.patrolId = p.id">{{ p.emblem }} {{ lx(p, 'name') }}</button>
        </div>
      </div>
      <div v-else><label class="lab">{{ t('whichScout') }}</label>
        <div class="chips">
          <button v-for="r in data.scouts" :key="r.id" class="chip" :class="{ on: game.scoutId === r.id }"
                  @click="game.scoutId = r.id">{{ name(r) }}</button>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <div style="flex:1"><label class="lab">{{ t('points') }}</label><input v-model.number="game.points" type="number" class="in"></div>
        <div style="flex:2"><label class="lab">{{ t('reason') }}</label><input v-model="game.reason" class="in" :placeholder="t('reasonPh')"></div>
      </div>
      <button class="btn" :disabled="gameTarget === 'scout' ? !game.scoutId : !game.patrolId" @click="awardGame">
        {{ gameTarget === 'scout' ? t('awardScout') : t('awardPatrol') }}
      </button>
      <div class="sec-title">{{ t('awardsMade') }}</div>
      <div v-if="data.gameAwards.length" class="adm">
        <div v-for="(a, i) in data.gameAwards" :key="i" class="it">
          <div style="font-size:17px;width:24px;text-align:center">{{ gameIcon(a) }}</div>
          <div style="flex:1"><b>{{ gameName(a) }}</b><span>{{ lx(a, 'reason') }}</span></div>
          <span style="font-weight:700;color:var(--green)">+{{ a.points }}</span>
        </div>
      </div>
      <div v-else class="empty">{{ t('noAwards') }}</div>
    </template>
  
    <Teleport to="body">
      <div v-if="editing" class="sheet-backdrop" @click.self="editing = false">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:88dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('editEvent') }}</h3>

          <div><label class="lab">{{ t('titleEl') }}</label><input v-model="form.titleEl" class="in"></div>
          <div><label class="lab">{{ t('location') }}</label><input v-model="form.location" class="in"></div>
          <div style="display:flex;gap:8px">
            <div style="flex:1"><label class="lab">{{ t('starts') }}</label><input v-model="form.startsAt" type="datetime-local" class="in"></div>
            <div style="flex:1"><label class="lab">{{ t('ends') }}</label><input v-model="form.endsAt" type="datetime-local" class="in"></div>
          </div>
          <label class="tiny muted" style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input v-model="form.isAllDay" type="checkbox"> {{ t('allDay') }}
          </label>
          <label class="tiny muted" style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input v-model="form.tracksAttendance" type="checkbox"> {{ t('tracksAttendance') }}
          </label>

          <div v-if="isTroop || (secs?.length || 0) > 1">
            <label class="lab">{{ t('scopeQ') }}</label>
            <div class="chips">
              <button v-if="isTroop" class="chip" :class="{ on: form.scope === 'troop' }"
                      @click="form.scope = 'troop'; form.sectionId = null">{{ t('wholeTroop') }}</button>
              <button v-for="sec in secs" :key="sec.id" class="chip"
                      :class="{ on: form.scope === 'section' && form.sectionId === sec.id }"
                      @click="form.scope = 'section'; form.sectionId = sec.id">{{ lx(sec, 'name') }}</button>
              <button v-if="isTroop" class="chip" :class="{ on: form.scope === 'leaders' }"
                      @click="form.scope = 'leaders'; form.sectionId = null">🎖️ {{ t('vathmoforoi') }}</button>
              <button v-for="g in groups" :key="'g' + g.id" class="chip"
                      :class="{ on: form.scope === 'group' && form.groupId === g.id }"
                      @click="form.scope = 'group'; form.groupId = g.id">{{ g.emoji }} {{ g.nameEl }}</button>
            </div>
          </div>

          <button class="btn" :disabled="!form.titleEl || !form.startsAt || busy" @click="saveEvent">
            {{ busy ? t('loading') : t('save') }}
          </button>

          <div v-if="meta && !meta.canDelete" class="note">{{ t('eventLocked') }}</div>
          <button v-else class="btn danger" @click="deleteEvent">🗑️ {{ t('deleteEvent') }}</button>
          <button class="btn ghost" @click="editing = false">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.rgroup{display:flex; gap:9px; align-items:flex-start; font-size:12.5px}
.rlbl{
  flex:none; font-weight:800; font-size:11px; border-radius:999px; padding:3px 9px;
  background:#EEF2F6; color:var(--muted);
}
.rlbl.g{background:#E4F5EA; color:#1B7A4B}
.rlbl.a{background:#FBF0D2; color:#8F6C0E}
.rlbl.r{background:#FDECE7; color:var(--danger)}
.rnames{color:var(--muted); line-height:1.5}
/* emoji render taller than the label they sit beside, so pull them into line */
.rk{font-size:.95em; line-height:1; vertical-align:-.06em; margin-right:5px}

.st{display:flex;gap:5px;flex:none}
.st button{
  width:30px;height:30px;border-radius:9px;border:1.5px solid var(--line);background:#fff;
  font-size:13.5px;font-weight:800;color:#8FA0B4;display:grid;place-items:center;padding:0;transition:.12s;
}
.st button:active{transform:scale(.9)}
.st button.on.g{background:var(--green);border-color:var(--green);color:#fff}
.st button.on.r{background:var(--danger);border-color:var(--danger);color:#fff}
.st button.on.a{background:var(--gold);border-color:var(--gold);color:#4A3505}
</style>
