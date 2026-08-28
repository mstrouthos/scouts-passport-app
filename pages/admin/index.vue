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
