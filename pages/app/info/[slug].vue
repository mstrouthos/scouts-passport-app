<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const route = useRoute()
const { data, error } = await useFetch(`/api/info/${route.params.slug}`)
if (error.value) navigateTo('/app/info')
</script>

<template>
  <AppShell v-if="data" :title="`${data.icon} ${lx(data)}`" :sub="t('info')" back="/app/info">
    <template v-if="data.illustration === 'uniforms'">
      <UniformArt kind="formal" />
    </template>
    <InfoBody :text="lx(data, 'body')" />
    <template v-if="data.illustration === 'uniforms'">
      <UniformArt kind="work" />
    </template>
  </AppShell>
</template>
