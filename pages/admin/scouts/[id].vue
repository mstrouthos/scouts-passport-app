<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const name = useName()
const { show } = useToast()
const me = useMe()
const route = useRoute()
const router = useRouter()
const id = route.params.id
const { data, refresh } = await useFetch<any>(`/api/admin/scouts/${id}`)
const newPass = ref<string | null>(null)
const smsOnRegen = ref(false)
const smsOutcome = ref<'sent' | 'failed' | null>(null)
const awarding = ref(false)
const awardDate = ref(new Date().toISOString().slice(0, 10))
const editingContact = ref(false)
const contact = reactive({ phone: null as string | null, idNumber: '' })
watch(data, v => { if (v) { contact.phone = v.phone || null; contact.idNumber = v.idNumber || '' } }, { immediate: true })
/* Heading their own ενωμοτία / όμιλος / εξάδα. It is a title within the unit,
   held by one of its members — it grants nothing in the app. */
const unitBusy = ref(false)
async function setUnitRole(role: string | null) {
  if (unitBusy.value) return
  unitBusy.value = true
  try {
    await $fetch(`/api/admin/scouts/${id}/unit-role`, { method: 'POST', body: { role } })
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { unitBusy.value = false }
}

const contactPhoneValid = computed(() => !contact.phone || /^\+357\d{8}$/.test(contact.phone))

/* Parents live on the child's profile: that link is what lets a notification
   to a section or a group reach the right families. */
const { data: parents, refresh: refreshParents } = await useFetch<any[]>(`/api/admin/scouts/${id}/parents`)
const addingParent = ref(false)
const pForm = reactive({ name: '', email: '', phone: null as string | null })
const pBusy = ref(false)
const parentCode = ref<{ id: number, passcode: string, sent: boolean, via: string } | null>(null)
const pPhoneValid = computed(() => !pForm.phone || /^\+357\d{8}$/.test(pForm.phone))
const pCanSave = computed(() => !!pForm.name.trim() && (!!pForm.email.trim() || !!pForm.phone) && pPhoneValid.value)

function openAddParent() {
  pForm.name = ''; pForm.email = ''; pForm.phone = null
  addingParent.value = true
}
async function saveParent() {
  if (!pCanSave.value || pBusy.value) return
  pBusy.value = true
  try {
    await $fetch('/api/admin/parents', { method: 'POST', body: { ...pForm, scoutId: Number(id) } })
    addingParent.value = false
    await refreshParents(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { pBusy.value = false }
}
async function removeParent(p: any) {
  if (!confirm(t('confirmDeleteParent'))) return
  try {
    await $fetch(`/api/admin/parents/${p.id}`, { method: 'DELETE' })
    await refreshParents(); show('🗑️ ' + t('deleted'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
async function issueParentCode(p: any, via: 'sms' | 'email' | 'none') {
  try {
    const res = await $fetch<any>(`/api/admin/parents/${p.id}/code`, { method: 'POST', body: { via } })
    parentCode.value = { id: p.id, passcode: res.passcode, sent: res.sent, via }
    await refreshParents()
  } catch (e: any) { show(e?.data?.message || t('error')) }
}

async function regen() {
  smsOutcome.value = null
  if (smsOnRegen.value && data.value?.phone) {
    const res = await $fetch<any>(`/api/admin/scouts/${id}/invite`, { method: 'POST' })
    newPass.value = res.passcode
    smsOutcome.value = res.sent ? 'sent' : 'failed'
  } else {
    const res = await $fetch<any>(`/api/admin/scouts/${id}/passcode`, { method: 'POST' })
    newPass.value = res.passcode
  }
}
async function toggleActive() {
  // deactivating stops them signing in, so it asks; reactivating does not
  if (data.value.isActive && !confirm(t('confirmDeactivate'))) return
  await $fetch(`/api/admin/scouts/${id}`, { method: 'PATCH', body: { isActive: !data.value.isActive } })
  await refresh(); show(t('saved'))
}
async function award(badgeId: number) {
  await $fetch(`/api/admin/badges/${badgeId}/award`, {
    method: 'POST', body: { scoutIds: [Number(id)], completedOn: awardDate.value }
  })
  awarding.value = false
  await refresh(); show('🏅 ' + t('awardedOk'))
}
async function saveContact() {
  try {
    await $fetch(`/api/admin/scouts/${id}`, { method: 'PATCH', body: { phone: contact.phone, idNumber: contact.idNumber } })
    editingContact.value = false
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
async function deleteScout() {
  if (!confirm(t('confirmDelete'))) return
  await $fetch(`/api/admin/scouts/${id}`, { method: 'DELETE' })
  show('🗑️ ' + t('deleted'))
  router.push('/admin/scouts')
}
</script>

<template>
  <AppShell v-if="data" :title="name(data)" :sub="data.patrol ? `${data.patrol.emblem} ${lx(data.patrol, 'name')}` : lx(data.section, 'name')" back="/admin/scouts">
    <div class="cols-2">
      <div style="display:flex;flex-direction:column;gap:15px">
        <div class="pcard">
          <div class="name">{{ name(data) }}</div>
          <div class="meta">{{ data.patrol ? lx(data.patrol, 'name') : lx(data.section, 'name') }}</div>
          <div class="stats">
            <div class="stat"><b>{{ data.points }}</b><span>{{ t('points') }}</span></div>
            <div class="stat"><b>{{ data.badges.filter(b => b.earned).length }}/{{ data.badges.length }}</b><span>{{ t('badges') }}</span></div>
            <div class="stat"><b>{{ data.isActive ? '✓' : '—' }}</b><span>{{ t('active') }}</span></div>
          </div>
        </div>

        <template v-if="me?.can?.rosterEdit !== false">
        <div class="sec-title">{{ t('loginCard') }}</div>
        <div class="card" style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="font-size:22px">⚜️</div>
            <div style="flex:1">
              <template v-if="newPass">
                <b style="font-variant-numeric:tabular-nums;font-size:16px;color:var(--accent-deep)">{{ newPass }}</b>
                <div class="tiny muted">{{ t('writeItDown') }}</div>
              </template>
              <template v-else>
                <b>••••-••••</b>
                <div class="tiny muted">{{ t('newPasscodeSub') }}</div>
              </template>
            </div>
            <button class="chip" @click="regen">{{ t('newPasscode') }}</button>
          </div>
          <label v-if="data.phone" class="tiny muted" style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input v-model="smsOnRegen" type="checkbox">
            {{ t('sendSmsOnRegen') }} {{ data.phone }}
          </label>
          <div v-if="smsOutcome === 'sent'" class="tiny" style="color:var(--green)">📱 {{ t('smsSent') }}</div>
          <div v-else-if="smsOutcome === 'failed'" class="tiny muted">{{ t('smsNotConfigured') }}</div>
        </div>

        </template>

        <template v-if="me?.can?.rosterDetails !== false">
        <div class="sec-title">{{ t('contactDetails') }}</div>
        <div class="card" style="display:flex;flex-direction:column;gap:10px">
          <template v-if="editingContact">
            <div><label class="lab">{{ t('phone') }}</label><PhoneInput v-model="contact.phone" /></div>
            <div><label class="lab">{{ t('idNumber') }}</label><input v-model="contact.idNumber" class="in" placeholder="SC-0142"></div>
            <button class="btn" style="margin-top:2px" :disabled="!contactPhoneValid" @click="saveContact">{{ t('save') }}</button>
          </template>
          <template v-else>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div class="tiny muted">{{ t('phone') }}</div>
                <b style="font-size:13.5px">{{ data.phone || '—' }}</b>
              </div>
              <div style="text-align:right">
                <div class="tiny muted">{{ t('idNumber') }}</div>
                <b style="font-size:13.5px;font-variant-numeric:tabular-nums">{{ data.idNumber || '—' }}</b>
              </div>
            </div>
            <button class="chip" style="align-self:flex-start" @click="editingContact = true">✎ {{ t('edit') }}</button>
          </template>
        </div>

        </template>

        <template v-if="me?.can?.parents !== false">
        <div class="sec-title">{{ t('parents') }}</div>
        <div class="card" style="display:flex;flex-direction:column;gap:11px">
          <template v-if="parents?.length">
            <div v-for="p in parents" :key="p.id" class="prow">
              <div style="flex:1;min-width:0">
                <b>{{ p.name }}</b>
                <div class="tiny muted">{{ [p.phone, p.email].filter(Boolean).join(' · ') || '—' }}</div>
                <div v-if="parentCode && parentCode.id === p.id" class="tiny" style="color:var(--accent-deep)">
                  <b style="font-variant-numeric:tabular-nums">{{ parentCode.passcode }}</b>
                  <span v-if="parentCode.via !== 'none'"> · {{ parentCode.sent ? t('sent') : t('smsNotConfigured') }}</span>
                </div>
                <div v-else-if="!p.hasCode" class="tiny muted">{{ t('parentNoCode') }}</div>
              </div>
              <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end">
                <button v-if="p.phone" class="chip" @click="issueParentCode(p, 'sms')">📱</button>
                <button v-if="p.email" class="chip" @click="issueParentCode(p, 'email')">✉️</button>
                <button class="chip" @click="issueParentCode(p, 'none')">🔑</button>
                <button class="chip" @click="removeParent(p)">🗑️</button>
              </div>
            </div>
          </template>
          <div v-else class="tiny muted">{{ t('noParentsYet') }}</div>

          <template v-if="addingParent">
            <div><label class="lab">{{ t('name') }}</label><input v-model="pForm.name" class="in"></div>
            <div><label class="lab">{{ t('email') }}</label><input v-model="pForm.email" class="in" type="email" inputmode="email"></div>
            <div><label class="lab">{{ t('phone') }}</label><PhoneInput v-model="pForm.phone" /></div>
            <div class="tiny muted">{{ t('parentContactHint') }}</div>
            <div style="display:flex;gap:8px">
              <button class="btn" :disabled="!pCanSave || pBusy" @click="saveParent">{{ t('save') }}</button>
              <button class="btn ghost" @click="addingParent = false">{{ t('cancel') }}</button>
            </div>
          </template>
          <button v-else class="chip" style="align-self:flex-start" @click="openAddParent">+ {{ t('addParent') }}</button>
        </div>

        </template>

        <template v-if="me?.can?.rosterEdit !== false && data.patrol">
          <div class="sec-title">{{ data.unit.unitEl }}</div>
          <div class="card" style="display:flex;flex-direction:column;gap:9px">
            <div class="tiny muted">{{ data.patrol.emblem }} {{ lx(data.patrol, 'name') }}</div>
            <div class="chips">
              <button class="chip" :class="{ on: data.patrolRole === 'head' }" :disabled="unitBusy"
                      @click="setUnitRole(data.patrolRole === 'head' ? null : 'head')">
                {{ data.unit.headEl }}
              </button>
              <button class="chip" :class="{ on: data.patrolRole === 'deputy' }" :disabled="unitBusy"
                      @click="setUnitRole(data.patrolRole === 'deputy' ? null : 'deputy')">
                {{ data.unit.deputyEl }}
              </button>
            </div>
            <div class="tiny muted">{{ t('unitRoleNote') }}</div>
          </div>
        </template>

        <NuxtLink v-if="data.section?.slug === 'koinotita'" :to="`/admin/venture/${id}`" class="srow">
          <div class="ico">🏵️</div>
          <div class="txt"><b>{{ t('ventureBook') }}</b><span>{{ t('ventureBookSub') }}</span></div>
          <span class="chev">›</span>
        </NuxtLink>

        <NuxtLink v-if="data.section?.slug === 'omada'" :to="`/admin/requirements/${id}`" class="srow">
          <div class="ico">⚜️</div>
          <div class="txt"><b>{{ t('scoutRequirements') }}</b><span>{{ t('scoutRequirementsSub') }}</span></div>
          <span class="chev">›</span>
        </NuxtLink>

        <NuxtLink v-if="me?.can?.rosterDetails !== false" :to="`/admin/scout-card/${id}`" class="srow">
          <div class="ico">💳</div>
          <div class="txt"><b>{{ t('idCard') }}</b><span>{{ t('downloadIdCard') }}</span></div>
          <span class="chev">›</span>
        </NuxtLink>
      </div>

      <div style="display:flex;flex-direction:column;gap:15px">
        <div class="sec-title">{{ t('earnedBadges') }}</div>
        <div class="badge-grid">
          <div v-for="b in data.badges" :key="b.id" class="btile" :class="{ off: !b.earned }" style="cursor:default">
            <span class="disc">{{ b.icon }}</span><span class="lbl">{{ lx(b) }}</span>
          </div>
        </div>
        <button v-if="me?.can?.badges !== false" class="srow" @click="awarding = true">
          <div class="ico">🏅</div>
          <div class="txt"><b>{{ t('awardBadge') }}</b><span>{{ t('pickFromList') }}</span></div>
          <span class="chev">›</span>
        </button>
        <template v-if="me?.can?.rosterEdit !== false">
          <button class="btn" :class="data.isActive ? 'danger' : 'ghost'" @click="toggleActive">
            {{ data.isActive ? t('deactivate') : t('reactivate') }}
          </button>
          <button class="btn danger" @click="deleteScout">🗑️ {{ t('deletePermanently') }}</button>
        </template>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="awarding" class="sheet-backdrop" @click.self="awarding = false">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px;max-height:80dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('awardBadge') }}</h3>
          <div><label class="lab">{{ t('date') }}</label><input v-model="awardDate" type="date" class="in"></div>
          <div class="adm">
            <button v-for="b in data.badges" :key="b.id" class="it" :disabled="b.earned"
                    :style="b.earned ? 'opacity:.45' : ''" @click="award(b.id)">
              <div style="font-size:20px;width:26px;text-align:center">{{ b.icon }}</div>
              <div style="flex:1"><b>{{ lx(b) }}</b></div>
              <span v-if="b.earned" style="color:var(--green);font-weight:700">✓</span>
              <span v-else class="chev">›</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.prow{display:flex; align-items:flex-start; gap:10px; padding-bottom:10px; border-bottom:1px solid var(--line)}
.prow:last-of-type{border-bottom:0; padding-bottom:0}
</style>
