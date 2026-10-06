<script setup lang="ts">
/* A Πτυχίο's picture where it has one, its emoji where it does not. */
const props = defineProps<{ art?: string | null, emoji?: string | null, size?: number, dim?: boolean }>()
</script>

<template>
  <img v-if="props.art" :src="props.art" alt="" class="bi" :class="{ dim }" :style="{ width: (size || 40) + 'px', height: (size || 40) + 'px' }" loading="lazy" decoding="async">
  <span v-else class="be" :style="{ fontSize: Math.round((size || 40) * 0.6) + 'px' }">{{ props.emoji || '🏅' }}</span>
</template>

<style scoped>
.bi{display:block; object-fit:contain; filter:drop-shadow(0 2px 3px rgba(20,40,90,.18))}
.bi.dim{filter:grayscale(1) opacity(.45)}
.be{line-height:1}
</style>
