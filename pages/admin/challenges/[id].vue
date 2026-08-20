<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const name = useName()
const route = useRoute()
const { data } = await useFetch<any>(`/api/admin/challenges/${route.params.id}/stats`)
const K = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ']
</script>

<template>
  <AppShell v-if="data" :title="`#${data.challenge.id} ${lx(data.challenge)}`"
            :sub="`${data.answered}/${data.eligible} ${t('answeredN')} · ${t('results')}`" back="/admin/challenges">
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
  </AppShell>
</template>
