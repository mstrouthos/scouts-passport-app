<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const name = useName()
const { show } = useToast()
const route = useRoute()
const id = route.params.id
const { data, refresh } = await useFetch<any>(`/api/admin/scouts/${id}`)
const newPass = ref<string | null>(null)
const awarding = ref(false)
const awardDate = ref(new Date().toISOString().slice(0, 10))

async function regen() {
  const res = await $fetch<any>(`/api/admin/scouts/${id}/passcode`, { method: 'POST' })
  newPass.value = res.passcode
}
async function toggleActive() {
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
</script>

<template>
  <AppShell v-if="data" :title="name(data)" :sub="`${data.patrol?.emblem} ${lx(data.patrol, 'name')}`" back="/admin/scouts">
    <div class="cols-2">
      <div style="display:flex;flex-direction:column;gap:15px">
        <div class="pcard">
          <div class="name">{{ name(data) }}</div>
          <div class="meta">{{ lx(data.patrol, 'name') }}</div>
          <div class="stats">
            <div class="stat"><b>{{ data.points }}</b><span>{{ t('points') }}</span></div>
            <div class="stat"><b>{{ data.badges.filter(b => b.earned).length }}/{{ data.badges.length }}</b><span>{{ t('badges') }}</span></div>
            <div class="stat"><b>{{ data.isActive ? '✓' : '—' }}</b><span>{{ t('active') }}</span></div>
          </div>
        </div>

        <div class="sec-title">{{ t('loginCard') }}</div>
        <div class="card" style="display:flex;align-items:center;gap:12px">
          <div style="font-size:22px">⚜️</div>
          <div style="flex:1">
            <template v-if="newPass">
              <b style="font-variant-numeric:tabular-nums;font-size:16px;color:var(--blue-deep)">{{ newPass }}</b>
              <div class="tiny muted">{{ t('writeItDown') }}</div>
            </template>
            <template v-else>
              <b>••••-••••</b>
              <div class="tiny muted">{{ t('newPasscodeSub') }}</div>
            </template>
          </div>
          <button class="chip" @click="regen">{{ t('newPasscode') }}</button>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:15px">
        <div class="sec-title">{{ t('earnedBadges') }}</div>
        <div class="badge-grid">
          <div v-for="b in data.badges" :key="b.id" class="btile" :class="{ off: !b.earned }" style="cursor:default">
            <span class="disc">{{ b.icon }}</span><span class="lbl">{{ lx(b) }}</span>
          </div>
        </div>
        <button class="srow" @click="awarding = true">
          <div class="ico">🏅</div>
          <div class="txt"><b>{{ t('awardBadge') }}</b><span>{{ t('pickFromList') }}</span></div>
          <span class="chev">›</span>
        </button>
        <button class="btn" :class="data.isActive ? 'danger' : 'ghost'" @click="toggleActive">
          {{ data.isActive ? t('deactivate') : t('reactivate') }}
        </button>
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
