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
  try { me.value = await $fetch('/api/bar/me') } catch { me.value = null }
}
async function signIn() {
  err.value = ''; busy.value = true
  try {
    await $fetch('/api/bar/login', { method: 'POST', body: { code: code.value } })
    code.value = ''
    await load()
  } catch (e: any) { err.value = e?.data?.message || 'Κάτι πήγε στραβά' }
  finally { busy.value = false }
}
async function signOut() {
  if (!confirm('Αποσύνδεση;')) return
  await $fetch('/api/bar/logout', { method: 'POST' })
  me.value = null
}
onMounted(load)
const roleLabel = computed(() => ({ waiter: 'Σερβιτόρος', bartender: 'Bartender', cashier: 'Ταμείο' } as any)[me.value?.role] || '')
</script>

<template>
  <div class="barapp">
    <header class="top">
      <div>
        <b>🍻 {{ me?.event?.name || 'Μπαρ' }}</b>
        <span v-if="me">{{ roleLabel }} · {{ me.name }}<template v-if="me.bartender"> · Bartender: {{ me.bartender }}</template></span>
        <span v-else>30ό Σύστημα Προσκόπων Αμμοχώστου</span>
      </div>
      <button v-if="me" class="out" @click="signOut">Έξοδος</button>
    </header>

    <main v-if="!me" class="login">
      <div class="card">
        <label class="lab">Κωδικός προσωπικού</label>
        <input v-model="code" class="in big" inputmode="numeric" maxlength="6" placeholder="000000" @keyup.enter="signIn">
        <div v-if="err" class="err">{{ err }}</div>
        <button class="btn" :disabled="code.replace(/\D/g, '').length !== 6 || busy" @click="signIn">{{ busy ? '…' : 'Είσοδος' }}</button>
        <p class="hint">Τον εξαψήφιο κωδικό σου τον δίνει ο υπεύθυνος της βραδιάς.</p>
      </div>
    </main>
    <BarWaiter v-else-if="me.role === 'waiter'" :me="me" />
    <BarBartender v-else-if="me.role === 'bartender'" :me="me" />
    <BarCashier v-else :me="me" />
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
.barapp main{flex:1;padding:14px 14px calc(90px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px}
.barapp .login{justify-content:center}
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
.barapp .tabs button{flex:1;border:0;background:none;color:rgba(255,255,255,.6);font:inherit;font-size:13px;font-weight:600;padding:11px 4px;border-radius:12px;position:relative}
.barapp .tabs button.on{background:rgba(255,255,255,.12);color:#fff}
.barapp .tabs .n{position:absolute;top:4px;right:10px;background:#E25848;color:#fff;font-size:10px;font-weight:800;border-radius:999px;padding:1px 6px}
.barapp .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.barapp .tbl{aspect-ratio:1;border:0;border-radius:14px;background:#1B2648;color:#fff;font:inherit;font-size:20px;font-weight:800}
.barapp .tbl.on{background:#F0B429;color:#2B1F05}
.barapp .cat{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#F0B429;margin:6px 0 -4px}
.barapp .item{display:flex;align-items:center;gap:10px;background:#1B2648;border-radius:14px;padding:10px 12px}
.barapp .item .nm{flex:1;min-width:0;font-size:15px;font-weight:600}
.barapp .item .pr{font-size:13px;opacity:.7;white-space:nowrap}
.barapp .item .q{display:flex;align-items:center;gap:6px}
.barapp .item .q button{width:38px;height:38px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:#fff;font-size:20px;font-weight:700}
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
.barapp .empty{text-align:center;opacity:.55;padding:30px 0;font-size:14px}
.barapp .sum{position:fixed;left:0;right:0;bottom:calc(58px + env(safe-area-inset-bottom));padding:10px 14px;background:linear-gradient(transparent,#0F1730 40%);z-index:4}
.barapp .toast{position:fixed;left:50%;bottom:calc(120px + env(safe-area-inset-bottom));transform:translateX(-50%);background:#fff;color:#0F1730;font-weight:700;padding:10px 16px;border-radius:999px;z-index:9;box-shadow:0 8px 24px rgba(0,0,0,.4)}
</style>
