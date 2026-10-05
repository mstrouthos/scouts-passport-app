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
    // the same door every member uses, so one switch governs the lot
    await $fetch('/api/me', {
      method: 'PATCH',
      body: {
        firstName: details.firstName, lastName: details.lastName,
        firstNameEn: details.firstNameEn, lastNameEn: details.lastNameEn,
        phone: details.phone, email: details.email, birthday: details.birthday
      }
    })
    await loadMe(); editingDetails.value = false; show('✅ ' + t('saved'))
  } catch (e: any) { show(errMsg(e)) }
}

/* A Βαθμοφόρος's photo: chosen on the phone, cropped to a square around its
   middle and made small (512 px) before it is sent. */
const photoInput = ref<HTMLInputElement | null>(null)
const photoMenu = ref(false)
const photoBusy = ref(false)
async function squareJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image(); img.src = url; await img.decode()
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const c = document.createElement('canvas'); c.width = c.height = 512
    c.getContext('2d')!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 512, 512)
    return c.toDataURL('image/jpeg', 0.86).split(',')[1]
  } finally { URL.revokeObjectURL(url) }
}
async function pickPhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  photoMenu.value = false
  if (!file) return
  photoBusy.value = true
  try {
    let data: string
    try { data = await squareJpeg(file) } catch { throw friendlyError(t('photoNotImage')) }
    await $fetch('/api/me/photo', { method: 'POST', body: { mime: 'image/jpeg', dataBase64: data } })
    await loadMe(); show('✅ ' + t('saved'))
  } catch (e: any) { show(errMsg(e)) } finally { photoBusy.value = false }
}
async function removePhoto() {
  photoMenu.value = false
  await $fetch('/api/me/photo', { method: 'DELETE' })
  await loadMe(); show('🗑️ ' + t('deleted'))
}
</script>

<template>
  <AppShell :title="t('profile')" :sub="roleLabel">

    <div class="pcard">
      <div class="who">
        <button class="me-photo" :aria-label="t('profilePicture')" :disabled="photoBusy" @click="photoMenu = true">
          <Avatar :name="`${me?.firstName || ''} ${me?.lastName || ''}`" :photo="me?.photo" :avatar="me?.avatar" :size="64" tone="gold" />
          <span class="cam">{{ photoBusy ? '…' : '📷' }}</span>
        </button>
        <input ref="photoInput" type="file" accept="image/*" hidden @change="pickPhoto">
        <div style="min-width:0">
          <div class="name">{{ me?.firstName }} {{ me?.lastName }}</div>
          <div class="meta">{{ me?.role === 'troop_leader' && me?.isChief ? '👑 ' + t('troopLeader') : roleLabel }}</div>
        </div>
      </div>
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
            <span class="amt">{{ p.points }}<small v-if="st.teamScoring === 'average'" class="tiny muted" style="font-weight:500"> {{ t('avg') }}</small></span>
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
    <div v-else-if="me?.canEditSelf === false && me?.role !== 'troop_leader'" class="card">
      <b style="font-size:14px">{{ me?.firstName }} {{ me?.lastName }}</b>
      <div class="tiny muted" style="margin-top:4px">{{ [me?.phone, me?.email].filter(Boolean).join(' · ') || '—' }}</div>
      <div class="tiny muted" style="margin-top:6px">{{ t('selfEditLocked') }}</div>
    </div>
    <button v-else class="srow" @click="openDetails">
      <div class="ico">✎</div>
      <div class="txt">
        <b>{{ me?.firstName }} {{ me?.lastName }}</b>
        <span>{{ [me?.phone, me?.email, me?.birthday ? fmtDate(me.birthday, locale) : null].filter(Boolean).join(' · ') || t('edit') }}</span>
      </div>
      <span class="chev">›</span>
    </button>

    <Teleport to="body">
      <div v-if="photoMenu" class="sheet-backdrop" @click.self="photoMenu = false">
        <div class="sheet" style="display:flex;flex-direction:column;gap:10px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('profilePicture') }}</h3>
          <div class="tiny muted" style="text-align:center">{{ t('profilePictureNote') }}</div>
          <button class="btn" @click="photoInput?.click()">📷 {{ me?.photo ? t('photoChange') : t('photoUpload') }}</button>
          <NuxtLink to="/admin/avatar" class="btn ghost" style="text-align:center;text-decoration:none" @click="photoMenu = false">🎨 {{ me?.avatar && !me?.photo ? t('avatarEdit') : t('avatarUseInstead') }}</NuxtLink>
          <button v-if="me?.photo" class="btn danger" @click="removePhoto">🗑 {{ t('photoRemove') }}</button>
          <button class="btn ghost" @click="photoMenu = false">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.who{display:flex; align-items:center; gap:14px}
.me-photo{position:relative; flex:none; border:0; padding:0; background:none; border-radius:50%; box-shadow:0 0 0 3px rgba(255,255,255,.55)}
.cam{position:absolute; right:-4px; bottom:-4px; width:26px; height:26px; border-radius:50%; background:#fff; display:grid; place-items:center; font-size:13px; box-shadow:0 2px 6px rgba(0,0,0,.2)}
.rank{
  flex:none; width:24px; height:24px; border-radius:8px; background:#EEF2F6;
  display:grid; place-items:center; font-size:11px; font-weight:800; color:var(--muted);
}
.amt{flex:none; font-weight:800; font-size:14px; color:var(--accent-deep)}
</style>
