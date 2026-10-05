<script setup lang="ts">
const { t, locale } = useI18n()
const me = useMe()
const lx = useLx()
const { show } = useToast()
const isAdmin = computed(() => me.value?.role === 'troop_leader')
const isYparch = computed(() => me.value?.rank === 'yparchigos')
const { data: roster } = await useFetch<any>('/api/admin/contacts')   // sections in my scope
const { data: list, refresh } = await useFetch<any>('/api/admin/announcements')
const { data: groups } = await useFetch<any>('/api/admin/groups')

/* Who it is for: any number of targets at once — 'troop', 'leaders',
   's:<id>' a section, 'g:<id>' a notification group. Tapping one adds it or
   takes it away; the whole system already holds everyone, so it stands alone. */
const targets = ref<string[]>(isAdmin.value ? ['troop'] : (roster.value?.[0] ? [`s:${roster.value[0].id}`] : []))
function toggleTarget(x: string) {
  const on = targets.value.includes(x)
  if (x === 'troop') targets.value = on ? [] : ['troop']
  else targets.value = on ? targets.value.filter(y => y !== x) : [...targets.value.filter(y => y !== 'troop'), x]
}
const picked = (x: string) => targets.value.includes(x)
const text = ref('')
const busy = ref(false)
const viaSms = ref(false)
/* Who hears it: the members, their parents, or both — each toggled on its
   own. Parents are reached through their children, and only the parents of
   scouts: the Βαθμοφόροι alone have none to tell. */
const toMembers = ref(true)
const toParents = ref(false)
const onlyLeaders = computed(() => targets.value.length > 0 && targets.value.every(x => x === 'leaders'))
watch(onlyLeaders, v => { if (v) { toParents.value = false; toMembers.value = true } })
/* one of the two always stays on — a message for no one is not a message */
function toggleReach(which: 'members' | 'parents') {
  if (which === 'members') { if (toMembers.value && !toParents.value) return; toMembers.value = !toMembers.value }
  else { if (toParents.value && !toMembers.value) return; toParents.value = !toParents.value }
}
const whenMode = ref<'now' | 'later'>('now')
const scheduledAt = ref('')
const repeat = ref<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none')

/** Each target's name, for the chips' summary and the list. */
function targetName(x: string) {
  if (x === 'troop') return t('wholeTroop')
  if (x === 'leaders') return t('vathmoforoi')
  if (x.startsWith('g:')) {
    const g = (groups.value || []).find((y: any) => String(y.id) === x.slice(2))
    return g ? `${g.emoji} ${g.nameEl}` : ''
  }
  return lx((roster.value || []).find((y: any) => String(y.id) === x.slice(2)) || {}, 'name')
}
/** Who the message is aimed at, named — parents follow the same targets, so
    the note says whose parents will hear it. */
const targetLabel = computed(() => targets.value.map(targetName).join(' + '))

/** For groups alone, how many people that is, and how many can get an SMS. */
const target = computed(() => {
  if (!targets.value.length || !targets.value.every(x => x.startsWith('g:'))) return null
  const people = new Map<number, any>()
  for (const g of groups.value || [])
    if (targets.value.includes('g:' + g.id)) for (const m of g.members) people.set(m.id, m)
  return { n: people.size, sms: [...people.values()].filter(m => m.phone).length }
})

async function send() {
  busy.value = true
  try {
    const parents = toParents.value && !onlyLeaders.value
    const body: any = {
      textEl: text.value, viaSms: viaSms.value, targets: targets.value,
      toParents: parents, parentsOnly: parents && !toMembers.value
    }
    if (whenMode.value === 'later' && scheduledAt.value) {
      body.scheduledAt = new Date(scheduledAt.value).toISOString()
      if (repeat.value !== 'none') body.repeat = repeat.value
    }
    const res = await $fetch<any>('/api/admin/announcements', { method: 'POST', body })
    show(res.status === 'sent' ? '📣 ' + t('sent')
      : res.status === 'scheduled' ? '🕒 ' + t('scheduledOk')
      : '⏳ ' + t('pendingApproval'))
    text.value = ''
    await refresh()
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}
async function approve(id: number) {
  try {
    await $fetch(`/api/admin/announcements/${id}/approve`, { method: 'POST' })
    show('✅ ' + t('sent'))
    await refresh()
  } catch (e: any) { show(errMsg(e)) }
}
/** A sent one's targets, named by the server — it knows sections outside mine. */
const audLabel = (a: any) => (a.targetNames || [])
  .map((x: any) => `${x.emoji ? x.emoji + ' ' : ''}${lx(x, 'name')}`).join(' + ')
/* The list, five at a time, newest first. */
const PER_PAGE = 5
const page = ref(0)
const pages = computed(() => Math.max(1, Math.ceil((list.value?.length || 0) / PER_PAGE)))
const shown = computed(() => (list.value || []).slice(page.value * PER_PAGE, (page.value + 1) * PER_PAGE))
watch(pages, n => { if (page.value >= n) page.value = n - 1 })
/** When it went out, or was written if it has not yet: date and time. */
const stamp = (iso: string) => `${fmtDate(iso, locale.value)} · ${fmtTime(iso)}`

/* One announcement opened up: everyone it went to, whether the push reached
   their phone, and whether they have opened it since. */
const detail = ref<any>(null)
const detailLoading = ref(false)
async function openDetail(a: any) {
  detail.value = { ...a, members: null }
  detailLoading.value = true
  try { detail.value = await $fetch<any>(`/api/admin/announcements/${a.id}`) }
  catch (e: any) { show(errMsg(e)); detail.value = null }
  finally { detailLoading.value = false }
}
const name = useName()
const OUTCOME: Record<string, string> = { delivered: '📲', failed: '❌', 'no-device': '🔕' }
/** The counts at the top of the sheet: phone, failed, no phone, opened. */
const tally = computed(() => {
  const d = detail.value
  if (!d?.members) return null
  const all = [...d.members.filter((m: any) => !m.isSender || !d.parentsOnly), ...d.parents]
  const n = (o: string) => all.filter((x: any) => x.outcome === o).length
  return { total: all.length, delivered: n('delivered'), failed: n('failed'), none: n('no-device'),
    opened: all.filter((x: any) => x.opened).length, recorded: all.some((x: any) => x.outcome) }
})
/** Why a push failed, in words a leader can act on where it is a known case. */
const why = (e: string) => e.startsWith('subscription expired') ? t('annErrExpired')
  : e.includes('VAPID') ? t('annErrServer') : e

/* failed first — those are the ones worth a look — then no phone, then the rest */
const ORDER: Record<string, number> = { failed: 0, 'no-device': 1, delivered: 2 }
const sorted = (rows: any[]) => [...rows].sort((a, b) =>
  (ORDER[a.outcome] ?? 3) - (ORDER[b.outcome] ?? 3) || (a.firstName || a.name).localeCompare(b.firstName || b.name, 'el'))

/** Channel badges, so it is obvious whether an SMS was involved. */
function channels(a: any) {
  const who = a.parentsOnly ? ' 👪 ' + t('reachParents') + ' ·' : a.toParents ? ' + 👪' : ''
  return (a.viaSms ? '🔔 + 📱' : '🔔') + who
}
</script>

<template>
  <AppShell :title="t('announce')" :sub="isYparch ? t('needsApprovalNote') : t('announceSub')" back="/admin/more">
    <div>
      <label class="lab">{{ t('audience') }}</label>
      <div class="chips">
        <button v-if="isAdmin" class="chip" :class="{ on: picked('troop') }" @click="toggleTarget('troop')">{{ t('wholeTroop') }}</button>
        <button v-for="sec in roster" :key="sec.id" class="chip" :class="{ on: picked('s:' + sec.id) }"
                @click="toggleTarget('s:' + sec.id)">{{ lx(sec, 'name') }}</button>
        <button v-if="isAdmin" class="chip" :class="{ on: picked('leaders') }" @click="toggleTarget('leaders')">{{ t('vathmoforoi') }}</button>
      </div>
      <template v-if="groups?.length">
        <label class="lab" style="margin-top:10px">{{ t('groups') }}</label>
        <div class="chips">
          <button v-for="g in groups" :key="'g' + g.id" class="chip" :class="{ on: picked('g:' + g.id) }"
                  @click="toggleTarget('g:' + g.id)">{{ g.emoji }} {{ g.nameEl }}</button>
        </div>
      </template>
      <NuxtLink to="/admin/groups" class="tiny" style="color:var(--accent-deep);font-weight:650">
        {{ t('manageGroups') }} ›
      </NuxtLink>
    </div>
    <div><label class="lab">{{ t('message') }}</label><textarea v-model="text" class="in" rows="3" /></div>

    <div>
      <label class="lab">{{ t('reachWho') }}</label>
      <div class="chips">
        <button class="chip" :class="{ on: toMembers || onlyLeaders }" :disabled="onlyLeaders" @click="toggleReach('members')">👤 {{ t('reachMembers') }}</button>
        <button v-if="!onlyLeaders" class="chip" :class="{ on: toParents }" @click="toggleReach('parents')">👪 {{ t('parents') }}</button>
      </div>
      <div v-if="targets.length" class="tiny muted" style="margin-top:5px">
        {{ onlyLeaders || !toParents ? t('reachMembersNote')
          : !toMembers ? t('reachParentsNote', { who: targetLabel }) : t('chParentsOn', { who: targetLabel }) }}
      </div>
    </div>

    <div>
      <label class="lab">{{ t('channels') }}</label>
      <div class="chips">
        <button class="chip on" disabled>🔔 {{ t('chPush') }}</button>
        <button class="chip" :class="{ on: viaSms }" @click="viaSms = !viaSms">📱 {{ t('chSms') }}</button>
      </div>
      <div class="tiny muted" style="margin-top:5px">
        {{ viaSms ? t('chSmsOn') : t('chPushOnly') }}
        <template v-if="target && toMembers"> · {{ target.n }} {{ t('members') }}<template v-if="viaSms">, {{ target.sms }} {{ t('withPhone') }}</template></template>
      </div>
    </div>

    <div>
      <label class="lab">{{ t('whenSend') }}</label>
      <div class="seg">
        <button :class="{ on: whenMode === 'now' }" @click="whenMode = 'now'">{{ t('sendNowOpt') }}</button>
        <button :class="{ on: whenMode === 'later' }" @click="whenMode = 'later'">{{ t('sendLaterOpt') }}</button>
      </div>
      <input v-if="whenMode === 'later'" v-model="scheduledAt" type="datetime-local" class="in" style="margin-top:8px">
      <template v-if="whenMode === 'later'">
        <label class="lab" style="margin-top:8px">{{ t('repeatQ') }}</label>
        <div class="chips">
          <button v-for="r in ['none', 'daily', 'weekly', 'monthly', 'yearly']" :key="r" class="chip"
                  :class="{ on: repeat === r }" @click="repeat = r as any">{{ t('repeat_' + r) }}</button>
        </div>
      </template>
      <div v-if="whenMode === 'later' && isYparch" class="tiny muted" style="margin-top:5px">{{ t('scheduleNeedsApproval') }}</div>
    </div>

    <button class="btn" :disabled="!text.trim() || !targets.length || busy || (whenMode === 'later' && !scheduledAt)" @click="send">
      {{ isYparch ? t('submitForApproval') : (whenMode === 'later' ? t('scheduleIt') : t('sendNow')) }}
    </button>

    <template v-if="list?.length">
      <div class="sec-title">{{ t('recent') }}</div>
      <div class="adm">
        <div v-for="a in shown" :key="a.id" class="it" role="button" tabindex="0" style="align-items:flex-start;cursor:pointer"
             @click="openDetail(a)" @keydown.enter="openDetail(a)">
          <div style="flex:1;min-width:0">
            <b>{{ a.textEl }}</b>
            <span>{{ channels(a) }} {{ audLabel(a) }} · {{ a.byFirst }} {{ a.byLast }} ·
              <template v-if="a.status === 'scheduled' && a.scheduledAt">{{ t('scheduledFor') }} {{ stamp(a.scheduledAt) }}<template v-if="a.repeat"> · 🔁 {{ t('repeat_' + a.repeat) }}</template></template>
              <template v-else>{{ stamp(a.sentAt || a.createdAt) }}</template>
            </span>
          </div>
          <button v-if="a.canApprove" class="chip on" style="flex:none" @click.stop="approve(a.id)">✓ {{ t('approveSend') }}</button>
          <span v-else class="pill" :class="a.status === 'sent' ? 'ok' : 'sched'">
            {{ a.status === 'sent' ? t('sent2') : a.status === 'scheduled' ? t('scheduledShort') : t('pendingShort') }}
          </span>
        </div>
      </div>
      <div v-if="pages > 1" class="pager">
        <button class="chip" :disabled="page === 0" @click="page--">‹ {{ t('newer') }}</button>
        <span class="tiny muted">{{ page + 1 }} / {{ pages }}</span>
        <button class="chip" :disabled="page >= pages - 1" @click="page++">{{ t('older') }} ›</button>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="detail" class="sheet-backdrop" @click.self="detail = null">
        <div class="sheet ann" style="max-height:88dvh;overflow:auto">
          <p class="msg">{{ detail.textEl }}</p>
          <dl class="meta">
            <dt>{{ t('audience') }}</dt>
            <dd>{{ audLabel(detail) }}<template v-if="detail.parentsOnly"> · 👪 {{ t('reachParents') }}</template><template v-else-if="detail.toParents"> · 👪 {{ t('reachBoth') }}</template></dd>
            <dt>{{ t('annFrom') }}</dt><dd>{{ detail.by || `${detail.byFirst} ${detail.byLast}` }}</dd>
            <template v-if="detail.approvedBy"><dt>{{ t('annApprovedBy') }}</dt><dd>{{ detail.approvedBy }}</dd></template>
            <dt>{{ detail.status === 'sent' ? t('annSentAt') : t('annWrittenAt') }}</dt>
            <dd>{{ stamp(detail.sentAt || detail.createdAt) }}</dd>
            <template v-if="detail.status === 'scheduled' && detail.scheduledAt"><dt>{{ t('scheduledFor') }}</dt><dd>{{ stamp(detail.scheduledAt) }}</dd></template>
            <template v-if="detail.stats?.smsSent || detail.viaSms"><dt>SMS</dt><dd>{{ detail.stats?.smsSent ?? 0 }}</dd></template>
            <template v-if="detail.stats?.emailed"><dt>Email</dt><dd>{{ detail.stats.emailed }}</dd></template>
          </dl>

          <div v-if="detailLoading" class="tiny muted" style="text-align:center">{{ t('loading') }}</div>
          <template v-else-if="detail.status !== 'sent'">
            <div class="tiny muted" style="text-align:center">{{ t('annNotSentYet') }}</div>
          </template>
          <template v-else-if="tally">
            <div class="tally">
              <span><b>{{ tally.total }}</b>{{ t('annTotal') }}</span>
              <span v-if="tally.recorded"><b>📲 {{ tally.delivered }}</b>{{ t('annDelivered') }}</span>
              <span v-if="tally.recorded"><b>❌ {{ tally.failed }}</b>{{ t('annFailed') }}</span>
              <span v-if="tally.recorded"><b>🔕 {{ tally.none }}</b>{{ t('annNoDevice') }}</span>
              <span><b>👁 {{ tally.opened }}</b>{{ t('annOpened') }}</span>
            </div>
            <div v-if="!tally.recorded" class="tiny muted">{{ t('annNotRecorded') }}</div>

            <template v-if="detail.members.length">
              <div class="sec-title">{{ t('reachMembers') }} · {{ detail.members.length }}</div>
              <div class="who">
                <div v-for="m in sorted(detail.members)" :key="m.id" class="row">
                  <span class="o">{{ OUTCOME[m.outcome] || '·' }}</span>
                  <div style="flex:1;min-width:0">
                    <b>{{ name(m) }}</b>
                    <small v-if="m.isSender"> · {{ t('annYouSender') }}</small>
                    <small v-if="m.isHidden"> · 🧪</small>
                    <small v-if="m.sectionEl"> · {{ lx({ nameEl: m.sectionEl, nameEn: m.sectionEn }, 'name') }}</small>
                    <div v-if="m.outcome === 'failed' && m.error" class="err">{{ why(m.error) }}</div>
                  </div>
                  <span class="seen" :class="{ on: m.opened }" :title="m.opened ? t('annOpened') : t('annNotOpened')">👁</span>
                </div>
              </div>
            </template>
            <template v-if="detail.parents.length">
              <div class="sec-title">{{ t('parents') }} · {{ detail.parents.length }}</div>
              <div class="who">
                <div v-for="p in sorted(detail.parents)" :key="p.id" class="row">
                  <span class="o">{{ OUTCOME[p.outcome] || '·' }}</span>
                  <div style="flex:1;min-width:0">
                    <b>{{ p.name }}</b>
                    <small v-if="p.children.length"> · {{ p.children.join(', ') }}</small>
                    <div v-if="p.outcome === 'failed' && p.error" class="err">{{ why(p.error) }}</div>
                  </div>
                  <span class="seen" :class="{ on: p.opened }" :title="p.opened ? t('annOpened') : t('annNotOpened')">👁</span>
                </div>
              </div>
            </template>
            <div v-if="detail.unnamedSections?.length" class="tiny muted">
              {{ t('annUnnamedParents') }}: {{ detail.unnamedSections.map((x: any) => lx(x, 'name')).join(', ') }}
            </div>
            <div class="tiny muted">{{ t('annLegend') }}</div>
          </template>
          <button class="btn ghost" @click="detail = null">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.pager{display:flex; align-items:center; justify-content:space-between; gap:8px}
.ann{display:flex; flex-direction:column; gap:12px}
.ann .msg{margin:0; font-size:15px; font-weight:700; line-height:1.4; white-space:pre-wrap}
.meta{display:grid; grid-template-columns:auto 1fr; gap:4px 12px; margin:0; font-size:12.5px}
.meta dt{color:var(--muted)}
.meta dd{margin:0; font-weight:600}
.tally{display:flex; flex-wrap:wrap; gap:6px}
.tally span{flex:1 1 0; min-width:56px; background:var(--accent-soft); border-radius:12px; padding:7px 6px;
  display:flex; flex-direction:column; align-items:center; font-size:10.5px; color:var(--muted); text-align:center}
.tally b{font-size:14px; color:var(--ink)}
.ann .sec-title{margin:4px 0 0}
.who{display:flex; flex-direction:column}
.who .row{display:flex; align-items:center; gap:9px; padding:7px 2px; border-top:1px solid var(--hair); font-size:13px}
.who .row:first-child{border-top:0}
.who b{font-weight:650}
.who small{color:var(--muted); font-size:11px}
.who .o{flex:none; width:20px; text-align:center}
.who .err{font-size:11px; color:var(--danger); margin-top:2px; overflow-wrap:anywhere}
.seen{flex:none; opacity:.18; filter:grayscale(1)}
.seen.on{opacity:1; filter:none}
</style>
