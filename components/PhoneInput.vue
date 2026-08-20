<script setup lang="ts">
/** Cyprus-only phone field: fixed +357 prefix, 8-digit local number.
    v-model always holds the full E.164 string (e.g. "+35799123456") or null. */
const props = defineProps<{ modelValue: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [string | null] }>()

const local = computed({
  get: () => (props.modelValue || '').replace(/^\+357/, ''),
  set: (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 8)
    emit('update:modelValue', digits ? `+357${digits}` : null)
  }
})
defineExpose({ valid: computed(() => !local.value || local.value.length === 8) })
</script>

<template>
  <div>
    <div class="phone-field">
      <span class="phone-prefix">+357</span>
      <input v-model="local" class="in phone-input" inputmode="numeric" maxlength="8" placeholder="99 123456">
    </div>
    <div v-if="local && local.length !== 8" class="tiny" style="color:var(--danger);margin-top:4px">
      {{ $t('phoneInvalid') }}
    </div>
  </div>
</template>

<style scoped>
.phone-field{ position:relative }
.phone-prefix{
  position:absolute; left:13px; top:50%; transform:translateY(-50%);
  font-size:13px; color:var(--muted); font-weight:600; pointer-events:none;
}
.phone-input{ padding-left:52px }
</style>
