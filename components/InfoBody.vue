<script setup lang="ts">
/* Minimal renderer for leader-written Markdown: ## headings, - lists, > notes,
   pictures on a line of their own — ![caption](link) — places, as a line
   "📍 name (lat, lng)", shown as a map with the way there, and paragraphs. */
const props = defineProps<{ text: string }>()
type Block = { t: 'h' | 'p' | 'note', text?: string } | { t: 'list', items: string[] } | { t: 'img', src: string, alt: string }
  | { t: 'map', lat: number, lng: number, label: string }
// only the app's own uploaded pictures, never an outside address
const IMG = /^!\[([^\]]*)\]\((\/api\/info-image\/\d+)\)$/
const blocks = computed<Block[]>(() => {
  const out: Block[] = []
  let list: string[] | null = null
  for (const raw of (props.text || '').split('\n')) {
    const line = raw.trim()
    if (line.startsWith('- ')) { (list ||= []).push(line.slice(2)); continue }
    if (list) { out.push({ t: 'list', items: list }); list = null }
    if (!line) continue
    const img = line.match(IMG)
    if (img) { out.push({ t: 'img', alt: img[1], src: img[2] }); continue }
    const pin = line.match(PIN_LINE)
    if (pin) { out.push({ t: 'map', label: pin[1], lat: Number(pin[2]), lng: Number(pin[3]) }); continue }
    if (line.startsWith('## ')) out.push({ t: 'h', text: line.slice(3) })
    else if (line.startsWith('> ')) out.push({ t: 'note', text: line.slice(2) })
    else out.push({ t: 'p', text: line })
  }
  if (list) out.push({ t: 'list', items: list })
  return out
})
</script>

<template>
  <div style="display:flex;flex-direction:column;gap:13px">
    <template v-for="(b, i) in blocks" :key="i">
      <div v-if="b.t === 'h'" class="sec-title" style="margin-bottom:2px">{{ b.text }}</div>
      <p v-else-if="b.t === 'p'" style="margin:0;font-size:13px;line-height:1.6">{{ b.text }}</p>
      <div v-else-if="b.t === 'note'" class="note">{{ b.text }}</div>
      <InfoMap v-else-if="b.t === 'map'" :lat="b.lat" :lng="b.lng" :label="b.label" />
      <figure v-else-if="b.t === 'img'" style="margin:0">
        <img :src="b.src" :alt="b.alt" loading="lazy" style="display:block;width:100%;height:auto;border-radius:14px;box-shadow:var(--shadow-sm)">
        <figcaption v-if="b.alt" class="tiny muted" style="margin-top:5px;text-align:center">{{ b.alt }}</figcaption>
      </figure>
      <div v-else-if="b.t === 'list'" class="card" style="display:flex;flex-direction:column;gap:10px">
        <div v-for="(it, j) in b.items" :key="j" style="display:flex;gap:9px;align-items:flex-start;font-size:13px;line-height:1.45">
          <span style="flex:none;width:19px;height:19px;border-radius:50%;background:var(--blue);color:#fff;font-size:10px;font-weight:700;display:grid;place-items:center;margin-top:1px">{{ j + 1 }}</span>
          <span>{{ it }}</span>
        </div>
      </div>
    </template>
  </div>
</template>
