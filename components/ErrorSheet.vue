<script setup lang="ts">
/* "Κάτι πήγε στραβά!" — shown for any unexpected failure, never with its
   details. The report button only thanks them: the error reached Discord
   when it happened. */
const { t } = useI18n()
const open = useErrorSheet()
const sent = ref(false)
watch(open, v => { if (v) sent.value = false })
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="sheet-backdrop" @click.self="open = false">
      <div class="sheet es">
        <div class="ico">{{ sent ? '✅' : '😕' }}</div>
        <h3>{{ sent ? t('errReportThanks') : t('errSomethingWrong') }}</h3>
        <p>{{ sent ? t('errReportThanksBody') : t('errSomethingWrongBody') }}</p>
        <button v-if="!sent" class="btn" @click="sent = true">📨 {{ t('errSendReport') }}</button>
        <button class="btn ghost" @click="open = false">{{ t('close') }}</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.es{display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center}
.ico{font-size:42px; line-height:1}
h3{margin:0; font-size:18px}
p{margin:0 0 4px; font-size:13.5px; color:var(--muted); line-height:1.5; max-width:34ch}
.es .btn{width:100%}
</style>
