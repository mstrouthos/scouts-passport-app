<script setup lang="ts">
const props = defineProps<{ title: string, sub?: string, back?: string | boolean }>()
const me = useMe()
const route = useRoute()
const router = useRouter()
const { locale, setLocale, t } = useI18n()
const { msg } = useToast()

const isLeader = computed(() => me.value && me.value.role !== 'scout')
const tabs = computed(() => isLeader.value
  ? [
      { to: '/admin', icon: 'shield', label: t('nav.profile') },
      { to: '/admin/scouts', icon: 'people', label: t('nav.scouts') },
      { to: '/admin/events', icon: 'calendar', label: t('nav.events') },
      { to: '/admin/challenges', icon: 'target', label: t('nav.challenges') },
      { to: '/admin/more', icon: 'more', label: t('nav.more') }
    ]
  : [
      { to: '/app', icon: 'passport', label: t('nav.passport') },
      { to: '/app/calendar', icon: 'calendar', label: t('nav.calendar') },
      { to: '/app/challenges', icon: 'target', label: t('nav.challenges') },
      { to: '/app/board', icon: 'trophy', label: t('nav.board') },
      { to: '/app/info', icon: 'infoI', label: t('nav.info') }
    ])
const isOn = (to: string) => to === '/app' || to === '/admin'
  ? route.path === to
  : route.path.startsWith(to)

async function switchLang() {
  const next = locale.value === 'el' ? 'en' : 'el'
  await setLocale(next)
  $fetch('/api/settings', { method: 'PATCH', body: { locale: next } }).catch(() => {})
}
function goBack() {
  if (typeof props.back === 'string') router.push(props.back)
  else router.back()
}
</script>

<template>
  <div class="shell" :class="{ lead: isLeader, 'with-rail': isLeader }">
    <aside v-if="isLeader" class="rail">
      <div class="brand"><span class="mark">⚜️</span> {{ t('appName') }}</div>
      <NuxtLink v-for="tb in tabs" :key="tb.to" :to="tb.to" class="tab" :class="{ on: isOn(tb.to) }">
        <NavIcon :name="tb.icon" /><span class="tlbl">{{ tb.label }}</span>
      </NuxtLink>
      <div class="spacer" />
      <button class="tab" @click="switchLang"><NavIcon name="chat" /><span class="tlbl">{{ locale === 'el' ? 'English' : 'Ελληνικά' }}</span></button>
    </aside>

    <div style="min-width:0;display:flex;flex-direction:column;flex:1">
      <header class="hero">
        <div class="row">
          <div>
            <button v-if="back" class="back" @click="goBack">‹ {{ t('back') }}</button>
            <h1>{{ title }}</h1>
            <div v-if="sub" class="sub">{{ sub }}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <slot name="actions" />
            <button class="lang" :aria-label="t('language')" @click="switchLang">
              <b :class="{ on: locale === 'el' }">ΕΛ</b><b :class="{ on: locale === 'en' }">EN</b>
            </button>
          </div>
        </div>
      </header>

      <main class="content">
        <slot />
      </main>
    </div>

    <nav class="tabbar" aria-label="Navigation">
      <NuxtLink v-for="tb in tabs" :key="tb.to" :to="tb.to" class="tab" :class="{ on: isOn(tb.to) }" :aria-label="tb.label">
        <NavIcon :name="tb.icon" />
      </NuxtLink>
    </nav>

    <div v-if="msg" class="toast">{{ msg }}</div>
  </div>
</template>
