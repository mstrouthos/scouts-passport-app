<script setup lang="ts">
const { t } = useI18n()
const pass = ref('')
const err = ref('')
const busy = ref(false)
const cheer = ref(false)
const shake = ref(false)   // a wrong code shakes the field, every time
const digits = computed(() => pass.value.replace(/\D/g, ''))
// why we are here, if the server said — for reports of "it logged me out"
const why = useMeWhy()
const standalone = computed(() => import.meta.client && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true))

function format(e: Event) {
  const d = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 8)
  pass.value = d.length > 4 ? d.slice(0, 4) + '-' + d.slice(4) : d
}
async function submit() {
  if (digits.value.length !== 8 || busy.value) return
  busy.value = true; err.value = ''
  try {
    // a fresh sign-in must not ride on a previous person's copy of the session
    writeSessionToken(null)
    const res = await $fetch<{ role: string }>('/api/login', { method: 'POST', body: { passcode: digits.value } })
    await loadMe()
    // a beat for the phoenix to cheer before the door opens
    cheer.value = true
    await new Promise(r => setTimeout(r, 650))
    navigateTo(res.role === 'scout' ? '/app' : '/admin', { replace: true })
  } catch (e: any) {
    err.value = e?.statusCode === 429 ? t('loginSlow') : t('loginBad')
    shake.value = false; await nextTick(); shake.value = true
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <FxCampScene class="gate" :fire="false" :tent="false">
    <div class="gate-in">
      <header class="gate-head">
        <FxCrestCoin :size="58" />
        <div>
          <h1>{{ t('appName') }}</h1>
          <div class="tag">{{ t('troopName') }}</div>
        </div>
      </header>

      <div class="perch">
        <!-- the phoenix sits on the card's edge, and cheers when the code is right -->
        <MascotPhoenix class="bird" :pose="cheer ? 'cheer' : 'idle'" />
        <form class="card" @submit.prevent="submit">
          <label for="pass">{{ t('passcode') }}</label>
          <input id="pass" :value="pass" inputmode="numeric" autocomplete="off" :class="{ shake }"
                 placeholder="0000-0000" maxlength="9" @input="format">
          <!-- eight dots fill as the code is typed -->
          <div class="dots" aria-hidden="true"><i v-for="n in 8" :key="n" :class="{ on: digits.length >= n }" /></div>
          <button class="btn" type="submit" :disabled="digits.length !== 8 || busy">{{ busy ? '…' : t('enter') }}</button>
          <div v-if="err" class="err" role="alert">{{ err }}</div>
          <div class="helper">{{ t('loginHelp1') }}<br>{{ t('loginHelp2') }}</div>
          <div v-if="why" class="why">{{ why }}{{ standalone ? ' · app' : ' · browser' }}</div>
        </form>
      </div>
    </div>
  </FxCampScene>
</template>

<style scoped>
.gate{--fire-bottom:-60px}
.gate-in{
  height:100%; display:flex; flex-direction:column; justify-content:space-between;
  padding:calc(env(safe-area-inset-top) + 26px) 20px calc(env(safe-area-inset-bottom) + 22px);
  max-width:440px; margin:0 auto;
}
.gate-head{display:flex; align-items:center; gap:14px; animation:up .7s .1s cubic-bezier(.2,.8,.3,1) both}
.gate-head h1{
  margin:0; font-size:23px; font-weight:750; letter-spacing:-.02em;
  background:linear-gradient(180deg,var(--title1,#FFF8E1),var(--title2,#FFD97A)); -webkit-background-clip:text; background-clip:text; color:transparent;
}
.gate-head .tag{font-size:10.5px; letter-spacing:.08em; opacity:.7; line-height:1.45; margin-top:2px}

.perch{position:relative; padding-top:118px; animation:up .8s .25s cubic-bezier(.2,.8,.3,1) both}
.bird{position:absolute; left:50%; top:0; width:170px; translate:-50% 0; z-index:2}
.card{
  position:relative; z-index:1;
  background:var(--card, rgba(20,36,58,.74)); color:var(--card-ink, #fff);
  border:1px solid rgba(255,255,255,.22); border-radius:28px;
  -webkit-backdrop-filter:blur(18px) saturate(140%); backdrop-filter:blur(18px) saturate(140%);
  box-shadow:0 24px 60px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25);
  padding:74px 22px 20px; display:flex; flex-direction:column;
}
label{font-size:10.5px; text-transform:uppercase; letter-spacing:.12em; opacity:.72; margin-bottom:8px; text-align:center}
input{
  width:100%; background:color-mix(in srgb, var(--card-ink, #fff) 8%, transparent); border:1.3px solid color-mix(in srgb, var(--card-ink, #fff) 28%, transparent); border-radius:18px;
  padding:14px 18px; font:inherit; font-size:26px; color:var(--card-ink, #fff); text-align:center; letter-spacing:.18em;
  font-variant-numeric:tabular-nums; font-weight:600; transition:border-color .2s, box-shadow .2s;
}
input::placeholder{color:color-mix(in srgb, var(--card-ink, #fff) 32%, transparent); font-weight:400}
input:focus{outline:0; border-color:#FFD27A; box-shadow:0 0 0 4px rgba(255,210,122,.18)}
input.shake{animation:shake .45s}
.dots{display:flex; justify-content:center; gap:7px; margin:12px 0 4px}
.dots i{width:8px; height:8px; border-radius:50%; background:color-mix(in srgb, var(--card-ink, #fff) 18%, transparent); transition:background .15s, transform .15s}
.dots i.on{background:#F0B429; transform:scale(1.25); box-shadow:0 0 8px rgba(255,210,122,.8)}
.dots i:nth-child(4){margin-right:8px}
.btn{
  margin-top:12px; background:linear-gradient(180deg,#FFD65C,#F0B429); color:#3E2C03; border:0;
  box-shadow:0 10px 26px rgba(240,180,41,.35), inset 0 1px 0 rgba(255,255,255,.5);
}
.btn:disabled{background:color-mix(in srgb, var(--card-ink, #fff) 16%, transparent); color:color-mix(in srgb, var(--card-ink, #fff) 50%, transparent); box-shadow:none; opacity:1}
.err{background:rgba(216,84,60,.22); border:1px solid rgba(255,140,120,.35); border-radius:12px; text-align:center; font-size:12.5px; padding:9px; margin-top:12px}
.helper{text-align:center; font-size:11.5px; opacity:.62; margin-top:16px; line-height:1.6}
.why{text-align:center; font-size:10.5px; opacity:.4; margin-top:8px}
@keyframes up{from{opacity:0; transform:translateY(18px)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(3px)}}
@media (prefers-reduced-motion: reduce){ .gate-head, .perch, input.shake{animation:none} }
</style>
