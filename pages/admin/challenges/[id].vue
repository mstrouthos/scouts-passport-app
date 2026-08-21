<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const name = useName()
const route = useRoute()
const router = useRouter()
const { show } = useToast()
const id = route.params.id
const { data, refresh } = await useFetch<any>(`/api/admin/challenges/${id}/stats`)
const { data: secs } = await useFetch<any>('/api/admin/contacts')   // sections in my scope
const me = useMe()
const isTroop = computed(() => me.value?.role === 'troop_leader')
const K = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ']

// ----- edit -----
const editing = ref(false)
const busy = ref(false)
const form = reactive<any>({
  titleEl: '', questionEl: '', explanationEl: '', imageEmoji: '',
  points: 10, unlocksAt: '', closesAt: '', options: [] as any[], answeredCount: 0,
  sectionId: null as number | null, forLeaders: false
})
/** ISO -> the value a datetime-local input wants, in local time. */
function toLocal(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
async function openEdit() {
  const c = await $fetch<any>(`/api/admin/challenges/${id}`)
  form.titleEl = c.titleEl || ''
  form.questionEl = c.questionEl || ''
  form.explanationEl = c.explanationEl || ''
  form.imageEmoji = c.imageEmoji || ''
  form.points = c.points
  form.unlocksAt = toLocal(c.unlocksAt)
  form.closesAt = toLocal(c.closesAt)
  form.answeredCount = c.answeredCount
  form.sectionId = c.sectionId ?? null
  form.forLeaders = !!c.forLeaders
  form.options = c.options.map((o: any) => ({ textEl: o.textEl, isCorrect: o.isCorrect }))
  editing.value = true
}
const locked = computed(() => form.answeredCount > 0)
function addOption() { form.options.push({ textEl: '', isCorrect: false }) }
function removeOption(i: number) { form.options.splice(i, 1) }
function markCorrect(i: number) { form.options.forEach((o: any, n: number) => { o.isCorrect = n === i }) }
const canSave = computed(() =>
  form.questionEl.trim() &&
  (locked.value || (form.options.length >= 2 &&
    form.options.every((o: any) => o.textEl.trim()) &&
    form.options.filter((o: any) => o.isCorrect).length === 1)))

async function save() {
  busy.value = true
  try {
    const body: any = {
      titleEl: form.titleEl || form.questionEl,
      questionEl: form.questionEl,
      explanationEl: form.explanationEl,
      imageEmoji: form.imageEmoji,
      points: form.points,
      unlocksAt: form.unlocksAt ? new Date(form.unlocksAt).toISOString() : null,
      closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : null,
      sectionId: form.forLeaders ? null : form.sectionId,
      forLeaders: form.forLeaders
    }
    if (!locked.value) body.options = form.options
    await $fetch(`/api/admin/challenges/${id}`, { method: 'PATCH', body })
    editing.value = false
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
async function remove() {
  if (!confirm(t('confirmDeleteQuestion'))) return
  try {
    await $fetch(`/api/admin/challenges/${id}`, { method: 'DELETE' })
    show('🗑️ ' + t('deleted'))
    router.push('/admin/challenges')
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell v-if="data" :title="`#${data.challenge.id} ${lx(data.challenge)}`"
            :sub="`${data.answered}/${data.eligible} ${t('answeredN')} · ${t('results')}`" back="/admin/challenges">
    <template #actions>
      <button class="iconbtn" :aria-label="t('editQuestion')" @click="openEdit">✎</button>
    </template>

    <div class="cols-2">
      <div style="display:flex;flex-direction:column;gap:13px">
        <div style="font-size:14px;font-weight:650;line-height:1.4">{{ lx(data.challenge, 'question') }}</div>
        <div class="card" style="display:flex;flex-direction:column;gap:13px">
          <div v-for="(o, i) in data.options" :key="o.id">
            <div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px" :style="{ fontWeight: o.isCorrect ? 700 : 500 }">
              <span>{{ o.isCorrect ? '✓' : K[i] }}&nbsp; {{ lx(o, 'text') }}</span>
              <span :style="{ color: o.isCorrect ? 'var(--green)' : 'var(--muted)' }">{{ o.count }}</span>
            </div>
            <div class="bar"><i :style="{ width: Math.round(o.count / Math.max(1, data.answered) * 100) + '%', background: o.isCorrect ? 'var(--green)' : '#C4CFDB' }" /></div>
          </div>
        </div>
        <button class="btn ghost" @click="openEdit">✎ {{ t('editQuestion') }}</button>
      </div>
      <div v-if="data.missing.length" style="display:flex;flex-direction:column;gap:13px">
        <div class="sec-title">{{ t('notAnswered') }}</div>
        <div class="adm">
          <div v-for="r in data.missing" :key="r.id" class="it">
            <div style="flex:1"><b>{{ name(r) }}</b><span>{{ lx(r, 'patrol') }}</span></div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="editing" class="sheet-backdrop" @click.self="editing = false">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:88dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('editQuestion') }}</h3>

          <div><label class="lab">{{ t('titleEl') }}</label><input v-model="form.titleEl" class="in"></div>
          <div><label class="lab">{{ t('questionEl') }}</label><textarea v-model="form.questionEl" class="in" rows="3" /></div>
          <div><label class="lab">{{ t('explanation') }}</label><textarea v-model="form.explanationEl" class="in" rows="2" /></div>
          <div style="display:flex;gap:8px">
            <div style="flex:1"><label class="lab">{{ t('icon') }}</label><input v-model="form.imageEmoji" class="in"></div>
            <div style="flex:1"><label class="lab">{{ t('pts') }}</label><input v-model.number="form.points" type="number" class="in"></div>
          </div>
          <div style="display:flex;gap:8px">
            <div style="flex:1"><label class="lab">{{ t('unlocksAtLabel') }}</label><input v-model="form.unlocksAt" type="datetime-local" class="in"></div>
            <div style="flex:1"><label class="lab">{{ t('closesAtLabel') }}</label><input v-model="form.closesAt" type="datetime-local" class="in"></div>
          </div>

          <div>
            <label class="lab">{{ t('forSector') }}</label>
            <div class="chips">
              <button v-if="isTroop" class="chip" :class="{ on: form.sectionId === null && !form.forLeaders }"
                      @click="form.sectionId = null; form.forLeaders = false">{{ t('wholeTroop') }}</button>
              <button v-for="sec in secs" :key="sec.id" class="chip"
                      :class="{ on: form.sectionId === sec.id && !form.forLeaders }"
                      @click="form.sectionId = sec.id; form.forLeaders = false">{{ lx(sec, 'name') }}</button>
              <button v-if="isTroop" class="chip" :class="{ on: form.forLeaders }"
                      @click="form.forLeaders = true">{{ t('vathmoforoi') }}</button>
            </div>
          </div>

          <div class="sec-title" style="margin:0">{{ t('options') }}</div>
          <div v-if="locked" class="note">{{ t('lockedAfterAnswers') }}</div>
          <template v-else>
            <div v-for="(o, i) in form.options" :key="i" style="display:flex;gap:8px;align-items:center">
              <button class="chip" :class="{ on: o.isCorrect }" style="flex:none" @click="markCorrect(i)">
                {{ o.isCorrect ? '✓' : K[i] }}
              </button>
              <input v-model="o.textEl" class="in" style="flex:1">
              <button v-if="form.options.length > 2" class="chip" style="flex:none;color:var(--danger)" @click="removeOption(i)">✕</button>
            </div>
            <button v-if="form.options.length < 6" class="btn ghost" @click="addOption">+ {{ t('addOption') }}</button>
          </template>

          <button class="btn" :disabled="!canSave || busy" @click="save">{{ busy ? t('loading') : t('save') }}</button>
          <button class="btn danger" @click="remove">🗑️ {{ t('deleteQuestion') }}</button>
          <button class="btn ghost" @click="editing = false">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>
