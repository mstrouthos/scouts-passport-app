<script setup lang="ts">
/* The table cards: one QR per table, print, cut, stand. The code carries the
   table number only, so the same cards serve every event. */
const { t } = useI18n()
const route = useRoute()
const id = Number(route.params.id)
const { data } = await useFetch<any>(`/api/admin/bar/events/${id}/qr`)
</script>

<template>
  <AppShell no-tabs :title="t('barQr')" :sub="data?.event" :back="`/admin/bar/${id}`">
    <div class="note noprint">{{ t('barQrNote') }}</div>
    <button class="btn noprint" @click="typeof window !== 'undefined' && window.print()">🖨 {{ t('print') }}</button>
    <div class="sheet-grid">
      <div v-for="c in data?.tables" :key="c.no" class="qcard">
        <div class="qhead">Τραπέζι <b>{{ c.no }}</b></div>
        <div class="qsvg" v-html="c.svg" />
        <div class="qfoot">Σκανάρετε για το μενού<br>και για να καλέσετε σερβιτόρο</div>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
.sheet-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.qcard{background:#fff;border:1.5px dashed #C9D2E0;border-radius:14px;padding:14px;text-align:center;color:#0F1730;break-inside:avoid}
.qhead{font-size:15px;text-transform:uppercase;letter-spacing:.08em}
.qhead b{display:block;font-size:44px;line-height:1.1}
.qsvg :deep(svg){width:100%;height:auto;max-width:220px;margin:6px auto;display:block}
.qfoot{font-size:12px;color:#4A5670;line-height:1.35}
@media print {
  .noprint{display:none !important}
  .sheet-grid{grid-template-columns:repeat(2,1fr);gap:8mm}
  .qcard{border-color:#999}
}
</style>
