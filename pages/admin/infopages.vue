<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/admin/info')
const editing = ref<any>(null)

const sectionName = (id: number | null) =>
  id == null ? t('wholeTroop') : (data.value?.sections || []).find((x: any) => x.id === id)?.nameEl ?? ''

/* Pages are grouped by who they are for: everyone first, then each sector. */
const groups = computed(() => {
  const pages = data.value?.pages || []
  const buckets: Array<{ id: number | null, label: string, pages: any[] }> = [
    { id: null, label: t('wholeTroop'), pages: pages.filter((p: any) => p.sectionId == null) }
  ]
  for (const sec of data.value?.sections || [])
    buckets.push({ id: sec.id, label: sec.nameEl, pages: pages.filter((p: any) => p.sectionId === sec.id) })
  return buckets
})

function open(page: any | null, sectionId: number | null = null) {
  editing.value = page
    ? { ...page, iconEmoji: page.icon }
    : { slug: '', iconEmoji: 'ℹ️', titleEl: '', titleEn: '', summaryEl: '',
        bodyEl: '', bodyEn: '', isPublished: false, sectionId }
}
async function save() {
  try {
    await $fetch('/api/admin/info', { method: 'POST', body: editing.value })
    editing.value = null
    await refresh(); show('✅ ' + t('saved'))
  } catch (e: any) { show(e?.data?.message || t('error')) }
}
</script>

<template>
  <AppShell :title="t('infoAdmin')" :sub="t('infoAdminSub')" back="/admin/more">
    <template v-for="g in groups" :key="String(g.id)">
      <div class="sec-title">{{ g.id == null ? '🏕️ ' + g.label : g.label }}</div>
      <div class="adm">
        <button v-for="p in g.pages" :key="p.id" class="it" @click="open(p)">
          <div style="font-size:19px;width:26px;text-align:center">{{ p.icon }}</div>
          <div style="flex:1"><b>{{ lx(p) }}</b><span>{{ lx(p, 'summary') }}</span></div>
          <span class="pill" :class="p.isPublished ? 'ok' : 'draft'">{{ p.isPublished ? t('publishedP') : t('draft') }}</span>
        </button>
        <button class="it" style="color:var(--accent-deep)" @click="open(null, g.id)">
          <div style="font-size:19px;width:26px;text-align:center">+</div>
          <div style="flex:1"><b>{{ t('newPage') }}</b><span>{{ g.label }}</span></div>
        </button>
      </div>
    </template>
    <div class="tiny muted">{{ t('infoSectionNote') }}</div>

    <Teleport to="body">
      <div v-if="editing" class="sheet-backdrop" @click.self="editing = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:11px;max-height:88dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ editing.id ? t('editPage') : t('newPage') }}</h3>
          <div style="display:flex;gap:8px">
            <div style="flex:1"><label class="lab">{{ t('icon') }}</label><input v-model="editing.iconEmoji" class="in"></div>
            <div style="flex:2"><label class="lab">{{ t('slug') }}</label><input v-model="editing.slug" class="in" placeholder="e.g. knots"></div>
          </div>
          <div>
            <label class="lab">{{ t('whoFor') }}</label>
            <div class="chips">
              <button class="chip" :class="{ on: editing.sectionId == null }" @click="editing.sectionId = null">
                🏕️ {{ t('wholeTroop') }}
              </button>
              <button v-for="sec in data?.sections" :key="sec.id" class="chip"
                      :class="{ on: editing.sectionId === sec.id }" @click="editing.sectionId = sec.id">
                {{ lx(sec, 'name') }}
              </button>
            </div>
          </div>
          <div><label class="lab">{{ t('titleEl') }}</label><input v-model="editing.titleEl" class="in"></div>
          <div><label class="lab">{{ t('summary') }}</label><input v-model="editing.summaryEl" class="in"></div>
          <div><label class="lab">{{ t('body') }}</label><textarea v-model="editing.bodyEl" class="in" rows="7" /></div>
          <div><label class="lab">{{ t('bodyEn') }}</label><textarea v-model="editing.bodyEn" class="in" rows="4" :placeholder="t('enOptional')" /></div>
          <button class="srow" style="box-shadow:none;border:1px solid var(--line)" @click="editing.isPublished = !editing.isPublished">
            <div class="txt"><b>{{ t('publishedQ') }}</b></div>
            <span class="sw" :class="{ off: !editing.isPublished }" />
          </button>
          <button class="btn" :disabled="!editing.slug || !editing.titleEl" @click="save">{{ t('save') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>
