<script setup lang="ts">
/* The landing: arriving at camp at night. Stars come out, the treeline rises,
   the fire catches, and the troop's phoenix rises out of it and opens its
   wings; the crest flips in above. Meanwhile the session resolves, and we go
   on to the passcode screen or straight in. */
const { t } = useI18n()
onMounted(async () => {
  const [me] = await Promise.all([
    loadMe(),
    new Promise(r => setTimeout(r, 2300)) // long enough for the phoenix to land
  ])
  navigateTo(!me ? '/login' : me.role === 'scout' ? '/app' : '/admin', { replace: true })
})
</script>

<template>
  <FxCampScene intro :fire="false" class="landing">
    <div class="brand">
      <FxCrestCoin class="crest" :size="74" />
      <h1 class="title">{{ t('appName') }}</h1>
      <div class="tag">{{ t('troopName') }}</div>
    </div>
    <MascotPhoenix class="bird" pose="rise" />
    <div class="loader"><i /></div>
  </FxCampScene>
</template>

<style scoped>
.landing{--fire-bottom:9%}
.brand{
  position:absolute; left:0; right:0; top:calc(env(safe-area-inset-top) + 9vh);
  display:flex; flex-direction:column; align-items:center; text-align:center; padding:0 24px;
}
.crest{animation:fade .6s 1.1s both}
.title{
  margin:16px 0 4px; font-size:30px; font-weight:750; letter-spacing:-.025em;
  background:linear-gradient(180deg,var(--title1,#FFF8E1),var(--title2,#FFD97A)); -webkit-background-clip:text; background-clip:text; color:transparent;
  animation:up .7s 1.35s cubic-bezier(.2,.8,.3,1) both;
}
.tag{
  /* no uppercase: it turns the ο of "30ο" into Ο, and the troop reads as "300" */
  font-size:11.5px; letter-spacing:.1em; opacity:.72; max-width:300px; line-height:1.5;
  animation:up .7s 1.5s cubic-bezier(.2,.8,.3,1) both;
}
/* the phoenix and its own campfire, standing on the ground */
.bird{position:absolute; left:50%; bottom:7.5%; width:min(74vw, 300px); translate:-50% 0}
.loader{
  position:absolute; left:50%; bottom:calc(env(safe-area-inset-bottom) + 3.2%); width:96px; height:3px; margin-left:-48px;
  border-radius:3px; background:rgba(255,255,255,.14); overflow:hidden; animation:fade .5s 1.6s both;
}
.loader i{
  display:block; width:40%; height:100%; border-radius:3px;
  background:linear-gradient(90deg,transparent,#FFD27A,transparent);
  animation:slide 1.2s ease-in-out infinite;
}
@keyframes up{from{opacity:0; transform:translateY(16px)}}
@keyframes fade{from{opacity:0}}
@keyframes slide{0%{margin-left:-40%}100%{margin-left:100%}}
@media (prefers-reduced-motion: reduce){ .crest, .title, .tag, .loader{animation:none} }
</style>
