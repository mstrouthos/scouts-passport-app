<script setup lang="ts">
/* The shop, for the members of a κλάδος it is open to (the Αρχηγός
   Συστήματος decides): what it sells, for how much, and its pictures. Nothing
   is bought or ordered here — for that, the person who runs it. */
const { t } = useI18n()
const { data } = await useFetch<any>('/api/shop')
const eur = (c: number) => (c / 100).toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })
const viewing = ref<any>(null)
const anyPic = computed(() => (data.value?.items || []).some((i: any) => i.images?.length))
</script>

<template>
  <AppShell :title="t('shop')" :sub="t('shopSub')" back="/app">
    <div class="tiny muted" style="text-align:center">{{ t('shopNote') }}</div>
    <div v-if="data?.items?.length" class="items">
      <button v-for="i in data.items" :key="i.id" class="item" :class="{ gone: i.soldOut }" @click="viewing = i">
        <img v-if="i.images?.[0]" :src="i.images[0].url" alt="" class="thumb" loading="lazy">
        <div v-else-if="anyPic" class="thumb none">🛍️</div>
        <div class="it">
          <b>{{ i.name }}</b>
          <span v-if="i.description">{{ i.description }}</span>
          <small v-if="i.soldOut" class="tag out">{{ t('shopSoldOut') }}</small>
        </div>
        <div class="price">{{ eur(i.priceCents) }}</div>
        <span class="chev">›</span>
      </button>
    </div>
    <div v-else-if="data" class="card tiny muted" style="text-align:center">{{ t('shopEmpty') }}</div>
    <ShopItemSheet v-if="viewing" :item="viewing" @close="viewing = null" />
  </AppShell>
</template>

<style scoped>
.items{display:flex; flex-direction:column; gap:8px}
.item{display:flex; align-items:center; gap:12px; background:#fff; border:0; border-radius:16px; padding:12px 14px; text-align:left; width:100%;
  box-shadow:0 1px 6px rgba(20,40,70,.06); color:var(--ink)}
.item.gone .price{color:var(--muted); text-decoration:line-through}
.thumb{flex:none; width:54px; height:54px; border-radius:12px; object-fit:cover; background:#F3F5F8}
.thumb.none{display:grid; place-items:center; font-size:22px; opacity:.5}
.it{flex:1; min-width:0; display:flex; flex-direction:column; gap:2px}
.it b{font-size:15px}
.it span{font-size:12.5px; color:var(--muted)}
.tag{align-self:flex-start; font-size:11px; font-weight:700; border-radius:999px; padding:2px 8px}
.tag.out{background:#FDECEC; color:#B3261E}
.price{flex:none; font-size:16px; font-weight:800; color:var(--green, #2E7D5B); font-variant-numeric:tabular-nums}
.chev{color:var(--muted); font-size:18px}
</style>
