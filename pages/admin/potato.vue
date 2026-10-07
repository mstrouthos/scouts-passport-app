<script setup lang="ts">
/* The hot potato, the whole screen: who has it, what is at stake, and
   everyone on the campsite to throw it to. */
const { t } = useI18n()
</script>

<template>
  <GameScreen game="potato" :title="t('gamePotato')" :sub="t('gamePotatoSub')">
    <LeadersPlayground game="potato" />
  </GameScreen>
</template>
