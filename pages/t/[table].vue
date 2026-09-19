<script setup lang="ts">
/* A guest's phone, after scanning the card on their table: the menu, and one
   big button that brings the waiter. Nothing to sign into, nothing to order
   from — ordering stays with the waiters, so payment and coupons keep working. */
const route = useRoute()
const table = String(route.params.table)
useHead({ title: `Τραπέζι ${table} · Πύλη Προσκόπων` })
const data = ref<any>(null)
const err = ref('')
const busy = ref(false)
const since = ref(0)
let timer: any = null
async function load() {
  try { data.value = await $fetch(`/api/t/${table}`); err.value = '' } catch (e: any) { err.value = e?.data?.message || 'Κάτι πήγε στραβά' }
}
async function call() {
  busy.value = true
  try { await $fetch(`/api/t/${table}/call`, { method: 'POST' }); await load() } catch (e: any) { err.value = e?.data?.message || 'Κάτι πήγε στραβά' }
  finally { busy.value = false }
}
onMounted(() => { load(); timer = setInterval(() => { load(); since.value++ }, 5000) })
onUnmounted(() => clearInterval(timer))
const eur = (c: number) => (c / 100).toFixed(2).replace('.', ',') + ' €'
const menu = computed(() => {
  const cats = new Map<string, any[]>()
  for (const m of data.value?.menu || []) cats.set(m.category, [...(cats.get(m.category) || []), m])
  return [...cats.entries()]
})
const waitingMin = computed(() => data.value?.calledAt ? Math.max(0, Math.round((Date.now() - new Date(data.value.calledAt).getTime()) / 60000)) : 0)
</script>

<template>
  <div class="guest">
    <header>
      <img src="/images/logo-256.png" alt="">
      <div><b>{{ data?.event?.name || 'Πύλη Προσκόπων' }}</b><span>30ό Σύστημα Προσκόπων Αμμοχώστου</span></div>
    </header>
    <main>
      <div class="tbl">Τραπέζι <b>{{ table }}</b></div>
      <div v-if="err" class="note">{{ err }}</div>
      <template v-else-if="data">
        <button v-if="!data.calledAt" class="call" :disabled="busy" @click="call">🔔 Κάλεσε σερβιτόρο</button>
        <div v-else class="called">✅ Ο σερβιτόρος έρχεται<span>Καλέσατε πριν {{ waitingMin }}′ · θα το δει αμέσως</span></div>
        <div v-if="data.event.couponsPerAdult" class="hint">🎟 Κάθε εισιτήριο δίνει {{ data.event.couponsPerAdult }} κουπόνι{{ data.event.couponsPerAdult === 1 ? '' : 'α' }} για ποτό — δώστε το στον σερβιτόρο με την παραγγελία.</div>
        <template v-for="[cat, items] in menu" :key="cat">
          <div class="cat">{{ cat || 'Μενού' }}</div>
          <div v-for="m in items" :key="m.id" class="item">
            <span class="nm">{{ m.name }}<span v-if="m.couponOk" class="cp">🎟{{ m.couponCost > 1 ? ' ×' + m.couponCost : '' }}</span></span>
            <span class="pr">{{ eur(m.priceCents) }}</span>
          </div>
        </template>
      </template>
      <div v-else class="hint">Φόρτωση…</div>
    </main>
  </div>
</template>

<style>
.guest{min-height:100dvh;background:#0F1730;color:#F4F6FB;font-family:var(--font)}
.guest header{display:flex;align-items:center;gap:12px;padding:calc(14px + env(safe-area-inset-top)) 18px 12px;background:#141E3C}
.guest header img{width:44px;height:44px;object-fit:contain}
.guest header b{display:block;font-size:17px}
.guest header span{font-size:12px;opacity:.7}
.guest main{padding:16px 16px 40px;display:flex;flex-direction:column;gap:10px;max-width:520px;margin:0 auto}
.guest .tbl{font-size:15px;opacity:.8}
.guest .tbl b{font-size:34px;color:#F0B429;margin-left:6px}
.guest .call{border:0;border-radius:18px;padding:22px;font:inherit;font-size:20px;font-weight:800;background:#F0B429;color:#2B1F05;box-shadow:0 10px 30px rgba(240,180,41,.35)}
.guest .call:disabled{opacity:.5}
.guest .called{background:rgba(47,163,107,.18);color:#7BE0AC;border-radius:18px;padding:18px;font-size:18px;font-weight:700;text-align:center}
.guest .called span{display:block;font-size:12px;font-weight:400;opacity:.8;margin-top:4px}
.guest .hint{font-size:12.5px;opacity:.7;line-height:1.4}
.guest .note{background:rgba(226,88,72,.18);color:#FF9A8B;border-radius:14px;padding:14px;text-align:center}
.guest .cat{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#F0B429;margin:10px 0 -4px}
.guest .item{display:flex;align-items:center;gap:10px;background:#1B2648;border-radius:12px;padding:12px 14px}
.guest .item .nm{flex:1;font-size:15px;font-weight:600}
.guest .item .pr{font-size:14px;opacity:.8;white-space:nowrap}
.guest .cp{margin-left:8px;font-size:11px;background:rgba(240,180,41,.2);color:#F0B429;border-radius:999px;padding:2px 7px}
</style>
