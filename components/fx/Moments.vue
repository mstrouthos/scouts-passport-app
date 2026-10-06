<script setup lang="ts">
/* What happened while they were away, played when the app opens: each win
   since the last time, one after the other — a medal for a Πτυχίο or a
   sign-off, the collection's card for an item, a card for the rest (points,
   a photo mission, 👏, a place gained, the Ενωμοτία on top, a birthday).
   One already played by tapping its notification is not played twice.
   When they are through, the server remembers where they got to. */
const { t } = useI18n()
const items = ref<any[]>([])
const at = ref('')
const i = ref(0)
const cur = computed(() => items.value[i.value])

async function finish() {
  if (at.value) await $fetch('/api/me/moments/seen', { method: 'POST', body: { at: at.value } }).catch(() => {})
}
onMounted(async () => {
  try {
    const r = await $fetch<any>('/api/me/moments')
    at.value = r.at
    items.value = (r.items || []).filter((m: any) => !(m.type === 'award' && wasCelebrated(m.key)))
    if (!items.value.length) finish()
  } catch { /* nothing to play is fine */ }
})
function next() {
  if (cur.value) markCelebrated(cur.value.key)
  i.value++
  if (i.value >= items.value.length) finish()
}
</script>

<template>
  <template v-if="cur">
    <Teleport v-if="cur.type === 'award'" to="body">
      <Celebration :key="cur.key" :emoji="cur.emoji" :image="cur.image" :title="cur.title"
                   :subtitle="t(cur.kind === 'badge' ? 'badgeEarned' : 'requirementDone')" @close="next" />
    </Teleport>
    <FxRewardUnlocked v-else-if="cur.type === 'reward'" :key="cur.key" :keys="cur.keys" @close="next" />
    <FxMomentCard v-else :key="cur.key" :m="cur" @close="next" />
  </template>
</template>
