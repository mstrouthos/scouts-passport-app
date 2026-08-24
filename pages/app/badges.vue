<script setup lang="ts">
/* Πτυχία Προσκόπου: what the scout has earned, then everything else folded
   away by category so 51 badges do not become a wall. */
const { t, locale } = useI18n()
const lx = useLx()
const { data } = await useFetch<any>('/api/passport')
const sheet = ref<any>(null)
const openCat = ref<string | null>(null)

const earnedBadges = computed(() => (data.value?.badges || []).filter((b: any) => b.earned))

/* Two ways in. ?badge= comes from the notification that announced an award and
   is worth celebrating; ?open= is an ordinary tap from the dashboard and just
   opens the badge. Watched rather than read once, because arriving while
   already here only changes the query string. */
const route = useRoute()
const router = useRouter()
const party = ref<any>(null)
function findBadge(raw: any) {
  const id = Number(raw)
  return Number.isInteger(id) ? (data.value?.badges || []).find((x: any) => x.id === id) : null
}
watch(() => route.query.badge, (raw) => {
  const b = findBadge(raw)
  if (!b) return
  party.value = b
  sheet.value = b
  router.replace({ query: {} })   // so a refresh does not replay it
}, { immediate: true })
watch(() => route.query.open, (raw) => {
  const b = findBadge(raw)
  if (!b) return
  sheet.value = b
  router.replace({ query: {} })
}, { immediate: true })
/* Every badge stays in its category, earned or not — a category you have
   finished should show as finished rather than emptying out. Earned ones are
   listed first and also appear on their own at the top. */
const byCategory = computed(() => {
  const groups = new Map<string, { slug: string, label: string, emoji: string, items: any[] }>()
  for (const b of (data.value?.badges || [])) {
    const key = b.category || 'other'
    if (!groups.has(key))
      groups.set(key, { slug: key, label: b.categoryEl || t('badges'), emoji: b.categoryEmoji || '🏅', items: [] })
    groups.get(key)!.items.push(b)
  }
  return [...groups.values()].map(g => ({
    ...g,
    items: [...g.items].sort((a, b) => Number(b.earned) - Number(a.earned)),
    earned: g.items.filter(b => b.earned).length,
    done: g.items.length > 0 && g.items.every(b => b.earned)
  }))
})

/* Alternative routes and their lead-in lines are not steps, and the passport
   restarts its numbering after each "ή". */
const sheetSteps = computed(() => {
  let n = 0
  return (sheet.value?.requirementsEl || []).map((text: string) => {
    if (text === '— ή —') { n = 0; return { kind: 'sep', text } }
    if (text.startsWith(':: ')) return { kind: 'lead', text: text.slice(3) }
    return { kind: 'step', n: ++n, text }
  })
})
</script>

<template>
  <AppShell :title="t('scoutBadges')" :sub="`${earnedBadges.length}/${data?.badges?.length ?? 0}`" back="/app">
    <div class="sec-title">{{ t('myBadges') }}</div>
    <div v-if="earnedBadges.length" class="badge-grid">
      <button v-for="b in earnedBadges" :key="b.id" class="btile" @click="sheet = b">
        <span class="disc">{{ b.icon }}</span>
        <span class="lbl">{{ lx(b) }}</span>
      </button>
    </div>
    <div v-else class="empty">{{ t('noBadgesYet') }}</div>

    <div class="sec-title">{{ t('allBadges') }}</div>
    <div v-for="c in byCategory" :key="c.slug" class="catgroup">
      <button class="cathead" :class="{ done: c.done }" @click="openCat = openCat === c.slug ? null : c.slug">
        <span class="cemoji">{{ c.emoji }}</span>
        <span class="clbl">{{ c.label }}</span>
        <span class="cn" :class="{ some: c.earned > 0 }">{{ c.earned }}/{{ c.items.length }}</span>
        <span class="chev">{{ openCat === c.slug ? '⌄' : '›' }}</span>
      </button>
      <div v-if="openCat === c.slug" class="badge-grid" style="margin-top:9px">
        <button v-for="b in c.items" :key="b.id" class="btile" :class="{ off: !b.earned }" @click="sheet = b">
          <span class="disc">{{ b.icon }}</span>
          <span class="lbl">{{ lx(b) }}</span>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <Celebration v-if="party" :emoji="party.icon" :title="lx(party)"
                   :subtitle="t('badgeEarned')" @close="party = null" />
      <div v-if="sheet" class="sheet-backdrop" @click.self="sheet = null">
        <div class="sheet" style="max-height:88dvh;overflow:auto">
          <div style="width:64px;height:64px;border-radius:18px;margin:0 auto 10px;display:grid;place-items:center;font-size:30px"
               :style="sheet.earned ? 'background:linear-gradient(145deg,#FFF6DF,#FBE7B4)' : 'background:#EEF2F6;filter:grayscale(1);opacity:.6'">
            {{ sheet.icon }}
          </div>
          <h3 style="margin:0;text-align:center;font-size:17px">{{ lx(sheet) }}</h3>
          <div class="tiny muted" style="text-align:center;margin-top:3px">
            {{ sheet.earned ? `${t('completedOn')} ${fmtDate(sheet.completedOn, locale)}` : t('notEarned') }}
          </div>
          <p v-if="lx(sheet, 'description')" style="font-size:13px;line-height:1.55;color:#44536B;margin:14px 0 4px;text-align:center">
            {{ lx(sheet, 'description') }}
          </p>

          <template v-if="sheetSteps.length">
            <div class="sec-title" style="margin:14px 0 8px">{{ t('badgeRequirements') }}</div>
            <ul class="breq">
              <li v-for="(r, i) in sheetSteps" :key="i" :class="r.kind">
                <template v-if="r.kind === 'sep'">{{ t('orAlternative') }}</template>
                <template v-else-if="r.kind === 'lead'">{{ r.text }}</template>
                <template v-else><b>{{ r.n }}.</b> {{ r.text }}</template>
              </li>
            </ul>
          </template>

          <button class="btn ghost" style="margin-top:14px" @click="sheet = null">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.catgroup{display:flex; flex-direction:column}
.cathead{
  display:flex; align-items:center; gap:11px; width:100%; text-align:left;
  background:var(--card); border-radius:14px; padding:12px 14px; box-shadow:var(--shadow);
}
.cathead .cemoji{font-size:19px}
.cathead .clbl{flex:1; min-width:0; font-size:13.5px; font-weight:650}
.cathead .cn{
  font-size:11px; font-weight:800; color:var(--muted);
  background:#EEF2F6; border-radius:999px; padding:2px 8px;
}
/* progress reads at a glance: some earned, or the whole category finished */
.cathead .cn.some{background:var(--accent-soft); color:var(--accent-deep)}
.cathead.done{background:linear-gradient(180deg,#F2FBF5,#fff)}
.cathead.done .cn{background:var(--green); color:#fff}
.cathead .chev{color:var(--muted)}
.breq{margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:7px}
.breq li{font-size:12.5px; line-height:1.5; color:#44536B; display:flex; gap:7px}
.breq li b{color:var(--accent); font-weight:800; flex:none}
.breq li.lead{font-weight:700; color:var(--ink)}
.breq li.sep{
  justify-content:center; font-weight:800; color:var(--muted); font-size:11.5px;
  letter-spacing:.08em; text-transform:uppercase; margin:3px 0;
}
</style>
