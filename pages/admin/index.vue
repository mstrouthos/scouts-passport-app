<script setup lang="ts">
const { t, locale } = useI18n()
const me = useMe()
const lx = useLx()
const roleLabel = computed(() => me.value?.role === 'troop_leader'
  ? (me.value?.isChief ? t('troopLeader') : t('superAdmin'))
  : me.value?.rank === 'yparchigos' ? t('yparchigos') : t('archigos'))
const scopeLabel = computed(() => {
  if (me.value?.role === 'troop_leader' || me.value?.scopeSections === null) return t('allSectors')
  return (me.value?.scopeSections || []).map((x: any) => lx(x, 'name')).join(' · ') || t('allSectors')
})

const name = useName()
const { wordsFor } = useSectorWords()
/* The Αγέλη's and Μικρή Αγέλη's standings sit here, on their own Βαθμοφόροι's
   dashboard: the families read the weekly challenges, never who is ahead.
   Empty for every leader who runs neither sector. */
const { data: standings } = await useFetch<any[]>('/api/admin/pack/standings')

const { show } = useToast()
const editingDetails = ref(false)
const phoneValid = computed(() => !details.phone || /^\+357\d{8}$/.test(details.phone))
const details = reactive({ firstName: '', lastName: '', firstNameEn: '', lastNameEn: '',
  phone: null as string | null, email: '', birthday: '' })
function openDetails() {
  details.firstName = me.value?.firstName || ''; details.lastName = me.value?.lastName || ''
  details.firstNameEn = me.value?.firstNameEn || ''; details.lastNameEn = me.value?.lastNameEn || ''
  details.phone = me.value?.phone || null
  details.email = me.value?.email || ''
  details.birthday = me.value?.birthday || ''
  editingDetails.value = true
}
async function saveDetails() {
  try {
    await $fetch(`/api/admin/scouts/${me.value!.id}`, {
      method: 'PATCH',
      body: {
        firstName: details.firstName, lastName: details.lastName,
        firstNameEn: details.firstNameEn, lastNameEn: details.lastNameEn,
        phone: details.phone, email: details.email, birthday: details.birthday
      }
    })
    await loadMe(); editingDetails.value = false; show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="t('profile')" :sub="roleLabel">

    <div class="pcard">
      <div class="name">{{ me?.firstName }} {{ me?.lastName }}</div>
      <div class="meta">{{ me?.role === 'troop_leader' && me?.isChief ? '👑 ' + t('troopLeader') : roleLabel }}</div>
      <div class="stats"><div class="stat" style="flex:1">
        <b style="font-size:14px;font-weight:600">{{ scopeLabel }}</b>
        <span>{{ t('scopeOf') }}</span>
      </div></div>
    </div>

    <NuxtLink to="/admin/polls" class="banner">
      <div class="ico">🗳️</div>
      <div><b>{{ t('polls') }}</b><span>{{ t('pollsSub') }}</span></div>
      <div class="go">›</div>
    </NuxtLink>

    <template v-for="st in (standings || [])" :key="st.sectionId">
      <div class="sec-title">{{ t('packStandings') }} · {{ lx(st, 'name') }}</div>
      <div class="tiny muted">{{ t('packStandingsNote') }}</div>

      <template v-if="st.patrols.length">
        <div class="sec-title" style="font-size:11px">{{ wordsFor(st.slug).units }}</div>
        <div class="adm">
          <div v-for="(p, i) in st.patrols" :key="p.id" class="it" style="cursor:default">
            <div class="rank">{{ i + 1 }}</div>
            <div style="flex:1;min-width:0"><b>{{ p.emblem }} {{ p.nameEl }}</b><span>{{ p.size }} {{ t('members') }}</span></div>
            <span class="amt">{{ p.points }}</span>
          </div>
        </div>
      </template>

      <div class="sec-title" style="font-size:11px">{{ wordsFor(st.slug).members }}</div>
      <div v-if="st.members.length" class="adm">
        <div v-for="(m, i) in st.members" :key="m.id" class="it" style="cursor:default">
          <div class="rank">{{ i + 1 }}</div>
          <div style="flex:1;min-width:0">
            <b>{{ name(m) }}</b>
            <span>{{ st.patrols.find((p: any) => p.id === m.patrolId)?.nameEl || '—' }}</span>
          </div>
          <span class="amt">{{ m.points }}</span>
        </div>
      </div>
      <div v-else class="tiny muted" style="padding:0 2px">{{ t('noMembersYet') }}</div>
    </template>

    <div class="sec-title">{{ t('contactDetails') }}</div>
    <div v-if="editingDetails" class="card" style="display:flex;flex-direction:column;gap:10px">
      <div><label class="lab">{{ t('firstName') }}</label><input v-model="details.firstName" class="in"></div>
      <div><label class="lab">{{ t('lastName') }}</label><input v-model="details.lastName" class="in"></div>
      <div><label class="lab">{{ t('firstName') }} (EN) <span class="tiny muted">({{ t('optional') }})</span></label><input v-model="details.firstNameEn" class="in"></div>
      <div><label class="lab">{{ t('lastName') }} (EN) <span class="tiny muted">({{ t('optional') }})</span></label><input v-model="details.lastNameEn" class="in"></div>
      <div><label class="lab">{{ t('phone') }}</label><PhoneInput v-model="details.phone" /></div>
      <div><label class="lab">{{ t('email') }}</label><input v-model="details.email" class="in" type="email" inputmode="email"></div>
      <div><label class="lab">{{ t('birthday') }}</label><input v-model="details.birthday" type="date" class="in"></div>
      <button class="btn" :disabled="!details.firstName || !details.lastName || !phoneValid" @click="saveDetails">{{ t('save') }}</button>
    </div>
    <button v-else class="srow" @click="openDetails">
      <div class="ico">✎</div>
      <div class="txt">
        <b>{{ me?.firstName }} {{ me?.lastName }}</b>
        <span>{{ [me?.phone, me?.email, me?.birthday ? fmtDate(me.birthday, locale) : null].filter(Boolean).join(' · ') || t('edit') }}</span>
      </div>
      <span class="chev">›</span>
    </button>

  </AppShell>
</template>

<style scoped>
.rank{
  flex:none; width:24px; height:24px; border-radius:8px; background:#EEF2F6;
  display:grid; place-items:center; font-size:11px; font-weight:800; color:var(--muted);
}
.amt{flex:none; font-weight:800; font-size:14px; color:var(--accent-deep)}
</style>
