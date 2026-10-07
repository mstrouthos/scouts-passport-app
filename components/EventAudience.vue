<script setup lang="ts">
/* Who an event is for: the whole troop, one sector or several together, the
   Βαθμοφόροι, or a group. The Βαθμοφόροι are picked like a sector: alone it is
   their meeting (all of them — the Αρχηγός Συστήματος's to call), beside
   sectors it is those sectors' event with every Βαθμοφόρος asked too. Any
   sector's leader may call the whole troop, or share their sector's event
   with others — never set one for other sectors without their own. */
const props = defineProps<{ secs: any[], groups?: any[], isTroop: boolean }>()
const f = defineModel<{ scope: string, sectionIds: number[], groupId: number | null, leadersOnly: boolean, withLeaders?: boolean }>({ required: true })
const { t } = useI18n()
const lx = useLx()
const mine = computed(() => props.secs.filter(x => x.mine).map(x => x.id))
function toggleSec(id: number) {
  // the Βαθμοφόροι's meeting gains a sector: that sector's event, with them
  if (f.value.scope === 'leaders') { f.value.scope = 'section'; f.value.sectionIds = [id]; f.value.withLeaders = true; return }
  if (f.value.scope !== 'section') { f.value.scope = 'section'; f.value.sectionIds = [id]; f.value.withLeaders = false; return }
  const l = f.value.sectionIds
  f.value.sectionIds = l.includes(id) ? l.filter(x => x !== id) : [...l, id]
  if (f.value.sectionIds.length !== 1) f.value.leadersOnly = false
  // the last sector off with the Βαθμοφόροι still on: their meeting
  if (!f.value.sectionIds.length && f.value.withLeaders && props.isTroop) { f.value.scope = 'leaders'; f.value.withLeaders = false }
}
const leadersOn = computed(() => f.value.scope === 'leaders' || (f.value.scope === 'section' && !!f.value.withLeaders))
function toggleLeaders() {
  if (f.value.scope === 'section' && f.value.sectionIds.length) {
    f.value.withLeaders = !f.value.withLeaders
    if (f.value.withLeaders) f.value.leadersOnly = false
  } else if (f.value.scope === 'leaders') {
    f.value.scope = 'section'; f.value.sectionIds = []; f.value.withLeaders = false
  } else {
    // alone: all the Βαθμοφόροι's meeting — a sector leader adds a sector of their own to it
    f.value.scope = props.isTroop ? 'leaders' : 'section'; f.value.sectionIds = []; f.value.withLeaders = !props.isTroop
  }
}
const names = computed(() => [...props.secs.filter(x => f.value.sectionIds.includes(x.id)).map(x => lx(x, 'name')), ...(f.value.withLeaders ? [t('vathmoforoi')] : [])].join(' + '))
const missingOwn = computed(() => f.value.scope === 'section' && (f.value.sectionIds.length > 0 || !!f.value.withLeaders) && !f.value.sectionIds.some(x => mine.value.includes(x)))
</script>

<template>
  <div>
    <label class="lab">{{ t('scopeQ') }}</label>
    <div class="chips">
      <button type="button" class="chip" :class="{ on: f.scope === 'troop' }" @click="f.scope = 'troop'; f.sectionIds = []; f.withLeaders = false">{{ t('wholeTroop') }}</button>
      <button v-for="sec in secs" :key="sec.id" type="button" class="chip" :class="{ on: f.scope === 'section' && f.sectionIds.includes(sec.id) }"
              @click="toggleSec(sec.id)">{{ lx(sec, 'name') }}</button>
      <button type="button" class="chip" :class="{ on: leadersOn }" @click="toggleLeaders">🎖️ {{ t('vathmoforoi') }}</button>
      <button v-for="g in groups || []" :key="'g' + g.id" type="button" class="chip" :class="{ on: f.scope === 'group' && f.groupId === g.id }"
              @click="f.scope = 'group'; f.groupId = g.id; f.withLeaders = false">{{ g.emoji }} {{ g.nameEl }}</button>
    </div>
    <div v-if="missingOwn" class="tiny" style="color:var(--danger);margin-top:6px">{{ t('evNeedOwnSector') }}</div>
    <div v-else-if="f.scope === 'section' && (f.sectionIds.length > 1 || f.withLeaders)" class="tiny" style="margin-top:6px">🤝 {{ t('evShared', { list: names }) }}</div>
    <div v-else-if="f.scope === 'leaders'" class="tiny muted" style="margin-top:6px">{{ t('evLeadersAll') }}</div>
    <div v-else-if="f.scope === 'section' && !f.sectionIds.length" class="tiny muted" style="margin-top:6px">{{ t('evPickSector') }}</div>
    <template v-if="f.scope === 'section' && f.sectionIds.length === 1 && !f.withLeaders">
      <label class="tiny muted" style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-top:8px">
        <input v-model="f.leadersOnly" type="checkbox"> {{ t('leadersOnly') }}
      </label>
      <div v-if="f.leadersOnly" class="tiny muted" style="margin-top:4px">{{ t('leadersOnlyNote') }}</div>
    </template>
  </div>
</template>
