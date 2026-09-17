<script setup lang="ts">
/* Το μπαρ — the crew's screen for the night. One page, three jobs: a waiter
   takes orders, a bartender makes them, the cashier confirms the cards. Who
   you are is decided by the code you typed, nothing else to choose. */
useHead({ title: 'Μπαρ · Πύλη Προσκόπων' })

const me = ref<any>(null)
const code = ref('')
const err = ref('')
const busy = ref(false)

async function load() {
  try { me.value = await $fetch('/api/bar/me'); await ensureSessionToken() } catch { me.value = null }
}
async function signIn() {
  err.value = ''; busy.value = true
  try {
    await $fetch('/api/bar/login', { method: 'POST', body: { code: code.value } })
    code.value = ''
    // the session grew a bar identity; our copy must carry it too
    writeSessionToken(null)
    await load()
  } catch (e: any) { err.value = e?.data?.message || 'Κάτι πήγε στραβά' }
  finally { busy.value = false }
}
async function signOut() {
  if (!confirm('Αποσύνδεση;')) return
  await $fetch('/api/bar/logout', { method: 'POST' })
  // the bar identity left the session; refresh our copy so it matches
  writeSessionToken(null); await ensureSessionToken()
  me.value = null
}
onMounted(load)

/* The phone buzzes when an order lands (bartender) or is ready (waiter).
   Asked once per device; on an iPhone this only works once the page is
   installed to the home screen, which the hint says. */
const cfg = useRuntimeConfig()
const push = ref<'ask' | 'on' | 'no' | 'busy'>('ask')
const { resync: resyncPush, test: testPush } = usePushResync()
// "on" means the browser says so, not a flag we set once: a subscription that
// died is re-made on load, and a permission revoked shows the bar again
watch(me, async (v) => {
  if (!v) return
  if ('Notification' in window && Notification.permission === 'granted') { push.value = (await resyncPush(true)) ? 'on' : 'no' }
  else if ('Notification' in window && Notification.permission === 'denied') push.value = 'no'
})
// the question is asked once; after that it lives in the settings sheet
const asked = ref(false)
onMounted(() => { try { asked.value = !!localStorage.getItem('barPushAsked') } catch {} })
function markAsked() { asked.value = true; try { localStorage.setItem('barPushAsked', '1') } catch {} }
const settingsOpen = ref(false)
const testing = ref('')
async function tryPush() {
  testing.value = '…'
  try { const r = await testPush(); testing.value = r.sent ? 'Στάλθηκε — κοίτα το κινητό σου' : 'Δεν έφυγε — δες τις ρυθμίσεις της συσκευής' }
  catch (e: any) { testing.value = e?.data?.message || e?.message || 'Δεν έφυγε' }
  setTimeout(() => { testing.value = '' }, 4000)
}
function b64ToU8(base64: string) {
  const pad = '='.repeat((4 - base64.length % 4) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}
async function enablePush() {
  markAsked()
  push.value = 'busy'
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !cfg.public.vapidPublicKey) { push.value = 'no'; return }
    if (await Notification.requestPermission() !== 'granted') { push.value = 'no'; return }
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(cfg.public.vapidPublicKey) })
    await $fetch('/api/bar/subscribe', { method: 'POST', body: sub.toJSON() })
    push.value = 'on'
  } catch { push.value = 'no' }
}
const wantsPush = computed(() => me.value && ['waiter', 'bartender', 'cashier'].includes(me.value.role))
const roleLabel = computed(() => ({ waiter: 'Σερβιτόρος', bartender: 'Bartender', cashier: 'Ταμείο', supervisor: 'Επόπτης', organiser: 'Οργανωτής' } as any)[me.value?.role] || '')
</script>

<template>
  <div class="barapp">
    <header class="top">
      <div>
        <b>🍻 {{ me?.event?.name || 'Μπαρ' }}</b>
        <span v-if="me">{{ roleLabel }} · {{ me.name }}<template v-if="me.bartender"> · Bartender: {{ me.bartender }}</template></span>
        <span v-else>30ό Σύστημα Προσκόπων Αμμοχώστου</span>
      </div>
      <button v-if="me" class="out" @click="settingsOpen = true">⚙︎ Ρυθμίσεις</button>
    </header>

    <main v-if="!me" class="signin">
      <div class="card">
        <label class="lab">Κωδικός προσωπικού</label>
        <input v-model="code" class="in big" inputmode="numeric" maxlength="6" placeholder="000000" @keyup.enter="signIn">
        <div v-if="err" class="err">{{ err }}</div>
        <button class="btn" :disabled="code.replace(/\D/g, '').length !== 6 || busy" @click="signIn">{{ busy ? '…' : 'Είσοδος' }}</button>
        <p class="hint">Τον εξαψήφιο κωδικό σου τον δίνει ο υπεύθυνος της βραδιάς.</p>
      </div>
    </main>
    <!-- asked once, on first sign-in; afterwards it is in Ρυθμίσεις -->
    <div v-if="wantsPush && push === 'ask' && !asked" class="pushbar">
      <span>🔔 Να χτυπάει το κινητό {{ me.role === 'waiter' ? 'όταν είναι έτοιμη μια παραγγελία σου;' : me.role === 'cashier' ? 'όταν υπάρχει παραγγελία προς πληρωμή;' : 'όταν έρχεται παραγγελία;' }}</span>
      <button class="btn sm" :disabled="push === 'busy'" @click="enablePush">Ναι</button>
      <button class="btn ghost sm" @click="markAsked">Όχι</button>
    </div>

    <div v-if="settingsOpen && me" class="sheet-backdrop" @click.self="settingsOpen = false">
      <div class="sheet bsheet">
        <h3 style="margin:0;font-size:17px;text-align:center">{{ me.name }} · {{ roleLabel }}</h3>
        <div class="srow2">
          <div style="flex:1"><b>🔔 Ειδοποιήσεις</b>
            <span v-if="push === 'on'">Ενεργές σε αυτή τη συσκευή{{ testing ? ' · ' + testing : '' }}</span>
            <span v-else-if="push === 'no'">Δεν επιτρέπονται εδώ. iPhone: πρόσθεσε τη σελίδα στην αρχική οθόνη και άνοιξέ την από εκεί. Android/Samsung: Ρυθμίσεις → Εφαρμογές → ο browser → Ειδοποιήσεις, και βγάλε τον browser από την εξοικονόμηση μπαταρίας.</span>
            <span v-else>Ανενεργές</span></div>
          <button v-if="push === 'on'" class="btn sm" @click="tryPush">Δοκιμή</button>
          <button v-else-if="push !== 'no'" class="btn sm" :disabled="push === 'busy'" @click="enablePush">Ενεργοποίηση</button>
        </div>
        <button class="btn red" @click="signOut">Έξοδος</button>
        <button class="btn ghost" @click="settingsOpen = false">Κλείσιμο</button>
      </div>
    </div>
    <BarWaiter v-if="me?.role === 'waiter'" :me="me" />
    <BarBartender v-else-if="me?.role === 'bartender'" :me="me" />
    <BarSupervisor v-else-if="me?.role === 'supervisor'" :me="me" />
    <BarOrganiser v-else-if="me?.role === 'organiser'" :me="me" />
    <BarCashier v-else-if="me" :me="me" />
  </div>
</template>

<style>
/* The crew's screen is its own thing: big targets, high contrast, nothing
   the members' app carries. Global so the three job components share it. */
.barapp{min-height:100dvh;background:#0F1730;color:#F4F6FB;font-family:var(--font);display:flex;flex-direction:column}
.barapp .top{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 16px 10px;background:#141E3C;box-shadow:0 2px 10px rgba(0,0,0,.35)}
.barapp .top b{display:block;font-size:17px}
.barapp .top span{font-size:12px;opacity:.75}
.barapp .out{background:rgba(255,255,255,.1);border:0;color:#fff;padding:8px 12px;border-radius:999px;font:inherit;font-size:12px;font-weight:600}
.barapp main{flex:1;padding:14px 14px calc(90px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px}
.barapp .signin{justify-content:center}
.barapp .bsheet{background:#1B2648;color:#F4F6FB}
.barapp .bsheet::before{background:rgba(255,255,255,.25)}
.barapp .srow2{display:flex;align-items:center;gap:10px;background:#0F1730;border-radius:14px;padding:12px 14px;font-size:13px}
.barapp .srow2 b{display:block;font-size:14px}
.barapp .srow2 span{opacity:.7;line-height:1.35}
.barapp .pushbar{display:flex;align-items:center;gap:10px;margin:12px 14px -4px;padding:10px 12px;border-radius:14px;background:rgba(240,180,41,.14);color:#F6D27A;font-size:13px;line-height:1.35}
.barapp .pushbar span{flex:1}
.barapp .card{background:#1B2648;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:10px}
.barapp .lab{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.7}
.barapp .in{width:100%;box-sizing:border-box;background:#0F1730;border:1.5px solid #2C3A66;border-radius:12px;color:#fff;font:inherit;font-size:16px;padding:11px 13px}
.barapp .in.big{font-size:28px;letter-spacing:.3em;text-align:center;font-weight:700}
.barapp .btn{width:100%;border:0;border-radius:14px;padding:15px;font:inherit;font-size:16px;font-weight:700;background:#F0B429;color:#2B1F05}
.barapp .btn:disabled{opacity:.35}
.barapp .btn.ghost{background:rgba(255,255,255,.08);color:#fff}
.barapp .btn.ok{background:#2FA36B;color:#fff}
.barapp .btn.red{background:rgba(226,88,72,.18);color:#FF9A8B}
.barapp .btn.sm{padding:10px 12px;font-size:14px;width:auto;border-radius:11px}
.barapp .err{color:#FF9A8B;font-size:13px}
.barapp .hint{margin:0;font-size:12px;opacity:.6;text-align:center}
.barapp .tabs{position:fixed;left:0;right:0;bottom:0;display:flex;background:#141E3C;padding:6px 8px calc(6px + env(safe-area-inset-bottom));gap:6px;z-index:5}
.barapp .tabs button{flex:1;min-width:0;border:0;background:none;color:rgba(255,255,255,.6);font:inherit;font-size:12.5px;font-weight:600;padding:11px 4px;border-radius:12px;position:relative}
.barapp .tabs button.on{background:rgba(255,255,255,.12);color:#fff}
.barapp .tabs .n{position:absolute;top:4px;right:10px;background:#E25848;color:#fff;font-size:10px;font-weight:800;border-radius:999px;padding:1px 6px}
.barapp .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.barapp .tbl{aspect-ratio:1.5;border:0;border-radius:14px;background:#1B2648;color:#fff;font:inherit;font-size:20px;font-weight:800}
.barapp .tbl.on{background:#F0B429;color:#2B1F05}
.barapp .cat{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#F0B429;margin:6px 0 -4px}
.barapp .item{display:flex;align-items:center;gap:10px;background:#1B2648;border-radius:12px;padding:6px 12px;min-height:48px}
.barapp .item .nm{flex:1;min-width:0;font-size:15px;font-weight:600}
.barapp .item .pr{font-size:13px;opacity:.7;white-space:nowrap}
.barapp .item .q{display:flex;align-items:center;gap:6px}
.barapp .item .q button{width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:#fff;font-size:20px;font-weight:700}
.barapp .item .q button.plus{background:#F0B429;color:#2B1F05}
.barapp .item .q b{min-width:22px;text-align:center;font-size:17px}
.barapp .order{background:#1B2648;border-radius:16px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.barapp .order .hd{display:flex;align-items:baseline;gap:10px}
.barapp .order .hd .no{font-size:22px;font-weight:800;color:#F0B429}
.barapp .order .hd .tb{font-size:18px;font-weight:800}
.barapp .order .hd .meta{margin-left:auto;font-size:12px;opacity:.65;text-align:right}
.barapp .order .lines{display:flex;flex-direction:column;gap:3px}
.barapp .order .lines div{display:flex;gap:8px;font-size:16px}
.barapp .order .lines b{min-width:34px;color:#F0B429}
.barapp .order .tot{display:flex;justify-content:space-between;font-size:14px;border-top:1px solid rgba(255,255,255,.1);padding-top:8px}
.barapp .order .acts{display:flex;gap:8px;flex-wrap:wrap}
.barapp .order .acts .btn{flex:1}
.barapp .pill{font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;white-space:nowrap}
.barapp .pill.new{background:rgba(240,180,41,.2);color:#F0B429}
.barapp .pill.ready{background:rgba(47,163,107,.25);color:#7BE0AC}
.barapp .pill.delivered{background:rgba(255,255,255,.12);color:#fff}
.barapp .pill.cancelled{background:rgba(226,88,72,.2);color:#FF9A8B}
.barapp .pill.paid{background:rgba(47,163,107,.25);color:#7BE0AC}
.barapp .pill.unpaid{background:rgba(226,88,72,.2);color:#FF9A8B}
.barapp .pill.pending{background:rgba(120,140,255,.2);color:#B7C2FF}
.barapp .cpn{display:inline-block;margin-left:8px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.1);color:rgba(255,255,255,.7);vertical-align:middle;cursor:pointer}
.barapp .cpn.on{background:rgba(240,180,41,.22);color:#F0B429}
.barapp .item.cp{box-shadow:inset 0 0 0 1.5px rgba(240,180,41,.5)}
.barapp .seg2{display:flex;gap:6px;background:#1B2648;border-radius:12px;padding:4px;margin-bottom:8px}
.barapp .seg2 button{flex:1;border:0;background:none;color:rgba(255,255,255,.6);font:inherit;font-size:14px;font-weight:700;padding:10px;border-radius:9px}
.barapp .seg2 button.on{background:#fff;color:#0F1730}
.barapp .empty{text-align:center;opacity:.55;padding:30px 0;font-size:14px}
.barapp main.with-sum{padding-bottom:calc(200px + env(safe-area-inset-bottom))}
/* the send panel is its own thing — pale, opaque, unmistakable against the dark list */
.barapp .sum{position:fixed;left:0;right:0;bottom:calc(58px + env(safe-area-inset-bottom));padding:12px 14px 10px;background:#F4F6FB;color:#0F1730;border-radius:18px 18px 0 0;box-shadow:0 -8px 28px rgba(0,0,0,.45);z-index:4}
.barapp .sum .seg2{background:#E1E6F0}
.barapp .sum .seg2 button{color:#4A5670}
.barapp .sum .seg2 button.on{background:#0F1730;color:#fff}
.barapp .sum .btn{box-shadow:0 6px 16px rgba(240,180,41,.35)}
.barapp .toast{position:fixed;left:50%;bottom:calc(120px + env(safe-area-inset-bottom));transform:translateX(-50%);background:#fff;color:#0F1730;font-weight:700;padding:10px 16px;border-radius:999px;z-index:9;box-shadow:0 8px 24px rgba(0,0,0,.4)}
</style>
