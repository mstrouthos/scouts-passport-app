<script setup lang="ts">
/* Φόρμες — forms the administrators build and anyone with the link fills in,
   on forms.scouts30.org. Administrators only: what comes back is families'
   data. */
const { t, locale } = useI18n()
const me = useMe()
const { show } = useToast()
if (me.value && me.value.role !== 'troop_leader') navigateTo('/admin/more', { replace: true })
const { data: forms, refresh } = await useFetch<any[]>('/api/admin/forms')

const creating = ref(false)
const title = ref('')
const busy = ref(false)
/* a new form starts empty or from a template: a saved form's questions and
   messages, to change what differs this time */
const { data: templates, refresh: refreshTemplates } = await useFetch<any[]>('/api/admin/form-templates')
const fromTemplate = ref<number | null>(null)
function openCreate() { title.value = ''; fromTemplate.value = null; creating.value = true; refreshTemplates() }
function pickTemplate(id: number | null) {
  fromTemplate.value = id
  // the template's name is a good start for the title, until one is typed
  const tp = templates.value?.find(x => x.id === id)
  if (tp && !title.value.trim()) title.value = tp.name
}
async function removeTemplate(tp: any) {
  if (!confirm(t('formTemplateDeleteQ', { name: tp.name }))) return
  try {
    await $fetch(`/api/admin/form-templates/${tp.id}`, { method: 'DELETE' })
    if (fromTemplate.value === tp.id) fromTemplate.value = null
    await refreshTemplates()
  } catch (e: any) { show(errMsg(e)) }
}
async function create() {
  if (!title.value.trim() || busy.value) return
  busy.value = true
  try {
    const r = await $fetch<any>('/api/admin/forms', { method: 'POST', body: { titleEl: title.value, fromTemplate: fromTemplate.value || undefined } })
    await navigateTo(`/admin/forms/${r.id}`)
  } catch (e: any) { show(errMsg(e)) } finally { busy.value = false }
}
onMounted(refresh)
</script>

<template>
  <AppShell :title="t('forms')" :sub="t('formsSub')" back="/admin/more">
    <div v-if="!forms?.length" class="empty">{{ t('formsNone') }}</div>
    <div v-else class="adm">
      <NuxtLink v-for="f in forms" :key="f.id" :to="`/admin/forms/${f.id}`" class="it">
        <div style="flex:1;min-width:0">
          <b>{{ f.titleEl }}</b>
          <span>forms.scouts30.org/{{ f.slug }} · {{ fmtDate(f.createdAt, locale) }}</span>
        </div>
        <span v-if="f.unread" class="pill live">{{ f.unread }} {{ t('formNew') }}</span>
        <span class="pill" :class="f.accepting ? 'ok' : 'draft'">{{ f.accepting ? t('formOpen') : t('formClosedShort') }}</span>
        <span class="tiny muted" style="flex:none">{{ f.responses }}</span>
        <span class="chev">›</span>
      </NuxtLink>
    </div>
    <div class="tiny muted">🔒 {{ t('formsAdminOnly') }}</div>

    <button class="fab" :aria-label="t('formNewForm')" @click="openCreate">+</button>
    <Teleport to="body">
      <div v-if="creating" class="sheet-backdrop" @click.self="creating = false">
        <div class="sheet" style="display:flex;flex-direction:column;gap:12px">
          <h3 style="margin:0;font-size:17px;text-align:center">{{ t('formNewForm') }}</h3>
          <div v-if="templates?.length">
            <label class="lab">{{ t('formStartFrom') }}</label>
            <div class="tpls">
              <button type="button" class="tpl" :class="{ on: !fromTemplate }" @click="pickTemplate(null)">
                <span class="ic">📄</span><span class="nm"><b>{{ t('formBlank') }}</b></span>
              </button>
              <div v-for="tp in templates" :key="tp.id" class="tpl" :class="{ on: fromTemplate === tp.id }" role="button" tabindex="0"
                   @click="pickTemplate(tp.id)" @keydown.enter="pickTemplate(tp.id)">
                <span class="ic">⭐</span>
                <span class="nm"><b>{{ tp.name }}</b><small>{{ t('formTemplateSize', { m: tp.modules, q: tp.questions }) }}</small></span>
                <button type="button" class="del" :aria-label="t('delete')" @click.stop="removeTemplate(tp)">🗑</button>
              </div>
            </div>
          </div>
          <div>
            <label class="lab">{{ t('formTitle') }}</label>
            <input v-model="title" class="in" :placeholder="t('formTitlePh')" @keydown.enter="create">
          </div>
          <button class="btn" :disabled="!title.trim() || busy" @click="create">{{ t('formCreate') }}</button>
          <button class="btn ghost" @click="creating = false">{{ t('close') }}</button>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<style scoped>
.tpls{display:flex; flex-direction:column; gap:6px; max-height:38dvh; overflow:auto}
.tpl{display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:14px; border:2px solid var(--line, #DCE5EF); background:#fff; text-align:left; cursor:pointer; font:inherit; color:inherit}
.tpl.on{border-color:var(--accent); background:var(--accent-soft)}
.tpl .ic{font-size:18px; flex:none}
.tpl .nm{flex:1; min-width:0; display:flex; flex-direction:column}
.tpl .nm b{font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.tpl .nm small{font-size:12px; color:var(--muted)}
.tpl .del{flex:none; border:none; background:none; font-size:15px; padding:4px; cursor:pointer; opacity:.7}
</style>
