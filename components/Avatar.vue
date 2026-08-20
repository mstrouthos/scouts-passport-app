<script setup lang="ts">
const props = defineProps<{ name: string, tone?: 'accent' | 'green' | 'purple' | 'amber' | 'blue' | 'gold' }>()
const initials = computed(() =>
  props.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase())
</script>

<template>
  <div class="avatar" :class="tone || 'accent'">{{ initials }}</div>
</template>

<style scoped>
.avatar{
  width:38px;height:38px;border-radius:50%;flex:none;display:grid;place-items:center;
  font-size:12.5px;font-weight:700;color:#fff;
}
.avatar.accent{background:var(--grad-lead)}
.avatar.green{background:linear-gradient(145deg,#5FAE87,#2E7D5B)}
.avatar.purple{background:linear-gradient(145deg,#A97FCB,#7B4FA0)}
.avatar.amber{background:linear-gradient(145deg,#E8BB3E,#C99A18)}
.avatar.blue{background:linear-gradient(145deg,#7FD1EE,#2E86AC)}
.avatar.gold{background:linear-gradient(145deg,#F3D27A,#C99A18)}
</style>
