<script setup lang="ts">
const props = defineProps<{ title: string, sub?: string, back?: string | boolean }>()
const me = useMe()
const route = useRoute()
const router = useRouter()
const { locale, setLocale, t } = useI18n()
const { msg } = useToast()
const { items: notifs, unread, load: loadNotifs, markRead } = useNotifications()
const notifOpen = ref(false)
const expanded = ref<number | null>(null)
onMounted(() => loadNotifs())
function toggleNotif(n: any) {
  expanded.value = expanded.value === n.id ? null : n.id
  if (!n.read) markRead(n.id)
}
function fmtWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'el-GR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const isLeader = computed(() => me.value && me.value.role !== 'scout')

/* Signing out is one tap from anywhere, but it is easy to hit by accident on
   a phone, so it asks first. */
async function logout() {
  if (!confirm(t('confirmLogout'))) return
  await $fetch('/api/logout', { method: 'POST' })
  useMe().value = null
  useNotifications().reset()
  navigateTo('/login')
}
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

/* Per-section colour applies to everyone, not just leaders: Ομάδα Προσκόπων
   (default/troop-wide) = green, Κοινότητα Ανιχνευτών = purple, Αγέλη = amber,
   Μικρή Αγέλη = baby blue. Leaders use their scope's section (scopeSections
   already resolves patrol-level leaders to their patrol's section); scouts
   use their own membership section. */
const mySectionSlug = computed(() => {
  if (!me.value) return null
  return isLeader.value ? (me.value.scopeSections?.[0]?.slug ?? null) : (me.value.section?.slug ?? null)
})
const themeClass = computed(() => {
  const slug = mySectionSlug.value
  if (slug === 'koinotita') return 'theme-koinotita'
  if (slug === 'ageli') return 'theme-ageli'
  if (slug === 'mikri-ageli') return 'theme-mikri-ageli'
  return null // omada / troop-wide / no section = default green
})

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
  <div class="shell" :class="{ lead: !!me, 'with-rail': isLeader, [themeClass]: themeClass }">
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
            <button class="iconbtn" style="position:relative" :aria-label="t('notifications')" @click="notifOpen = true">
              <NavIcon name="bell" />
              <span v-if="unread" class="notif-dot">{{ unread > 9 ? '9+' : unread }}</span>
            </button>
            <button class="lang" :aria-label="t('language')" @click="switchLang">
              <b :class="{ on: locale === 'el' }">ΕΛ</b><b :class="{ on: locale === 'en' }">EN</b>
            </button>
            <button v-if="me" class="iconbtn" :aria-label="t('logout')" @click="logout">
              <NavIcon name="logout" />
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

    <Teleport to="body">
      <div v-if="notifOpen" class="sheet-backdrop" @click.self="notifOpen = false">
        <div class="sheet" style="max-height:80dvh;overflow:auto;display:flex;flex-direction:column;gap:10px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('notifications') }}</h3>
          <template v-if="notifs.length">
            <button v-for="n in notifs" :key="n.id" class="notif-row" :class="{ unread: !n.read }" @click="toggleNotif(n)">
              <div class="notif-dotmark" :class="{ on: !n.read }" />
              <div style="flex:1;min-width:0">
                <div style="display:flex;justify-content:space-between;gap:8px">
                  <b style="font-size:13px">{{ n.title }}</b>
                  <span class="tiny muted" style="flex:none">{{ fmtWhen(n.createdAt) }}</span>
                </div>
                <p style="margin:3px 0 0;font-size:12.5px;color:var(--muted)"
                   :style="expanded === n.id ? 'white-space:normal' : 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis'">
                  {{ n.body }}
                </p>
              </div>
            </button>
          </template>
          <div v-else class="empty">{{ t('noNotifs') }}</div>
          <button class="btn ghost" @click="notifOpen = false">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.notif-dot{
  position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 3px;border-radius:999px;
  background:var(--danger);color:#fff;font-size:9px;font-weight:700;display:grid;place-items:center;line-height:1;
}
.notif-row{
  background:var(--card);border:0;border-radius:16px;padding:11px 13px;display:flex;gap:10px;align-items:flex-start;
  width:100%;text-align:left;box-shadow:var(--shadow-sm);
}
.notif-row.unread{background:var(--accent-soft)}
.notif-dotmark{flex:none;width:8px;height:8px;border-radius:50%;margin-top:5px;background:transparent}
.notif-dotmark.on{background:var(--accent)}
</style>
