<script setup lang="ts">
/* A person's face in the app: a Βαθμοφόρος's photo, or a member's cartoon
   avatar, or — with neither — their initials on a coloured disc. */
import { avatarSvg, type Avatar } from '~/utils/avatar'
const props = defineProps<{
  name: string, tone?: 'accent' | 'green' | 'purple' | 'amber' | 'blue' | 'gold'
  photo?: string | null, avatar?: Partial<Avatar> | null, size?: number
}>()
const initials = computed(() =>
  props.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase())
const uid = 'av' + useId().replace(/[^a-z0-9]/gi, '')
const svg = computed(() => props.avatar ? avatarSvg(props.avatar, uid) : '')
const failed = ref(false)
watch(() => props.photo, () => { failed.value = false })
const dim = computed(() => props.size ? { width: props.size + 'px', height: props.size + 'px', fontSize: Math.round(props.size / 3) + 'px' } : undefined)
</script>

<template>
  <img v-if="photo && !failed" :src="photo" :alt="name" class="avatar pic" :style="dim" loading="lazy" @error="failed = true">
  <div v-else-if="svg" class="avatar art" :style="dim" role="img" :aria-label="name" v-html="svg" />
  <div v-else class="avatar" :class="tone || 'accent'" :style="dim">{{ initials }}</div>
</template>

<style scoped>
.avatar{
  width:38px;height:38px;border-radius:50%;flex:none;display:grid;place-items:center;
  font-size:12.5px;font-weight:700;color:#fff;
}
.avatar.pic{object-fit:cover;background:var(--hair)}
.avatar.art{overflow:hidden}
.avatar.art :deep(svg){width:100%;height:100%;display:block}
.avatar.accent{background:var(--grad-lead)}
.avatar.green{background:linear-gradient(145deg,#5FAE87,#2E7D5B)}
.avatar.purple{background:linear-gradient(145deg,#A97FCB,#7B4FA0)}
.avatar.amber{background:linear-gradient(145deg,#E8BB3E,#C99A18)}
.avatar.blue{background:linear-gradient(145deg,#7FD1EE,#2E86AC)}
.avatar.gold{background:linear-gradient(145deg,#F3D27A,#C99A18)}
</style>
