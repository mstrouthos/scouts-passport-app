<script setup lang="ts">
const { t } = useI18n()
const me = useMe()
const lx = useLx()
const { show } = useToast()
const isTroop = computed(() => me.value?.role === 'troop_leader')
const { data: secs } = await useFetch<any>('/api/admin/quiz-sections')   // only sections that run quizzes

const form = reactive({
  questionEl: '', questionEn: '', explanationEl: '', imageEmoji: '',
  sectionId: null as number | null,
  date: new Date(Date.now() + 86400_000).toISOString().slice(0, 10), time: '17:00', closeDays: 3
})
watchEffect(() => { if (!isTroop.value && form.sectionId === null && secs.value?.length) form.sectionId = secs.value[0].id })
const options = ref([
  { textEl: '', isCorrect: true }, { textEl: '', isCorrect: false }, { textEl: '', isCorrect: false }
])
const valid = computed(() => form.questionEl.trim()
  && options.value.filter(o => o.textEl.trim()).length >= 2
  && options.value.some(o => o.isCorrect && o.textEl.trim()))

function markCorrect(i: number) {
  options.value.forEach((o, j) => { o.isCorrect = j === i })
}
async function publish() {
  const unlocksAt = new Date(`${form.date}T${form.time}`).toISOString()
  const closesAt = form.closeDays ? new Date(new Date(unlocksAt).getTime() + form.closeDays * 86400_000).toISOString() : null
  try {
    await $fetch('/api/admin/challenges', {
      method: 'POST',
      body: {
        questionEl: form.questionEl, questionEn: form.questionEn || null,
        titleEl: form.questionEl.slice(0, 60), explanationEl: form.explanationEl,
        imageEmoji: form.imageEmoji || null,
        sectionId: form.sectionId,
        unlocksAt, closesAt, isPublished: true,
        options: options.value.filter(o => o.textEl.trim())
      }
    })
    show('✅ ' + t('published'))
    navigateTo('/admin/challenges')
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="t('newChallengeT')" back="/admin/challenges">
    <div class="cols-2">
      <div style="display:flex;flex-direction:column;gap:13px">
        <div><label class="lab">{{ t('questionEl') }}</label><textarea v-model="form.questionEl" class="in" rows="2" /></div>
        <div><label class="lab">{{ t('questionEn') }}</label><textarea v-model="form.questionEn" class="in" rows="2" :placeholder="t('enOptional')" /></div>
        <div><label class="lab">{{ t('explanation') }}</label><textarea v-model="form.explanationEl" class="in" rows="2" /></div>
        <div>
          <label class="lab">{{ t('options') }} · {{ t('correctMark') }}: ✓</label>
          <div style="display:flex;flex-direction:column;gap:7px">
            <div v-for="(o, i) in options" :key="i" style="display:flex;gap:7px;align-items:center">
              <button class="opt" style="width:auto;flex:none;padding:10px 12px" :class="{ correct: o.isCorrect }" @click="markCorrect(i)">
                <span class="k">{{ o.isCorrect ? '✓' : '○' }}</span>
              </button>
              <input v-model="o.textEl" class="in" style="flex:1">
            </div>
            <button v-if="options.length < 6" class="btn ghost" style="padding:9px" @click="options.push({ textEl: '', isCorrect: false })">
              + {{ t('addOption') }}
            </button>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:13px">
        <div>
          <label class="lab">{{ t('forSector') }}</label>
          <div class="chips">
            <template v-if="isTroop">
              <button class="chip" :class="{ on: form.sectionId === null }"
                      @click="form.sectionId = null">{{ t('wholeTroop') }}</button>
              <button v-for="sec in secs" :key="sec.id" class="chip"
                      :class="{ on: form.sectionId === sec.id }"
                      @click="form.sectionId = sec.id">{{ lx(sec, 'name') }}</button>
            </template>
            <template v-else>
              <button v-for="sec in secs" :key="sec.id" class="chip" :class="{ on: form.sectionId === sec.id }"
                      @click="form.sectionId = sec.id">{{ lx(sec, 'name') }}</button>
            </template>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <div style="flex:1"><label class="lab">{{ t('points') }}</label><div class="in ro">{{ t('fixedScoring') }}</div></div>
          <div style="flex:1"><label class="lab">Emoji</label><input v-model="form.imageEmoji" class="in" placeholder="🧭"></div>
        </div>
        <div style="display:flex;gap:8px">
          <div style="flex:1.4"><label class="lab">{{ t('unlocks') }}</label><input v-model="form.date" type="date" class="in"></div>
          <div style="flex:1"><label class="lab">&nbsp;</label><input v-model="form.time" type="time" class="in"></div>
        </div>
        <div><label class="lab">{{ t('expires') }} ({{ t('date') }} + N)</label><input v-model.number="form.closeDays" type="number" class="in"></div>
        <button class="btn" :disabled="!valid" @click="publish">{{ t('publishNotify') }}</button>
      </div>
    </div>
  </AppShell>
</template>
