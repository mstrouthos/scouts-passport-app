<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const name = useName()
const { show } = useToast()
const { data: rosterData } = await useFetch<any>('/api/admin/scouts')
const sel = ref<number[]>([])
const cards = ref<any[] | null>(null)

const allIds = computed(() => (rosterData.value?.patrols || []).flatMap((p: any) => p.scouts.filter((r: any) => r.isActive).map((r: any) => r.id)))
function toggle(id: number) {
  const i = sel.value.indexOf(id)
  if (i < 0) sel.value.push(id); else sel.value.splice(i, 1)
}
async function generate() {
  try {
    cards.value = await $fetch<any[]>('/api/admin/cards', { method: 'POST', body: { scoutIds: sel.value } })
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
function printPage() { window.print() }
</script>

<template>
  <AppShell :title="t('printCards').replace('🖨️ ', '')" back="/admin/scouts">
    <template v-if="!cards">
      <div class="note">{{ t('cardsNote') }}</div>
      <button class="chip" style="align-self:flex-start" @click="sel = sel.length === allIds.length ? [] : [...allIds]">{{ t('selectAll') }}</button>
      <div class="adm">
        <template v-for="p in rosterData?.patrols" :key="p.id">
          <div class="hdr">{{ p.emblem }} {{ lx(p, 'name') }}</div>
          <button v-for="r in p.scouts.filter(x => x.isActive)" :key="r.id" class="it" @click="toggle(r.id)">
            <span class="chk" :class="{ on: sel.includes(r.id) }">{{ sel.includes(r.id) ? '✓' : '' }}</span>
            <div style="flex:1"><b>{{ name(r) }}</b></div>
          </button>
        </template>
      </div>
      <button class="btn" :disabled="!sel.length" @click="generate">{{ t('cardsFor') }} {{ sel.length }}</button>
    </template>

    <template v-else>
      <div class="cards-grid" id="print-cards">
        <div v-for="c in cards" :key="c.id" class="pcardx">
          <div style="font-size:20px">⚜️</div>
          <b>{{ c.firstName }} {{ c.lastName }}</b>
          <div class="tiny muted">{{ c.emblem }} {{ c.patrolEl }}</div>
          <div class="code">{{ c.passcode }}</div>
        </div>
      </div>
      <button class="btn" @click="printPage">🖨️ {{ t('printNow') }}</button>
      <div class="tiny muted" style="text-align:center">{{ t('writeItDown') }}</div>
    </template>
  </AppShell>
</template>

<style scoped>
.chk{flex:none;width:21px;height:21px;border-radius:7px;border:1.5px solid #C6D2DF;background:#fff;display:grid;place-items:center;font-size:11px;font-weight:700;color:#fff}
.chk.on{background:var(--blue);border-color:var(--blue)}
.cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.pcardx{background:#fff;border:1px dashed #B9C8D8;border-radius:14px;padding:12px;text-align:center;display:flex;flex-direction:column;gap:3px;align-items:center}
.pcardx .code{font-variant-numeric:tabular-nums;font-weight:700;font-size:16px;color:var(--blue-deep);letter-spacing:.06em}
@media print{
  :global(.hero), :global(.tabbar), :global(.rail), .btn, .tiny{display:none !important}
  .cards-grid{grid-template-columns:repeat(3,1fr)}
}
</style>
