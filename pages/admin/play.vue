<script setup lang="ts">
/* The Βαθμοφόροι's playground, the whole screen: throw, shove, hug. */
const { t } = useI18n()
</script>

<template>
  <GameScreen game="throw" :title="t('gameThrow')" :sub="t('gameThrowSub')">
    <LeadersPlayground game="throw" />
  </GameScreen>
</template>
