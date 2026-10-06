import { currentSeason, type Season } from '~/utils/season'

/** The season the app is dressed for. A hidden test account can try one out
    of season with ?season=christmas|easter|summer (kept for the visit). */
export function useSeason() {
  const me = useMe()
  const route = useRoute()
  const preview = ref<Season | null>(null)
  onMounted(() => {
    try {
      // only a hidden test account keeps a preview; anyone else's is dropped
      if (!me.value?.isHidden) { sessionStorage.removeItem('season'); return }
      const q = String(route.query.season || '')
      if (['christmas', 'easter', 'summer'].includes(q)) sessionStorage.setItem('season', q)
      preview.value = (sessionStorage.getItem('season') as Season) || null
    } catch {}
  })
  return computed<Season | null>(() => preview.value || currentSeason())
}
