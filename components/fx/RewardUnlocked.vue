<script setup lang="ts">
/* A limited-edition item earned: the member's own avatar wearing it, under
   rays of light, its name and the streak that won it — and a button to put
   it on there and then. More than one at once (a long streak from before
   the collection existed) shows the finest, and says how many more. */
import { STREAK_REWARDS, SEASON_OF, avatarSvg, normalizeAvatar, DEFAULT_AVATAR } from '~/utils/avatar'
import { rewardArt } from '~/utils/art'
const props = defineProps<{ keys: string[] }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { t } = useI18n()
const me = useMe()
const { show } = useToast()

const list = computed(() => STREAK_REWARDS.filter(r => props.keys.includes(r.key)))
const top = computed(() => list.value[list.value.length - 1])
const mine = computed(() => normalizeAvatar(me.value?.avatar || DEFAULT_AVATAR))
const art = computed(() => top.value ? avatarSvg({ ...mine.value, [top.value.field]: top.value.value }, 'unlock', 'full') : '')
const busy = ref(false)
// the moment it appears: a sparkle
watch(top, v => { if (v) sfx('unlock') }, { immediate: true })
async function wear() {
  if (!top.value) return
  busy.value = true
  try {
    await $fetch('/api/me/avatar', { method: 'PUT', body: { avatar: { ...mine.value, [top.value.field]: top.value.value } } })
    await loadMe()
    show('✨ ' + t('rwWorn'))
    emit('close')
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="top" class="veil" role="dialog" aria-live="polite" @click.self="emit('close')">
      <div class="card">
        <div class="rays" aria-hidden="true" />
        <div class="ltd">{{ t('rwLimited') }}</div>
        <div class="stage">
          <div class="art" v-html="art" />
          <img :src="rewardArt(top.key)" alt="" class="sticker">
        </div>
        <div class="new">🎉 {{ t('rwUnlocked') }}</div>
        <b class="name">{{ t('rw_' + top.key) }}</b>
        <div class="days">{{ top.track === 'season' ? t('rwSeason_' + SEASON_OF[top.key]) : top.track === 'attendance' ? '🏕️ ' + t('rwNeedsMeetings', { n: top.days }) : '🔥 ' + t('rwNeeds', { n: top.days }) }}</div>
        <div v-if="list.length > 1" class="more">{{ t('rwAndMore', { n: list.length - 1 }) }}</div>
        <button class="go" :disabled="busy" @click="wear">✨ {{ t('rwWear') }}</button>
        <button class="later" @click="emit('close')">{{ t('rwLater') }}</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.veil{position:fixed; inset:0; z-index:90; background:rgba(10,20,40,.55); display:grid; place-items:center; padding:20px; animation:fade .25s both}
.card{position:relative; overflow:hidden; width:min(340px, 100%); border-radius:28px; padding:22px 20px 18px; text-align:center;
  background:linear-gradient(180deg,#2A3F6E 0%,#1A2849 100%); color:#fff; box-shadow:0 24px 60px rgba(0,0,0,.35);
  display:flex; flex-direction:column; align-items:center; gap:6px; animation:pop .55s cubic-bezier(.2,.9,.3,1.3) both}
.rays{position:absolute; left:50%; top:34%; width:520px; height:520px; margin:-260px 0 0 -260px; border-radius:50%;
  background:repeating-conic-gradient(from 0deg, rgba(255,216,74,.18) 0 10deg, transparent 10deg 20deg); animation:spin 14s linear infinite}
.ltd{position:relative; font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#3A2A00; background:#FFD84A; border-radius:999px; padding:3px 10px}
.art{position:relative; width:190px; height:190px; border-radius:24px; overflow:hidden; margin:6px 0 4px; box-shadow:0 0 0 4px #FFD84A, 0 10px 30px rgba(0,0,0,.3)}
.art :deep(svg){width:100%; height:100%; display:block}
.new{position:relative; font-size:13px; font-weight:800; color:#FFD84A}
.name{position:relative; font-size:22px; line-height:1.2}
.days{position:relative; font-size:13px; opacity:.85}
.more{position:relative; font-size:12px; opacity:.75}
.go{position:relative; margin-top:10px; width:100%; border:0; border-radius:16px; padding:14px; font:inherit; font-weight:800; font-size:16px; color:#3A2A00;
  background:linear-gradient(180deg,#FFE27A,#F2C230); box-shadow:0 4px 0 #C99A18}
.go:active{transform:translateY(2px); box-shadow:0 2px 0 #C99A18}
.later{position:relative; border:0; background:none; color:#fff; opacity:.75; font:inherit; font-size:13px; padding:8px}
@keyframes pop{from{opacity:0; transform:scale(.8) translateY(20px)}}
@keyframes fade{from{opacity:0}}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){.card, .rays, .veil{animation:none}}
.stage{position:relative}
.sticker{position:absolute; right:-26px; top:-14px; width:88px; height:88px; object-fit:contain; filter:drop-shadow(0 6px 10px rgba(0,0,0,.35)); transform:rotate(10deg); animation:stick .6s .35s cubic-bezier(.2,1.4,.4,1) both}
@keyframes stick{from{opacity:0; transform:rotate(-30deg) scale(.3)}}
</style>
