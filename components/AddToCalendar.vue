<script setup lang="ts">
/* One event into the phone's calendar.

   An iPhone takes the .ics and offers "Add to Calendar". The link is signed
   (server/utils/icsLink.ts), because in the installed app iOS opens it in a
   browser sheet that does not carry the sign-in. Android's Google Calendar
   does not open .ics files at all, so there it is Google Calendar's own
   "new event" page, filled in. The other way stays underneath, small, for
   whoever uses something else. */
const props = defineProps<{
  event: { titleEl: string, location?: string | null, themeEl?: string | null, descriptionEl?: string | null,
    startsAt: string, endsAt?: string | null, isAllDay?: boolean | null, ics?: string }
  // just the 📅, for a page header
  icon?: boolean
}>()
const { t } = useI18n()

const android = ref(false)
const standalone = ref(false)
onMounted(() => {
  android.value = /Android/i.test(navigator.userAgent)
  standalone.value = matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
})

const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
const day = (iso: string, plus = 0) => new Date(Date.parse(iso) + plus * 86400_000)
  .toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' }).replace(/-/g, '')
const google = computed(() => {
  const e = props.event, end = e.endsAt || e.startsAt
  const dates = e.isAllDay ? `${day(e.startsAt)}/${day(end, 1)}` : `${utc(e.startsAt)}/${utc(end)}`
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.titleEl, dates })
  const details = [e.themeEl, e.descriptionEl].filter(Boolean).join('\n\n')
  if (details) q.set('details', details)
  if (e.location) q.set('location', e.location)
  return `https://calendar.google.com/calendar/render?${q}`
})
const ics = computed(() => props.event.ics || '')
const main = computed(() => android.value || !ics.value ? google.value : ics.value)
// out of the installed app: Google's page, and on iOS the sheet that can add it
const target = computed(() => android.value || standalone.value || !ics.value ? '_blank' : undefined)
</script>

<template>
  <a v-if="icon" class="iconbtn" :href="main" :target="target" rel="noopener" :aria-label="t('addToCalendar')" style="text-decoration:none">📅</a>
  <div v-else class="a2c">
    <a class="btn" :href="main" :target="target" rel="noopener" style="text-decoration:none">{{ t('addToCalendar') }}</a>
    <a v-if="ics" class="alt tiny muted" :href="android ? ics : google" target="_blank" rel="noopener">
      {{ android ? t('calendarFile') : 'Google Calendar' }}
    </a>
  </div>
</template>

<style scoped>
.a2c{display:flex; flex-direction:column; gap:6px}
.a2c .btn{text-align:center}
.alt{align-self:center; text-decoration:underline}
</style>
