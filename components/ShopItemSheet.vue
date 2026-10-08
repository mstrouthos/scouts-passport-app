<script setup lang="ts">
/* An item of the shop, opened: its pictures to swipe through (a dot for
   each), its name, what it is, and its price. Nothing is bought here. */
const props = defineProps<{ item: { name: string, description?: string | null, priceCents: number, soldOut?: boolean, stock?: number | null, images?: { id: number, url: string }[] } }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const eur = (c: number) => (c / 100).toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })
const strip = ref<HTMLElement | null>(null)
const at = ref(0)
const pics = computed(() => props.item.images || [])
const soldOut = computed(() => props.item.soldOut || props.item.stock === 0)
function onScroll() {
  const el = strip.value
  if (el) at.value = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
}
function go(i: number) {
  const el = strip.value
  if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
}
</script>

<template>
  <Teleport to="body">
    <div class="sheet-backdrop" @click.self="emit('close')">
      <div class="sheet isheet">
        <div v-if="pics.length" class="gal">
          <div ref="strip" class="strip" @scroll.passive="onScroll">
            <img v-for="p in pics" :key="p.id" :src="p.url" :alt="item.name" loading="lazy">
          </div>
          <template v-if="pics.length > 1">
            <button class="nav l" :aria-label="t('shopPicPrev')" :disabled="at === 0" @click="go(at - 1)">‹</button>
            <button class="nav r" :aria-label="t('shopPicNext')" :disabled="at >= pics.length - 1" @click="go(at + 1)">›</button>
            <div class="dots"><span v-for="(p, i) in pics" :key="p.id" :class="{ on: i === at }" /></div>
          </template>
        </div>
        <div class="head">
          <h3>{{ item.name }}</h3>
          <b class="price" :class="{ gone: soldOut }">{{ eur(item.priceCents) }}</b>
        </div>
        <span v-if="soldOut" class="tag out">{{ t('shopSoldOut') }}</span>
        <p v-if="item.description" class="desc">{{ item.description }}</p>
        <div class="tiny muted">{{ t('shopNote') }}</div>
        <button class="btn ghost" @click="emit('close')">{{ t('close') }}</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.isheet{display:flex; flex-direction:column; gap:10px; max-height:90dvh; overflow:auto}
.gal{position:relative; margin:-4px -4px 0; border-radius:18px; overflow:hidden; background:#F3F5F8}
.strip{display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; aspect-ratio:1/1}
.strip::-webkit-scrollbar{display:none}
.strip img{flex:none; width:100%; height:100%; object-fit:contain; scroll-snap-align:center}
.nav{position:absolute; top:50%; transform:translateY(-50%); width:34px; height:34px; border-radius:50%; border:0;
  background:rgba(255,255,255,.88); font-size:22px; font-weight:800; line-height:1; color:var(--ink); box-shadow:0 1px 6px rgba(0,0,0,.15)}
.nav:disabled{opacity:0; pointer-events:none}
.nav.l{left:8px}
.nav.r{right:8px}
.dots{position:absolute; left:0; right:0; bottom:8px; display:flex; justify-content:center; gap:6px}
.dots span{width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,.6); box-shadow:0 0 2px rgba(0,0,0,.3)}
.dots span.on{background:#fff; transform:scale(1.25)}
.head{display:flex; align-items:baseline; gap:10px}
.head h3{flex:1; margin:0; font-size:19px; line-height:1.25}
.price{font-size:19px; font-weight:800; color:var(--green, #2E7D5B); font-variant-numeric:tabular-nums}
.price.gone{color:var(--muted); text-decoration:line-through}
.desc{margin:0; font-size:14.5px; line-height:1.5; white-space:pre-line}
.tag{align-self:flex-start; font-size:11px; font-weight:700; border-radius:999px; padding:2px 8px}
.tag.out{background:#FDECEC; color:#B3261E}
</style>
