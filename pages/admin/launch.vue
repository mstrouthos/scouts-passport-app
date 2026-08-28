<script setup lang="ts">
/* Getting everyone into the app: who has signed in at least once, and issuing
   fresh codes to whoever has not. Reissuing invalidates the old code, so the
   page says so plainly and shows exactly what was sent. */
const { t, locale } = useI18n()
const lx = useLx()
const name = useName()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/scouts')
const { data: groups } = await useFetch<any[]>('/api/admin/groups')

const picked = ref<Set<number>>(new Set())
const includeInstall = ref(true)
const busy = ref(false)
const report = ref<any>(null)
const onlyPending = ref(false)

type Row = { id: number, firstName: string, lastName: string, firstNameEn?: string, lastNameEn?: string,
  activated: boolean, hasPhone: boolean, lastLoginAt: string | null }

const sections = computed(() => (data.value?.sections || []).map((sec: any) => ({
  ...sec,
  people: [...(sec.loose || []), ...(sec.patrols || []).flatMap((p: any) => p.scouts || [])] as Row[]
})).filter((sec: any) => sec.people.length))

const leaders = computed<Row[]>(() => (data.value?.leaders || []) as Row[])
const everyone = computed<Row[]>(() => [...sections.value.flatMap((s: any) => s.people), ...leaders.value])
const shown = (people: Row[]) => onlyPending.value ? people.filter(p => !p.activated) : people

const activatedCount = computed(() => everyone.value.filter(p => p.activated).length)
const toggle = (id: number) => {
  const next = new Set(picked.value)
  next.has(id) ? next.delete(id) : next.add(id)
  picked.value = next
}
function pickAll(people: Row[]) {
  const next = new Set(picked.value)
  const ids = shown(people).map(p => p.id)
  const allIn = ids.every(id => next.has(id))
  for (const id of ids) allIn ? next.delete(id) : next.add(id)
  picked.value = next
}
function pickGroup(g: any) {
  const next = new Set(picked.value)
  const ids = (g.members || []).map((m: any) => m.id)
  const allIn = ids.every((id: number) => next.has(id))
  for (const id of ids) allIn ? next.delete(id) : next.add(id)
  picked.value = next
}

async function send(reallySend: boolean) {
  if (!picked.value.size || busy.value) return
  if (!confirm(t('confirmReissue', { n: picked.value.size }))) return
  busy.value = true
  try {
    report.value = await $fetch<any>('/api/admin/scouts/bulk-passcode', {
      method: 'POST',
      body: { scoutIds: [...picked.value], includeInstall: includeInstall.value, send: reallySend }
    })
    picked.value = new Set()
    await refresh()
  } catch (e: any) { show(e?.data?.message || t('error')) }
  finally { busy.value = false }
}
</script>

<template>
  <AppShell :title="t('launch')" :sub="t('launchSub')" back="/admin/more">
    <div class="hero-card">
      <div class="big">{{ activatedCount }}<span>/{{ everyone.length }}</span></div>
      <div class="lbl">{{ t('haveSignedIn') }}</div>
      <div class="bar"><i :style="{ width: (everyone.length ? (activatedCount / everyone.length) * 100 : 0) + '%' }" /></div>
    </div>

    <div class="seg">
      <button :class="{ on: !onlyPending }" @click="onlyPending = false">{{ t('all') }}</button>
      <button :class="{ on: onlyPending }" @click="onlyPending = true">{{ t('notYetActivated') }}</button>
    </div>

    <template v-if="groups?.length">
      <div class="sec-title">{{ t('groups') }}</div>
      <div class="chips">
        <button v-for="g in groups" :key="g.id" class="chip" @click="pickGroup(g)">
          {{ g.emoji }} {{ g.nameEl }} · {{ g.members?.length || 0 }}
        </button>
      </div>
    </template>

    <template v-for="sec in sections" :key="sec.id">
      <div class="sec-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>{{ lx(sec, 'name') }}</span>
        <button class="chip" @click="pickAll(sec.people)">{{ t('selectAll') }}</button>
      </div>
      <div class="adm">
        <button v-for="p in shown(sec.people)" :key="p.id" class="it" @click="toggle(p.id)">
          <span class="box" :class="{ on: picked.has(p.id) }">{{ picked.has(p.id) ? '✓' : '' }}</span>
          <div style="flex:1;min-width:0">
            <b>{{ name(p) }}</b>
            <span>
              {{ p.activated ? `${t('signedIn')} · ${fmtDate(p.lastLoginAt, locale)}` : t('neverSignedIn') }}
              <template v-if="!p.hasPhone"> · {{ t('noPhoneOnFile') }}</template>
            </span>
          </div>
          <span class="pill" :class="p.activated ? 'ok' : 'draft'">{{ p.activated ? '✓' : '—' }}</span>
        </button>
        <div v-if="!shown(sec.people).length" class="tiny muted" style="padding:11px 15px">{{ t('allActivatedHere') }}</div>
      </div>
    </template>

    <template v-if="leaders.length">
      <div class="sec-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>{{ t('vathmoforoi') }}</span>
        <button class="chip" @click="pickAll(leaders)">{{ t('selectAll') }}</button>
      </div>
      <div class="adm">
        <button v-for="p in shown(leaders)" :key="p.id" class="it" @click="toggle(p.id)">
          <span class="box" :class="{ on: picked.has(p.id) }">{{ picked.has(p.id) ? '✓' : '' }}</span>
          <div style="flex:1;min-width:0">
            <b>{{ name(p) }}</b>
            <span>{{ p.activated ? `${t('signedIn')} · ${fmtDate(p.lastLoginAt, locale)}` : t('neverSignedIn') }}</span>
          </div>
          <span class="pill" :class="p.activated ? 'ok' : 'draft'">{{ p.activated ? '✓' : '—' }}</span>
        </button>
      </div>
    </template>

    <div class="sticky">
      <label class="tiny" style="display:flex;align-items:center;gap:7px;cursor:pointer">
        <input v-model="includeInstall" type="checkbox">
        {{ t('includeInstallLink') }}
      </label>
      <div class="tiny muted">{{ t('reissueWarning') }}</div>
      <div style="display:flex;gap:8px">
        <button class="btn" style="flex:1" :disabled="!picked.size || busy" @click="send(true)">
          📱 {{ t('sendCodes', { n: picked.size }) }}
        </button>
        <button class="btn ghost" style="flex:none" :disabled="!picked.size || busy" @click="send(false)">
          {{ t('justIssue') }}
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="report" class="sheet-backdrop" @click.self="report = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:11px;max-height:88dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">
            {{ t('codesIssued', { n: report.issued, sent: report.sent }) }}
          </h3>
          <div class="adm">
            <div v-for="r in report.results" :key="r.id" class="it" style="cursor:default">
              <div style="flex:1;min-width:0">
                <b>{{ r.name }}</b>
                <span style="font-variant-numeric:tabular-nums">{{ r.passcode }}</span>
              </div>
              <span class="pill" :class="r.sent ? 'ok' : 'draft'">
                {{ r.sent ? '📱' : r.reason === 'noPhone' ? t('noPhoneOnFile') : r.reason === 'smsFailed' ? t('smsNotConfigured') : t('notSentShort') }}
              </span>
            </div>
          </div>
          <div class="tiny muted">{{ t('writeThemDown') }}</div>
          <button class="btn ghost" @click="report = null">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.hero-card{background:var(--card); border-radius:var(--r-card); box-shadow:var(--shadow); padding:16px; text-align:center}
.hero-card .big{font-size:30px; font-weight:800; line-height:1}
.hero-card .big span{font-size:16px; color:var(--muted); font-weight:600}
.hero-card .lbl{font-size:12px; color:var(--muted); margin-top:2px}
.hero-card .bar{height:9px; border-radius:5px; background:#EEF2F6; margin-top:11px; overflow:hidden}
.hero-card .bar i{display:block; height:100%; border-radius:5px; background:var(--accent); transition:width .4s}

.box{
  flex:none; width:22px; height:22px; border-radius:7px; border:1.5px solid var(--line);
  display:grid; place-items:center; font-size:12px; font-weight:800; color:#fff;
}
.box.on{background:var(--accent); border-color:var(--accent)}

.sticky{
  position:sticky; bottom:8px; display:flex; flex-direction:column; gap:8px;
  background:var(--card); border-radius:16px; padding:12px 14px; box-shadow:0 8px 26px rgba(31,58,84,.16);
}
</style>
