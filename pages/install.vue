<script setup lang="ts">
/* How to put the app on a phone's home screen. Public on purpose: it is linked
   from the SMS that carries someone's access code, before they can sign in. */
const { t, locale, setLocale } = useI18n()
const tab = ref<'ios' | 'android'>('ios')
onMounted(() => {
  // open on whichever platform the reader is holding
  if (/android/i.test(navigator.userAgent)) tab.value = 'android'
})
const IOS = ['installIos1', 'installIos2', 'installIos3', 'installIos4']
const ANDROID = ['installAnd1', 'installAnd2', 'installAnd3', 'installAnd4']
</script>

<template>
  <div class="shell">
    <header class="hero" style="background:var(--grad-auth)">
      <div class="row">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="/images/logo-256.png" alt="" style="width:44px;height:44px;object-fit:contain">
          <div>
            <h1>{{ t('installTitle2') }}</h1>
            <div class="sub">{{ t('troopName') }}</div>
          </div>
        </div>
        <button class="lang" :aria-label="t('language')" @click="setLocale(locale === 'el' ? 'en' : 'el')">
          <b :class="{ on: locale === 'el' }">ΕΛ</b><b :class="{ on: locale === 'en' }">EN</b>
        </button>
      </div>
    </header>

    <main class="content" style="padding-bottom:40px">
      <div class="note">{{ t('installWhy') }}</div>

      <div class="seg">
        <button :class="{ on: tab === 'ios' }" @click="tab = 'ios'">🍎 iPhone</button>
        <button :class="{ on: tab === 'android' }" @click="tab = 'android'">🤖 Android</button>
      </div>

      <ol class="steps">
        <li v-for="(k, i) in (tab === 'ios' ? IOS : ANDROID)" :key="k">
          <span class="n">{{ i + 1 }}</span>
          <span>{{ t(k) }}</span>
        </li>
      </ol>

      <div class="note"><b>💡 {{ t('installTip') }}</b>{{ tab === 'ios' ? t('installIosTip') : t('installAndTip') }}</div>

      <NuxtLink to="/login" class="btn">{{ t('installGoSignIn') }}</NuxtLink>
    </main>
  </div>
</template>

<style scoped>
.steps{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:11px}
.steps li{
  display:flex; gap:12px; align-items:flex-start;
  background:var(--card); border-radius:14px; padding:13px 14px; box-shadow:var(--shadow);
  font-size:13.5px; line-height:1.55;
}
.steps .n{
  flex:none; width:26px; height:26px; border-radius:50%; background:var(--accent);
  color:#fff; display:grid; place-items:center; font-size:12.5px; font-weight:800;
}
</style>
