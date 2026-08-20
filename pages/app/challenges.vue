<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const { show } = useToast()
const { data, refresh } = await useFetch('/api/challenges')
const picked = ref<number | null>(null)
const busy = ref(false)

const open = computed(() => (data.value || []).find((c: any) => !c.answer && !c.closed))
const rest = computed(() => (data.value || []).filter((c: any) => c !== open.value))
const K = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ']

async function submit() {
  if (picked.value == null || !open.value || busy.value) return
  busy.value = true
  try {
    const res = await $fetch<any>(`/api/challenges/${open.value.id}/answer`, {
      method: 'POST', body: { optionId: picked.value }
    })
    if (res.isCorrect) show(`🎉 +${res.points} ${t('pts')}`)
    picked.value = null
    await refresh()
  } catch (e: any) {
    show(e?.data?.message || t('error'))
  } finally { busy.value = false }
}
function optClass(c: any, o: any) {
  if (!c.answer) return { sel: picked.value === o.id }
  return { correct: o.isCorrect, wrong: c.answer.optionId === o.id && !o.isCorrect }
}
</script>

<template>
  <AppShell :title="t('challenges')">
    <template v-if="open">
      <div v-if="open.imageEmoji" class="card" style="text-align:center;font-size:44px;padding:22px;background:linear-gradient(145deg,#EAF3FE,#D8E8FB)">{{ open.imageEmoji }}</div>
      <div style="font-size:15px;font-weight:650;line-height:1.4">{{ lx(open, 'question') }}</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button v-for="(o, i) in open.options" :key="o.id" class="opt" :class="optClass(open, o)" @click="picked = o.id">
          <span class="k">{{ K[i] }}</span>{{ lx(o, 'text') }}
        </button>
      </div>
      <div class="tiny muted" style="text-align:center">{{ t('oneTry') }}</div>
      <button class="btn" :disabled="picked == null || busy" @click="submit">{{ t('submit') }}</button>
    </template>

    <template v-for="c in rest" :key="c.id">
      <div class="card" style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <b style="font-size:14px">{{ lx(c) }}</b>
          <span v-if="c.answer" class="pill" :class="c.answer.isCorrect ? 'ok' : 'draft'">
            {{ c.answer.isCorrect ? `+${c.answer.points}` : '0' }} {{ t('pts') }}
          </span>
          <span v-else class="pill draft">{{ t('closed') }}</span>
        </div>
        <div style="font-size:13px;line-height:1.4">{{ lx(c, 'question') }}</div>
        <div style="display:flex;flex-direction:column;gap:7px">
          <div v-for="(o, i) in c.options" :key="o.id" class="opt" :class="optClass(c, o)" style="pointer-events:none">
            <span class="k">{{ o.isCorrect ? '✓' : K[i] }}</span>{{ lx(o, 'text') }}
          </div>
        </div>
        <div v-if="lx(c, 'explanation')" class="verdict" :class="{ bad: c.answer && !c.answer.isCorrect }">
          <b>{{ !c.answer ? t('closed') : c.answer.isCorrect ? t('correct') : t('wrong') }}</b>
          <p>{{ lx(c, 'explanation') }}</p>
        </div>
      </div>
    </template>

    <div v-if="!open && !rest.length" class="empty">{{ t('noChallenges') }}</div>
  </AppShell>
</template>
