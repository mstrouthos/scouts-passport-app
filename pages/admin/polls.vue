<script setup lang="ts">
/* Ψηφοφορίες — a question put to the Βαθμοφόροι of a sector, or of the whole
   troop. Who voted for what is open: this is a working group deciding
   something, not a secret ballot. */
const { t, locale } = useI18n()
const lx = useLx()
const name = useName()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/polls')

const composing = ref(false)
const busy = ref(false)
const form = reactive({ questionEl: '', sectionId: null as number | null, isMulti: false, options: ['', ''] })
const openResults = ref<number | null>(null)

const sectionName = (id: number | null) =>
  id == null ? t('wholeTroop') : (data.value?.sections || []).find((x: any) => x.id === id)?.nameEl ?? ''

function openNew() {
  Object.assign(form, {
    questionEl: '', isMulti: false, options: ['', ''],
    sectionId: data.value?.canAskWholeTroop ? null : (data.value?.sections?.[0]?.id ?? null)
  })
  composing.value = true
}
const canSave = computed(() =>
  form.questionEl.trim() && form.options.filter(o => o.trim()).length >= 2)

async function save() {
  if (!canSave.value || busy.value) return
  busy.value = true
  try {
    const res = await $fetch<any>('/api/admin/polls', {
      method: 'POST',
      body: { ...form, options: form.options.map(o => o.trim()).filter(Boolean) }
    })
    composing.value = false
    await refresh()
    show(`🗳️ ${t('pollAsked', { n: res.asked })}`)
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}

async function vote(poll: any, optionId: number) {
  if (poll.isClosed || busy.value) return
  const next = poll.isMulti
    ? (poll.myVotes.includes(optionId) ? poll.myVotes.filter((x: number) => x !== optionId) : [...poll.myVotes, optionId])
    : (poll.myVotes.includes(optionId) ? [] : [optionId])
  busy.value = true
  try {
    await $fetch(`/api/admin/polls/${poll.id}/vote`, { method: 'POST', body: { optionIds: next } })
    await refresh()
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
async function setClosed(poll: any, isClosed: boolean) {
  await $fetch(`/api/admin/polls/${poll.id}`, { method: 'PATCH', body: { isClosed } })
  await refresh()
}
async function remove(poll: any) {
  if (!confirm(t('confirmDeletePoll'))) return
  await $fetch(`/api/admin/polls/${poll.id}`, { method: 'DELETE' })
  await refresh(); show('🗑️ ' + t('deleted'))
}
const share = (o: any, poll: any) => poll.voterCount ? Math.round((o.count / poll.voterCount) * 100) : 0
</script>

<template>
  <AppShell :title="t('polls')" :sub="t('pollsSub')" back="/admin/more">
    <div v-if="!data?.polls?.length" class="empty">{{ t('noPolls') }}</div>

    <div v-for="p in data?.polls || []" :key="p.id" class="poll" :class="{ closed: p.isClosed }">
      <div class="phead">
        <div style="flex:1;min-width:0">
          <b>{{ p.questionEl }}</b>
          <div class="tiny muted">
            {{ sectionName(p.sectionId) }} · {{ p.voterCount }} {{ t('pollVoters') }}
            <template v-if="p.isMulti"> · {{ t('pollMulti') }}</template>
          </div>
        </div>
        <span v-if="p.isClosed" class="pill draft">{{ t('pollClosed') }}</span>
      </div>

      <button v-for="o in p.options" :key="o.id" class="opt" :class="{ mine: p.myVotes.includes(o.id) }"
              :disabled="p.isClosed || busy" @click="vote(p, o.id)">
        <span class="bar" :style="{ width: share(o, p) + '%' }" />
        <span class="lbl">{{ o.textEl }}</span>
        <span class="cnt">{{ o.count }}</span>
      </button>

      <button class="tiny muted" style="align-self:flex-start"
              @click="openResults = openResults === p.id ? null : p.id">
        {{ openResults === p.id ? t('hideWhoVoted') : t('showWhoVoted') }}
      </button>
      <div v-if="openResults === p.id" class="who">
        <div v-for="o in p.options" :key="o.id">
          <b>{{ o.textEl }}:</b>
          <span>{{ o.voters.length ? o.voters.map((v: any) => name(v)).join(', ') : '—' }}</span>
        </div>
      </div>

      <div v-if="p.canManage" style="display:flex;gap:7px">
        <button class="chip" @click="setClosed(p, !p.isClosed)">
          {{ p.isClosed ? t('pollReopen') : t('pollClose') }}
        </button>
        <button class="chip" @click="remove(p)">🗑️</button>
      </div>
    </div>

    <button v-if="data?.canCreate" class="fab" :aria-label="t('newPoll')" @click="openNew">+</button>

    <Teleport to="body">
      <div v-if="composing" class="sheet-backdrop" @click.self="composing = false">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:88dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('newPoll') }}</h3>
          <div><label class="lab">{{ t('pollQuestion') }}</label><input v-model="form.questionEl" class="in"></div>

          <div>
            <label class="lab">{{ t('whoFor') }}</label>
            <div class="chips">
              <button v-if="data?.canAskWholeTroop" class="chip" :class="{ on: form.sectionId === null }"
                      @click="form.sectionId = null">🏕️ {{ t('wholeTroop') }}</button>
              <button v-for="sec in data?.sections" :key="sec.id" class="chip"
                      :class="{ on: form.sectionId === sec.id }" @click="form.sectionId = sec.id">
                {{ lx(sec, 'name') }}
              </button>
            </div>
          </div>

          <div>
            <label class="lab">{{ t('pollOptions') }}</label>
            <div style="display:flex;flex-direction:column;gap:7px">
              <input v-for="(_, i) in form.options" :key="i" v-model="form.options[i]" class="in"
                     :placeholder="`${t('pollOption')} ${i + 1}`">
            </div>
            <button class="chip" style="margin-top:7px" @click="form.options.push('')">+ {{ t('pollAddOption') }}</button>
          </div>

          <label class="tiny muted" style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input v-model="form.isMulti" type="checkbox"> {{ t('pollAllowMulti') }}
          </label>

          <button class="btn" :disabled="!canSave || busy" @click="save">{{ busy ? t('loading') : t('send') }}</button>
          <button class="btn ghost" @click="composing = false">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.poll{
  background:var(--card); border-radius:16px; box-shadow:var(--shadow);
  padding:14px; display:flex; flex-direction:column; gap:9px;
}
.poll.closed{opacity:.75}
.phead{display:flex; gap:10px; align-items:flex-start}
.phead b{font-size:14px; line-height:1.35}

.opt{
  position:relative; overflow:hidden; display:flex; align-items:center; gap:9px;
  border:1.5px solid var(--line); border-radius:12px; padding:10px 12px;
  text-align:left; background:var(--card); width:100%;
}
.opt .bar{
  position:absolute; inset:0 auto 0 0; background:var(--accent-soft);
  transition:width .35s ease;
}
.opt .lbl{position:relative; flex:1; min-width:0; font-size:13px}
.opt .cnt{position:relative; font-weight:800; font-size:12.5px; color:var(--muted)}
.opt.mine{border-color:var(--accent)}
.opt.mine .lbl{font-weight:700; color:var(--accent-deep)}

.who{display:flex; flex-direction:column; gap:5px; font-size:12px; color:var(--muted)}
.who b{color:var(--ink)}
</style>
