<script setup lang="ts">
/* The Ενωμοτία's wins of the last two weeks, each with a 👏 to give — a
   Πτυχίο, an Η.Κ.Α.Δ.Ε. sign-off, a photo mission approved, a collection
   item, a birthday. One 👏 per win, never on your own; the one who earned
   it hears of it next time they open the app. Emoji only: nothing to write. */
import { rewardArt } from '~/utils/art'
const { t } = useI18n()
const { show } = useToast()
const { data: items, refresh } = await useFetch<any[]>('/api/feed', { default: () => [] })
const busy = ref<string | null>(null)
const bursting = ref<string | null>(null)

async function clap(it: any) {
  if (it.mine || it.clapped || busy.value) return
  busy.value = it.key
  sfx('pop')
  bursting.value = it.key
  setTimeout(() => { if (bursting.value === it.key) bursting.value = null }, 700)
  it.clapped = true; it.claps++
  try { await $fetch('/api/feed/clap', { method: 'POST', body: { key: it.key } }) }
  catch (e: any) { it.clapped = false; it.claps--; show(errMsg(e)) }
  finally { busy.value = null }
}
const when = (iso: string) => {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86400_000)
  return days <= 0 ? t('feedToday') : days === 1 ? t('feedYesterday') : t('feedDaysAgo', { n: days })
}
defineExpose({ refresh })
</script>

<template>
  <template v-if="items.length">
    <div class="sec-title">👏 {{ t('feedTitle') }}</div>
    <div class="feed">
      <div v-for="it in items.slice(0, 6)" :key="it.key" class="row">
        <Avatar :name="it.who.firstName" :avatar="it.who.avatar || (it.type === 'birthday' ? {} : null)" :size="40" :party="it.type === 'birthday'" />
        <div class="txt">
          <b>{{ it.who.firstName }}<template v-if="it.mine"> · {{ t('you') }}</template></b>
          <span>{{ t('feed_' + it.type, { title: it.title || '', item: it.rewardKey ? t('rw_' + it.rewardKey) : '' }) }}</span>
          <small>{{ when(it.at) }}</small>
        </div>
        <span class="what">
          <img v-if="it.rewardKey" :src="rewardArt(it.rewardKey)" alt="">
          <BadgeIcon v-else-if="it.art" :art="it.art" :emoji="it.emoji" :size="34" />
          <template v-else>{{ it.emoji }}</template>
        </span>
        <button class="clap" :class="{ on: it.clapped, mine: it.mine }" :disabled="it.mine || it.clapped"
                :aria-label="t('feedClap')" @click="clap(it)">
          <span class="hand" :class="{ burst: bursting === it.key }">👏</span><b v-if="it.claps">{{ it.claps }}</b>
        </button>
      </div>
    </div>
  </template>
</template>

<style scoped>
.feed{background:#fff; border-radius:18px; padding:6px 12px; box-shadow:var(--shadow-sm, 0 2px 10px rgba(30,70,140,.08)); display:flex; flex-direction:column}
.row{display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid var(--line)}
.row:last-child{border-bottom:0}
.txt{flex:1; min-width:0; display:flex; flex-direction:column; line-height:1.3}
.txt b{font-size:13.5px}
.txt span{font-size:12.5px; color:var(--ink); overflow-wrap:anywhere}
.txt small{font-size:11px; color:var(--muted)}
.what{flex:none; width:36px; height:36px; display:grid; place-items:center; font-size:24px}
.what img{width:36px; height:36px; object-fit:contain}
.clap{flex:none; display:flex; align-items:center; gap:4px; min-width:48px; height:34px; padding:0 10px; border-radius:17px; border:1.5px solid var(--line);
  background:#fff; font:inherit; font-size:13px; font-weight:800; color:var(--ink); cursor:pointer; justify-content:center}
.clap.on{background:#FFF3DC; border-color:#F0B429; color:#8E5B00}
.clap.mine{opacity:.7; cursor:default}
.clap:disabled{cursor:default}
.hand{display:inline-block; font-size:17px}
.hand.burst{animation:burst .6s cubic-bezier(.3,1.6,.5,1)}
@keyframes burst{0%{transform:scale(1)}35%{transform:scale(1.6) rotate(-14deg)}100%{transform:scale(1)}}
</style>
