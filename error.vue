<script setup lang="ts">
/* What people see when a request fails.

   The common cause by far is a deploy: the app shell is precached, so an
   installed app opens perfectly and then cannot reach the server for a few
   seconds. Nuxt's default error screen reads like the app is broken, which
   is the wrong story to tell about a restart — so a lost connection or a
   502/503/504 says "being updated, try again in a moment" and offers the
   retry, while a genuine 404 says it plainly. */
const props = defineProps<{ error: any }>()
const { t } = useI18n()

const code = computed(() => Number(props.error?.statusCode) || 0)
const isDeploy = computed(() => [502, 503, 504].includes(code.value) || code.value === 0)
const busy = ref(false)

async function retry() {
  busy.value = true
  await clearError({ redirect: '/' })
}
</script>

<template>
  <div class="wrap">
    <img src="/images/logo-256.png" alt="" class="logo">
    <template v-if="isDeploy">
      <h1>{{ t('errUpdatingTitle') }}</h1>
      <p>{{ t('errUpdatingBody') }}</p>
    </template>
    <template v-else-if="code === 404">
      <h1>{{ t('errNotFoundTitle') }}</h1>
      <p>{{ t('errNotFoundBody') }}</p>
    </template>
    <template v-else>
      <h1>{{ t('errGenericTitle') }}</h1>
      <p>{{ props.error?.message || t('errGenericBody') }}</p>
    </template>
    <button class="btn" :disabled="busy" @click="retry">{{ busy ? t('loading') : t('errRetry') }}</button>
  </div>
</template>

<style scoped>
.wrap{
  min-height:100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:14px; padding:32px 24px; text-align:center; background:var(--grad-auth); color:#fff;
}
.logo{width:84px; height:84px; object-fit:contain}
h1{margin:0; font-size:20px; font-weight:800}
p{margin:0; font-size:14px; line-height:1.6; opacity:.9; max-width:34ch}
.btn{max-width:280px; margin-top:6px}
</style>
