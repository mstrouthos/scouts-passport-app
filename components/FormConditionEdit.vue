<script setup lang="ts">
/* "Show this only if…": pick an earlier choice question, then the answers
   that show it. Off, it is shown to everyone. */
import type { FormCondition } from '~/utils/formSpec'
type Source = { id: string, label: string, options: string[] }
const props = defineProps<{ modelValue?: FormCondition, sources: Source[], what: 'module' | 'question' }>()
const emit = defineEmits<{ 'update:modelValue': [FormCondition | undefined] }>()
const { t } = useI18n()

const on = ref(!!props.modelValue)
const src = computed(() => props.sources.find(s => s.id === props.modelValue?.q))
function setOn(v: boolean) {
  on.value = v
  if (!v) emit('update:modelValue', undefined)
}
function pickSource(id: string) {
  emit('update:modelValue', id ? { q: id, anyOf: [] } : undefined)
}
function toggle(o: string) {
  const c = props.modelValue
  if (!c) return
  emit('update:modelValue', { q: c.q, anyOf: c.anyOf.includes(o) ? c.anyOf.filter(x => x !== o) : [...c.anyOf, o] })
}
/* answers chosen once but since renamed or removed from the question */
const stale = computed(() => (props.modelValue?.anyOf || []).filter(o => !src.value?.options.includes(o)))
</script>

<template>
  <div class="cond" :class="{ on }">
    <label class="tog">
      <input type="checkbox" :checked="on" :disabled="!sources.length && !on" @change="setOn(($event.target as HTMLInputElement).checked)">
      🔀 {{ what === 'module' ? t('formCondModule') : t('formCondQuestion') }}
    </label>
    <div v-if="!sources.length && !on" class="tiny muted">{{ t('formCondNoSources') }}</div>
    <template v-if="on">
      <select class="in" :value="modelValue?.q || ''" @change="pickSource(($event.target as HTMLSelectElement).value)">
        <option value="" disabled>{{ t('formCondPickQ') }}</option>
        <option v-for="s in sources" :key="s.id" :value="s.id">{{ s.label || t('formUntitledQ') }}</option>
      </select>
      <template v-if="src">
        <div class="tiny muted">{{ t('formCondAnswerIs') }}</div>
        <div class="chips">
          <button v-for="o in src.options" :key="o" type="button" class="chip" :class="{ on: modelValue?.anyOf.includes(o) }" @click="toggle(o)">{{ o }}</button>
        </div>
        <div v-if="!src.options.length" class="tiny muted">{{ t('formCondNoOptions') }}</div>
        <div v-else-if="!modelValue?.anyOf.length" class="tiny warn">{{ t('formCondPickA') }}</div>
        <div v-if="stale.length" class="tiny warn">{{ t('formCondStale', { list: stale.join(', ') }) }}</div>
      </template>
      <div v-else-if="modelValue?.q" class="tiny warn">{{ t('formCondGone') }}</div>
    </template>
  </div>
</template>

<style scoped>
.cond{display:flex; flex-direction:column; gap:8px; border-radius:12px}
.cond.on{background:var(--gold-soft); padding:10px}
.tog{display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer}
.tog input{width:18px; height:18px; accent-color:var(--accent)}
select.in{appearance:auto}
.warn{color:#8A6614; font-weight:600}
</style>
