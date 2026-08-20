<script setup lang="ts">
const { t } = useI18n()
const lx = useLx()
const { show } = useToast()
const { data, refresh } = await useFetch<any>('/api/info')
const editing = ref<any>(null)

async function open(slug: string | null) {
  if (!slug) {
    editing.value = { slug: '', iconEmoji: 'ℹ️', titleEl: '', titleEn: '', summaryEl: '', bodyEl: '', bodyEn: '', isPublished: false }
    return
  }
  const full = await $fetch<any>(`/api/info/${slug}`)
  editing.value = { ...full, iconEmoji: full.icon, isPublished: (data.value || []).find((p: any) => p.slug === slug)?.isPublished ?? true }
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
    <div class="adm">
      <div class="hdr">{{ t('info') }} · {{ data?.length || 0 }}</div>
      <button v-for="p in data" :key="p.slug" class="it" @click="open(p.slug)">
        <div style="font-size:19px;width:26px;text-align:center">{{ p.icon }}</div>
        <div style="flex:1"><b>{{ lx(p) }}</b><span>{{ lx(p, 'summary') }}</span></div>
        <span class="pill" :class="p.isPublished ? 'ok' : 'draft'">{{ p.isPublished ? t('publishedP') : t('draft') }}</span>
      </button>
    </div>
    <button class="fab" :aria-label="t('newPage')" @click="open(null)">+</button>

    <Teleport to="body">
      <div v-if="editing" class="sheet-backdrop" @click.self="editing = null">
        <div class="sheet" style="display:flex;flex-direction:column;gap:11px;max-height:88dvh;overflow:auto">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ editing.id ? t('editPage') : t('newPage') }}</h3>
          <div style="display:flex;gap:8px">
            <div style="flex:1"><label class="lab">{{ t('icon') }}</label><input v-model="editing.iconEmoji" class="in"></div>
            <div style="flex:2"><label class="lab">{{ t('slug') }}</label><input v-model="editing.slug" class="in" placeholder="e.g. knots"></div>
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
