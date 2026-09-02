<script setup lang="ts">
/* Getting everyone into the app: who has signed in at least once, and issuing
   fresh codes to whoever has not. Only people who hold a code of their own are
   listed — the Αγέλη and Μικρή Αγέλη children never sign in, their families do.
   Reissuing invalidates whatever they had, so the page says so plainly and
   shows exactly what was sent. */
const { t, locale } = useI18n()
const lx = useLx()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/activation')
const { data: groups } = await useFetch<any[]>('/api/admin/groups')

type Row = { kind: 'scout' | 'parent', id: number, name: string, where: string | null,
  activated: boolean, hasPhone: boolean, lastLoginAt: string | null }

const picked = ref<Set<string>>(new Set())
const busy = ref(false)
const report = ref<any>(null)
const onlyPending = ref(false)

/* Long lists — every section starts closed, with its own count on the row. */
const open = ref<Set<string>>(new Set())
const toggleOpen = (key: string) => {
  const next = new Set(open.value)
  next.has(key) ? next.delete(key) : next.add(key)
  open.value = next
}

const blocks = computed<any[]>(() => (data.value?.groups || []))
const shown = (people: Row[]) => onlyPending.value ? people.filter(p => !p.activated) : people
const keyOf = (p: Row) => `${p.kind}:${p.id}`

const total = computed(() => data.value?.total || 0)
const activatedCount = computed(() => data.value?.activated || 0)

const toggle = (p: Row) => {
  const next = new Set(picked.value)
  const k = keyOf(p)
  next.has(k) ? next.delete(k) : next.add(k)
  picked.value = next
}
function pickAll(people: Row[]) {
  const next = new Set(picked.value)
  const keys = shown(people).map(keyOf)
  const allIn = keys.every(k => next.has(k))
  for (const k of keys) allIn ? next.delete(k) : next.add(k)
  picked.value = next
}
/* A notification group is a shortcut for its members — only those of them who
   are actually on this page can be given a code. */
function pickGroup(g: any) {
  const here = new Set(blocks.value.flatMap((b: any) => b.people).map((p: Row) => keyOf(p)))
  const keys = (g.members || []).map((m: any) => `scout:${m.id}`).filter((k: string) => here.has(k))
  if (!keys.length) { show(t('nobodyHereFromGroup')); return }
  const next = new Set(picked.value)
  const allIn = keys.every((k: string) => next.has(k))
  for (const k of keys) allIn ? next.delete(k) : next.add(k)
  picked.value = next
}

async function send(reallySend: boolean) {
  if (!picked.value.size || busy.value) return
  if (!confirm(t('confirmReissue', { n: picked.value.size }))) return
  busy.value = true
  try {
    const ids = [...picked.value]
    report.value = await $fetch<any>('/api/admin/scouts/bulk-passcode', {
      method: 'POST',
      body: {
        scoutIds: ids.filter(k => k.startsWith('scout:')).map(k => Number(k.slice(6))),
        parentIds: ids.filter(k => k.startsWith('parent:')).map(k => Number(k.slice(7))),
        send: reallySend
      }
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
      <div class="big">{{ activatedCount }}<span>/{{ total }}</span></div>
      <div class="lbl">{{ t('haveSignedIn') }}</div>
      <div class="bar"><i :style="{ width: (total ? (activatedCount / total) * 100 : 0) + '%' }" /></div>
      <div class="tiny muted" style="margin-top:9px">{{ t('activationNote') }}</div>
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

    <div v-for="b in blocks" :key="b.key" class="adm" style="margin-bottom:2px">
      <button class="it head" @click="toggleOpen(b.key)">
        <span class="chev" :class="{ open: open.has(b.key) }">›</span>
        <div style="flex:1;min-width:0">
          <b>{{ b.label }}</b>
          <span>{{ t('activatedOf', { n: b.people.filter((p: any) => p.activated).length, total: b.people.length }) }}</span>
        </div>
        <span class="chip" style="flex:none" @click.stop="pickAll(b.people)">{{ t('selectAll') }}</span>
      </button>
      <template v-if="open.has(b.key)">
        <button v-for="p in shown(b.people)" :key="p.kind + p.id" class="it" @click="toggle(p)">
          <span class="box" :class="{ on: picked.has(p.kind + ':' + p.id) }">{{ picked.has(p.kind + ':' + p.id) ? '✓' : '' }}</span>
          <div style="flex:1;min-width:0">
            <b>{{ p.name }}<span v-if="p.where" class="tiny muted"> · {{ p.where }}</span></b>
            <span>
              {{ p.activated ? `${t('signedIn')} · ${fmtDate(p.lastLoginAt, locale)}` : t('neverSignedIn') }}
              <template v-if="!p.hasPhone"> · {{ t('noPhoneOnFile') }}</template>
            </span>
          </div>
          <span class="pill" :class="p.activated ? 'ok' : 'draft'">{{ p.activated ? '✓' : '—' }}</span>
        </button>
        <div v-if="!shown(b.people).length" class="tiny muted" style="padding:11px 15px">{{ t('allActivatedHere') }}</div>
      </template>
    </div>

    <div class="sticky">
      <div class="tiny muted">📲 {{ t('installAlwaysIncluded') }}</div>
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
            <div v-for="r in report.results" :key="r.kind + r.id" class="it" style="cursor:default">
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

.it.head{background:var(--bg2)}
.it.head .chev{
  flex:none; font-size:19px; color:var(--muted); line-height:1;
  transition:transform .18s; transform-origin:50% 50%;
}
.it.head .chev.open{transform:rotate(90deg)}

.sticky{
  position:sticky; bottom:8px; display:flex; flex-direction:column; gap:8px;
  background:var(--card); border-radius:16px; padding:12px 14px; box-shadow:0 8px 26px rgba(31,58,84,.16);
}
</style>
