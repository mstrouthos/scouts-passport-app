<script setup lang="ts">
const { t } = useI18n()
const me = useMe()
const lx = useLx()
const { show } = useToast()
const isTroop = computed(() => me.value?.role === 'troop_leader')
const { data: secs } = await useFetch<any>('/api/admin/contacts?all=1')     // every sector, mine marked
const { data: groups } = await useFetch<any[]>('/api/admin/groups')  // e.g. η μπάντα
const form = reactive({
  titleEl: '', titleEn: '', location: '', themeEl: '', descriptionEl: '',
  date: new Date().toISOString().slice(0, 10), start: '17:00',
  endDate: '', end: '19:00', remind: true,   // a camp ends on another day
  tracksAttendance: true
})
/* who it is for: the whole troop, a sector or several, the Βαθμοφόροι, a group
   — a sector leader's own sector picked to start with */
const aud = ref({ scope: isTroop.value ? 'troop' : 'section', sectionIds: [] as number[], groupId: null as number | null, leadersOnly: false, withLeaders: false })
// once, to start with — after that the choice is theirs, empty or not
let started = false
watchEffect(() => {
  if (started || !secs.value?.length) return
  started = true
  const own = secs.value.find((x: any) => x.mine)
  if (aud.value.scope === 'section' && !isTroop.value && own) aud.value.sectionIds = [own.id]
})
const audOk = computed(() => aud.value.scope !== 'section'
  || (aud.value.sectionIds.length > 0 && aud.value.sectionIds.some(x => secs.value?.find((s: any) => s.id === x)?.mine)))

async function save() {
  const startsAt = new Date(`${form.date}T${form.start}`).toISOString()
  const endsAt = form.end ? new Date(`${form.endDate || form.date}T${form.end}`).toISOString() : null
  if (endsAt && endsAt <= startsAt) return show(t('endAfterStart'))
  const remindAt = form.remind ? new Date(new Date(startsAt).getTime() - 86400_000).toISOString() : null
  try {
    await $fetch('/api/admin/events', {
      method: 'POST',
      body: { titleEl: form.titleEl, titleEn: form.titleEn || null, location: form.location || null,
              themeEl: form.themeEl || null, descriptionEl: form.descriptionEl || null,
              scope: aud.value.scope === 'section' && aud.value.leadersOnly ? 'leaders' : aud.value.scope,
              sectionIds: aud.value.scope === 'section' ? aud.value.sectionIds : undefined,
              withLeaders: aud.value.scope === 'section' && !!aud.value.withLeaders,
              sectionId: aud.value.scope === 'section' ? aud.value.sectionIds[0] : null,
              groupId: aud.value.scope === 'group' ? aud.value.groupId : null,
              startsAt, endsAt, remindAt,
              tracksAttendance: form.tracksAttendance }
    })
    show('✅ ' + t('saved'))
    navigateTo('/admin/events')
  } catch (e: any) { show(errMsg(e)) }
}
</script>

<template>
  <AppShell :title="t('newEvent')" back="/admin/events">
    <div class="cols-2">
      <div style="display:flex;flex-direction:column;gap:13px">
        <div><label class="lab">{{ t('titleEl') }}</label><input v-model="form.titleEl" class="in"></div>
        <div><label class="lab">{{ t('titleEn') }}</label><input v-model="form.titleEn" class="in" :placeholder="t('enOptional')"></div>
        <div><label class="lab">{{ t('location') }}</label><input v-model="form.location" class="in"></div>
        <div>
          <label class="lab">{{ t('eventDetails') }} <span class="tiny muted">({{ t('optional') }})</span></label>
          <textarea v-model="form.descriptionEl" class="in" rows="4" :placeholder="t('eventDetailsPh')" />
        </div>
        <div>
          <label class="lab">{{ t('meetingTheme') }} <span class="tiny muted">({{ t('optional') }})</span></label>
          <input v-model="form.themeEl" class="in" :placeholder="t('meetingThemePh')">
          <div class="tiny muted" style="margin-top:4px">{{ t('meetingThemeNote') }}</div>
        </div>
        <EventAudience v-model="aud" :secs="secs || []" :groups="groups || []" :is-troop="isTroop" />
      </div>
      <div style="display:flex;flex-direction:column;gap:13px">
        <div style="display:flex;gap:8px">
          <div style="flex:1"><label class="lab">{{ t('starts') }}</label><input v-model="form.date" type="date" class="in"></div>
          <div style="flex:none;width:132px"><label class="lab">&nbsp;</label><input v-model="form.start" type="time" class="in"></div>
        </div>
        <div style="display:flex;gap:8px">
          <div style="flex:1"><label class="lab">{{ t('ends') }}</label><input v-model="form.endDate" type="date" class="in" :min="form.date" :placeholder="form.date"></div>
          <div style="flex:none;width:132px"><label class="lab">&nbsp;</label><input v-model="form.end" type="time" class="in"></div>
        </div>
        <div class="tiny muted" style="margin-top:-6px">{{ t('endDateNote') }}</div>
        <button class="srow" @click="form.remind = !form.remind">
          <div class="ico">🔔</div><div class="txt"><b>{{ t('remind1d') }}</b></div>
          <span class="sw" :class="{ off: !form.remind }" />
        </button>
        <button class="srow" @click="form.tracksAttendance = !form.tracksAttendance">
          <div class="ico">📋</div><div class="txt"><b>{{ t('tracksAttendance') }}</b></div>
          <span class="sw" :class="{ off: !form.tracksAttendance }" />
        </button>
        <button class="btn" :disabled="!form.titleEl || !audOk" @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </AppShell>
</template>
