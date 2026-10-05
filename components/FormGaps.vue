<script setup lang="ts">
/* A fill-the-gaps question: the sentence as written, with a small box where
   each blank is, sized to its hint and growing with what is typed. */
import { gapParts } from '~/utils/formSpec'
const props = defineProps<{ label: string, modelValue: string[], required?: boolean, invalid?: boolean, idPrefix?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string[]] }>()
const parts = computed(() => gapParts(props.label))
function set(i: number, v: string) {
  const next = [...(props.modelValue || [])]
  next[i] = v
  emit('update:modelValue', next)
}
// wide enough for its hint, or for what is in it, within the line
const width = (i: number, hint: string) => `${Math.min(28, Math.max(6, hint.length + 2, String(props.modelValue?.[i] ?? '').length + 2))}ch`
</script>

<template>
  <p class="gaps" :class="{ bad: invalid }">
    <template v-for="(p, k) in parts" :key="k">
      <span v-if="'text' in p" class="txt">{{ p.text }}</span>
      <input v-else :id="p.gap === 0 && idPrefix ? idPrefix : undefined" class="gap" :class="{ empty: !String(modelValue?.[p.gap] ?? '').trim() }"
             :value="modelValue?.[p.gap] ?? ''" :placeholder="p.hint" :aria-label="p.hint || `${p.gap + 1}`"
             :style="{ width: width(p.gap, p.hint) }" maxlength="300"
             @input="set(p.gap, ($event.target as HTMLInputElement).value)">
    </template><span v-if="required" class="req">*</span>
  </p>
</template>

<style scoped>
.gaps{margin:0; font-size:15.5px; line-height:2.3; color:var(--ink); white-space:pre-line}
.gap{display:inline-block; max-width:100%; vertical-align:baseline; font:inherit; font-weight:650; color:var(--accent-deep, #27473A);
  border:none; border-bottom:2px solid var(--accent, #3B6452); background:var(--accent-soft, #E2EEE7); border-radius:8px 8px 2px 2px;
  padding:1px 8px; margin:0 3px; line-height:1.5; outline:none; transition:background .15s, border-color .15s}
.gap::placeholder{color:#8FA59A; font-weight:500}
.gap:focus{background:#fff; box-shadow:0 0 0 3px var(--accent-soft, #E2EEE7)}
.bad .gap.empty{border-bottom-color:var(--danger, #D8543C); background:#FCEBE7}
.req{color:var(--danger, #D8543C); margin-left:3px}
</style>
